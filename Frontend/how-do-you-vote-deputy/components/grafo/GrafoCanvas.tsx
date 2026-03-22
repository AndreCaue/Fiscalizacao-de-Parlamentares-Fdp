"use client";

import { useEffect, useMemo } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import type { GrafoData, TipoVoto } from "@/types";
import { COR_VOTO, LABEL_VOTO } from "@/types";
import Image from "next/image";

// ─── Constantes de layout ──────────────────────────────────────────────────────
const PARTIDO_WIDTH = 100;
const PARTIDO_HEIGHT = 56;
const DEPUTADO_WIDTH = 56;
const DEPUTADO_HEIGHT = 56;
const GAP_X_DEPUTADO = 12; // espaço horizontal entre deputados
const GAP_Y = 120; // espaço vertical entre partido e deputados
const GAP_X_PARTIDO = 60; // espaço horizontal entre grupos de partidos

// ─── Node: Partido ─────────────────────────────────────────────────────────────
function PartidoNode({ data }: NodeProps) {
  return (
    <div
      style={{
        width: PARTIDO_WIDTH,
        height: PARTIDO_HEIGHT,
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        border: "2px solid #334155",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        cursor: "default",
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
      <span style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>
        {data.count} dep.
      </span>
    </div>
  );
}

// ─── Node: Deputado ────────────────────────────────────────────────────────────
function DeputadoNode({ data }: NodeProps) {
  const cor = data.cor || "#6b7280";
  const votoLabel = LABEL_VOTO[data.voto as TipoVoto];

  return (
    <div
      title={`${data.nomeCompleto}\n${data.partido} · Voto: ${votoLabel}`}
      style={{
        width: DEPUTADO_WIDTH,
        height: DEPUTADO_HEIGHT,
        borderRadius: "50%",
        border: `3px solid ${cor}`,
        background: "#0f172a",
        boxShadow: `0 0 10px ${cor}50`,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, top: -4 }}
      />
      {data.urlFoto ? (
        <Image
          src={data.urlFoto}
          alt={data.label}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          height={96}
          width={96}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            el.parentElement!.style.display = "flex";
            el.parentElement!.style.alignItems = "center";
            el.parentElement!.style.justifyContent = "center";
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
            fontSize: 16,
          }}
        >
          {data.label?.[0] ?? "?"}
        </div>
      )}
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  partido: PartidoNode,
  deputado: DeputadoNode,
};

// ─── Layout hierárquico top-down ───────────────────────────────────────────────
function calcularLayoutHierarquico(data: GrafoData | null): {
  nodes: Node[];
  edges: Edge[];
} {
  if (!data?.nodes || !data?.edges) return { nodes: [], edges: [] };

  const partidos = data.nodes.filter((n) => n.type === "partido");
  const deputados = data.nodes.filter((n) => n.type === "deputado");

  // Mapeia deputado → partido via edges
  const deputadoParaPartido = new Map<string, string>();
  data.edges.forEach((e) => {
    if (e.source.startsWith("partido-") && e.target.startsWith("deputado-")) {
      deputadoParaPartido.set(e.target, e.source);
    }
  });

  // Agrupa deputados por partido e ordena por voto (SIM → NÃO → ABSTENÇÃO → OBSTRUÇÃO)
  const ordemVoto: Record<string, number> = {
    SIM: 0,
    NAO: 1,
    ABSTENCAO: 2,
    OBSTRUCAO: 3,
  };
  const deputadosPorPartido = new Map<string, typeof deputados>();
  deputados.forEach((d) => {
    const pid = deputadoParaPartido.get(d.id) || "";
    if (!deputadosPorPartido.has(pid)) deputadosPorPartido.set(pid, []);
    deputadosPorPartido.get(pid)!.push(d);
  });

  // Ordena deputados dentro de cada partido por voto
  deputadosPorPartido.forEach((deps) => {
    deps.sort(
      (a, b) => (ordemVoto[a.data.voto] ?? 9) - (ordemVoto[b.data.voto] ?? 9),
    );
  });

  // Ordena partidos por quantidade de deputados (maior primeiro)
  const partidosOrdenados = [...partidos].sort((a, b) => {
    const depsA = deputadosPorPartido.get(a.id)?.length ?? 0;
    const depsB = deputadosPorPartido.get(b.id)?.length ?? 0;
    return depsB - depsA;
  });

  // Calcula largura de cada grupo (partido + seus deputados)
  const rfNodes: Node[] = [];
  const rfEdges: Edge[] = [];

  let xCursor = 0;

  for (const partido of partidosOrdenados) {
    const deps = deputadosPorPartido.get(partido.id) || [];
    const grupoLargura = Math.max(
      PARTIDO_WIDTH,
      deps.length * (DEPUTADO_WIDTH + GAP_X_DEPUTADO) - GAP_X_DEPUTADO,
    );

    // Centra o partido horizontalmente sobre os deputados
    const partidoX = xCursor + (grupoLargura - PARTIDO_WIDTH) / 2;
    const partidoY = 0;

    rfNodes.push({
      id: partido.id,
      type: "partido",
      position: { x: partidoX, y: partidoY },
      data: { ...partido.data, count: deps.length },
      draggable: true,
      zIndex: 10,
    });

    // Posiciona deputados na linha abaixo, centralizados
    const totalDepsLargura =
      deps.length * (DEPUTADO_WIDTH + GAP_X_DEPUTADO) - GAP_X_DEPUTADO;
    const depsStartX = xCursor + (grupoLargura - totalDepsLargura) / 2;

    deps.forEach((dep, i) => {
      const depX = depsStartX + i * (DEPUTADO_WIDTH + GAP_X_DEPUTADO);
      const depY = PARTIDO_HEIGHT + GAP_Y;

      rfNodes.push({
        id: dep.id,
        type: "deputado",
        position: { x: depX, y: depY },
        data: dep.data,
        draggable: true,
        zIndex: 5,
      });

      // Aresta partido → deputado com cor do voto
      rfEdges.push({
        id: `edge-${dep.id}`,
        source: partido.id,
        target: dep.id,
        style: {
          stroke: COR_VOTO[dep.data.voto as TipoVoto] || "#334155",
          strokeWidth: 1.5,
          opacity: 0.6,
        },
        animated: false,
      });
    });

    xCursor += grupoLargura + GAP_X_PARTIDO;
  }

  return { nodes: rfNodes, edges: rfEdges };
}

// ─── Legenda de votos ──────────────────────────────────────────────────────────
function Legenda() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 16,
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 8,
        padding: "10px 14px",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 2,
        }}
      >
        Legenda
      </span>
      {(Object.entries(LABEL_VOTO) as [TipoVoto, string][]).map(
        ([tipo, label]) => (
          <div
            key={tipo}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: COR_VOTO[tipo],
                boxShadow: `0 0 6px ${COR_VOTO[tipo]}80`,
              }}
            />
            <span style={{ color: "#94a3b8", fontSize: 11 }}>{label}</span>
          </div>
        ),
      )}
      <div
        style={{ borderTop: "1px solid #1e293b", marginTop: 4, paddingTop: 6 }}
      >
        <span style={{ color: "#475569", fontSize: 10 }}>
          Borda = voto do deputado
        </span>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function GrafoCanvas({ data }: { data: GrafoData | null }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => calcularLayoutHierarquico(data ?? null),
    [data],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    if (!data) return;
    const { nodes: n, edges: e } = calcularLayoutHierarquico(data);
    setNodes(n);
    setEdges(e);
  }, [data, setNodes, setEdges]);

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
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
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
          nodeColor={(node) => {
            if (node.type === "partido") return "#334155";
            return (node.data?.cor as string) || "#6b7280";
          }}
          maskColor="rgba(0,0,0,0.75)"
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
          }}
        />
      </ReactFlow>
      <Legenda />
    </div>
  );
}
