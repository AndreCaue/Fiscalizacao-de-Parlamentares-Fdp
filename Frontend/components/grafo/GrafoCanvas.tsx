"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  Handle,
  Position,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import type { GrafoData, TipoVoto } from "@/types";
import { COR_VOTO, LABEL_VOTO } from "@/types";
import Image from "next/image";

const PARTIDO_W = 110;
const PARTIDO_H = 64;
const DEP_SIZE = 52;
const GAP_X_DEP = 10;
const GAP_Y = 100;
const GAP_X_PARTIDO = 48;

const ORDEM_VOTO: Record<string, number> = {
  SIM: 0,
  NAO: 1,
  ABSTENCAO: 2,
  OBSTRUCAO: 3,
};

interface TooltipData {
  x: number;
  y: number;
  nome: string;
  partido: string;
  estado: string;
  voto: string;
  seguiuOrientacao: boolean | null;
  urlFoto?: string;
}

function PartidoNode({ data }: NodeProps) {
  const orientacaoCor = data.corOrientacao as string | undefined;

  return (
    <div
      style={{
        width: PARTIDO_W,
        height: PARTIDO_H,
        borderRadius: 14,
        background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
        border: `2px solid ${orientacaoCor ?? "#334155"}`,
        boxShadow: orientacaoCor
          ? `0 0 14px ${orientacaoCor}40, 0 4px 20px rgba(0,0,0,0.5)`
          : "0 4px 20px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        cursor: "default",
        userSelect: "none",
      }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, bottom: -4 }}
      />

      <span
        style={{
          color: "#f1f5f9",
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: 1,
        }}
      >
        {data.label}
      </span>

      <span style={{ color: "#64748b", fontSize: 10 }}>{data.count} dep.</span>

      {data.orientacao && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: orientacaoCor ?? "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginTop: 1,
          }}
        >
          {data.orientacao as string}
        </span>
      )}
    </div>
  );
}

function DeputadoNode({ data }: NodeProps) {
  const cor = (data.cor as string) || "#6b7280";
  const seguiu = data.seguiuOrientacao as boolean | null;

  const borderStyle =
    seguiu === false ? `3px dashed ${cor}` : `3px solid ${cor}`;

  return (
    <div
      onMouseEnter={() => data.onHover?.(data)}
      onMouseLeave={() => data.onHover?.(null)}
      style={{
        width: DEP_SIZE,
        height: DEP_SIZE,
        borderRadius: "50%",
        border: borderStyle,
        background: "#0f172a",
        boxShadow: `0 0 10px ${cor}55`,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.15s",
        position: "relative",
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 0 18px ${cor}90`;
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1.12)";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 0 10px ${cor}55`;
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, top: -4 }}
      />

      {data.urlFoto ? (
        <Image
          src={data.urlFoto as string}
          alt={data.label as string}
          width={DEP_SIZE}
          height={DEP_SIZE}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {(data.label as string)?.[0] ?? "?"}
        </div>
      )}
    </div>
  );
}

const NODE_TYPES: NodeTypes = { partido: PartidoNode, deputado: DeputadoNode };

function buildLayout(
  data: GrafoData | null,
  onHover: (d: TooltipData | null) => void,
): { nodes: Node[]; edges: Edge[] } {
  if (!data?.nodes?.length) return { nodes: [], edges: [] };

  const partidos = data.nodes?.filter((n) => n.type === "partido");
  const deputados = data.nodes?.filter((n) => n.type === "deputado");

  const depParaPartido = new Map<string, string>();
  data.edges.forEach((e) => {
    if (e.source.startsWith("partido-") && e.target.startsWith("deputado-")) {
      depParaPartido.set(e.target, e.source);
    }
  });

  const depsPorPartido = new Map<string, typeof deputados>();
  deputados.forEach((d) => {
    const pid = depParaPartido.get(d.id) ?? "";
    if (!depsPorPartido.has(pid)) depsPorPartido.set(pid, []);
    depsPorPartido.get(pid)!.push(d);
  });
  depsPorPartido.forEach((deps) =>
    deps.sort((a, b) => {
      const votoA = a?.data?.voto ?? "";
      const votoB = b?.data?.voto ?? "";
      return (ORDEM_VOTO[votoA] ?? 9) - (ORDEM_VOTO[votoB] ?? 9);
    }),
  );

  const partidosOrdenados = [...partidos].sort(
    (a, b) =>
      (depsPorPartido.get(b.id)?.length ?? 0) -
      (depsPorPartido.get(a.id)?.length ?? 0),
  );

  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];
  let xCursor = 0;

  for (const partido of partidosOrdenados) {
    const deps = depsPorPartido.get(partido.id) ?? [];
    const grupoW = Math.max(
      PARTIDO_W,
      deps.length * (DEP_SIZE + GAP_X_DEP) - GAP_X_DEP,
    );

    rfNodes.push({
      id: partido.id,
      type: "partido",
      position: {
        x: xCursor + (grupoW - PARTIDO_W) / 2,
        y: 0,
      },
      data: { ...partido.data, count: deps.length },
      draggable: true,
      zIndex: 10,
    });

    const totalDepsW = deps.length * (DEP_SIZE + GAP_X_DEP) - GAP_X_DEP;
    const depsStartX = xCursor + (grupoW - totalDepsW) / 2;

    deps.forEach((dep, i) => {
      rfNodes.push({
        id: dep.id,
        type: "deputado",
        position: {
          x: depsStartX + i * (DEP_SIZE + GAP_X_DEP),
          y: PARTIDO_H + GAP_Y,
        },
        data: {
          ...dep.data,
          onHover: (d: typeof dep.data | null) => {
            if (!d) {
              onHover(null);
              return;
            }
            onHover({
              x: 0,
              y: 0,
              nome: d.nomeCompleto ?? d.label,
              partido: d.partido || "Não encontrado",
              estado: d.estado || "Não encontrado",
              voto: d.voto || "Não encontrado",
              seguiuOrientacao: d.seguiuOrientacao ?? null,
              urlFoto: d.urlFoto,
            });
          },
        },
        draggable: true,
        zIndex: 5,
      });

      const cor = COR_VOTO[dep.data.voto as TipoVoto] ?? "#334155";
      rfEdges.push({
        id: `e-${dep.id}`,
        source: partido.id,
        target: dep.id,
        style: { stroke: cor, strokeWidth: 1.5, opacity: 0.55 },
        animated: false,
      });
    });

    xCursor += grupoW + GAP_X_PARTIDO;
  }

  return { nodes: rfNodes, edges: rfEdges };
}

function DeputadoTooltip({ data }: { data: TooltipData }) {
  const cor = COR_VOTO[data.voto as TipoVoto] ?? "#6b7280";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 200,
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: "12px 16px",
        minWidth: 210,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        display: "flex",
        gap: 12,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `2px solid ${cor}`,
          overflow: "hidden",
          flexShrink: 0,
          background: "#1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {data.urlFoto ? (
          <Image
            src={data.urlFoto}
            alt={data.nome}
            width={44}
            height={44}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>
            {data.nome[0]}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span
          style={{
            color: "#f1f5f9",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          {data.nome}
        </span>
        <span style={{ color: "#64748b", fontSize: 11 }}>
          {data.partido} · {data.estado}
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 2,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: `${cor}22`,
              border: `1px solid ${cor}55`,
              color: cor,
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: cor,
                display: "inline-block",
              }}
            />
            {LABEL_VOTO[data.voto as TipoVoto] ?? data.voto}
          </span>
          {data.seguiuOrientacao === false && (
            <span style={{ color: "#f59e0b", fontSize: 10 }}>⚡ Divergiu</span>
          )}
          {data.seguiuOrientacao === true && (
            <span style={{ color: "#22c55e", fontSize: 10 }}>✓ Seguiu</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsPanel({ data }: { data: GrafoData }) {
  const partidos = data?.nodes?.filter((n) => n.type === "partido").length;
  const total = data?.nodes?.filter((n) => n.type === "deputado").length;

  const contagem = data.nodes
    ?.filter((n) => n.type === "deputado")
    .reduce<Record<string, number>>((acc, n) => {
      const v = n.data.voto as string;
      acc[v] = (acc[v] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 200,
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: "10px 14px",
        minWidth: 180,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          color: "#475569",
          fontSize: 9,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        Resultado
      </div>

      {(Object.entries(LABEL_VOTO) as [TipoVoto, string][]).map(
        ([tipo, label]) => {
          const qtd = contagem?.[tipo] ?? 0;
          const pct = total > 0 ? Math.round((qtd / total) * 100) : 0;
          if (qtd === 0) return null;
          const cor = COR_VOTO[tipo];
          return (
            <div key={tipo} style={{ marginBottom: 7 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{label}</span>
                <span style={{ color: cor, fontSize: 11, fontWeight: 700 }}>
                  {qtd} ({pct}%)
                </span>
              </div>
              <div
                style={{ height: 3, borderRadius: 999, background: "#1e293b" }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    borderRadius: 999,
                    background: cor,
                    boxShadow: `0 0 4px ${cor}80`,
                  }}
                />
              </div>
            </div>
          );
        },
      )}

      <div
        style={{
          borderTop: "1px solid #1e293b",
          marginTop: 8,
          paddingTop: 8,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: "#475569", fontSize: 10 }}>
          {partidos} partidos
        </span>
        <span style={{ color: "#475569", fontSize: 10 }}>{total} votos</span>
      </div>
    </div>
  );
}

function Legenda() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 12,
        zIndex: 200,
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          color: "#475569",
          fontSize: 9,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 7,
        }}
      >
        Legenda
      </div>
      {(Object.entries(LABEL_VOTO) as [TipoVoto, string][]).map(
        ([tipo, label]) => (
          <div
            key={tipo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: COR_VOTO[tipo],
                boxShadow: `0 0 5px ${COR_VOTO[tipo]}80`,
              }}
            />
            <span style={{ color: "#94a3b8", fontSize: 11 }}>{label}</span>
          </div>
        ),
      )}
      <div
        style={{ borderTop: "1px solid #1e293b", marginTop: 6, paddingTop: 6 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
          }}
        >
          <div
            style={{
              width: 20,
              height: 0,
              borderTop: "2px dashed #94a3b8",
              opacity: 0.5,
            }}
          />
          <span style={{ color: "#475569", fontSize: 10 }}>
            Divergiu do partido
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{ width: 20, height: 0, borderTop: "2px solid #334155" }}
          />
          <span style={{ color: "#475569", fontSize: 10 }}>Borda = voto</span>
        </div>
      </div>
    </div>
  );
}

function GrafoCanvasInner({ data }: { data: GrafoData | null }) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const { fitView } = useReactFlow();

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildLayout(data ?? null, setTooltip),
    [data],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  useEffect(() => {
    if (!data) return;
    const { nodes: n, edges: e } = buildLayout(data, setTooltip);
    setNodes(n);
    setEdges(e);
    setTimeout(() => fitView({ padding: 0.1, maxZoom: 1, duration: 600 }), 50);
  }, [data, setNodes, setEdges, fitView]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
        minZoom={0.02}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        onPaneClick={() => setTooltip(null)}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="#1e293b"
        />
        <Controls
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={(n) =>
            n.type === "partido"
              ? "#334155"
              : ((n.data?.cor as string) ?? "#6b7280")
          }
          maskColor="rgba(0,0,0,0.75)"
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
          }}
        />
      </ReactFlow>

      <Legenda />
      {data && <StatsPanel data={data} />}
      {tooltip && <DeputadoTooltip data={tooltip} />}
    </div>
  );
}

export default function GrafoCanvas({ data }: { data: GrafoData | null }) {
  return (
    <ReactFlowProvider>
      <GrafoCanvasInner data={data} />
    </ReactFlowProvider>
  );
}
