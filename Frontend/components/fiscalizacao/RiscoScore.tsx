"use client";

import { cn } from "@/lib/utils";
import { ShieldAlert, ShieldCheck, ShieldQuestion, Siren } from "lucide-react";
import { useEffect, useRef } from "react";

type NivelRisco = "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO";

interface Props {
  score: number;
  nivel: NivelRisco;
  totalAlertas: number;
  anosAnalisados: number[];
}

const CONFIG: Record<
  NivelRisco,
  {
    cor: string;
    bg: string;
    borda: string;
    icon: React.ElementType;
    label: string;
  }
> = {
  BAIXO: {
    cor: "text-emerald-400",
    bg: "bg-emerald-950/40",
    borda: "border-emerald-800",
    icon: ShieldCheck,
    label: "Risco Baixo",
  },
  MÉDIO: {
    cor: "text-amber-400",
    bg: "bg-amber-950/40",
    borda: "border-amber-800",
    icon: ShieldQuestion,
    label: "Risco Médio",
  },
  ALTO: {
    cor: "text-orange-400",
    bg: "bg-orange-950/40",
    borda: "border-orange-700",
    icon: ShieldAlert,
    label: "Risco Alto",
  },
  CRÍTICO: {
    cor: "text-red-400",
    bg: "bg-red-950/40",
    borda: "border-red-600",
    icon: Siren,
    label: "Risco Crítico",
  },
};

export function RiscoScore({
  score,
  nivel,
  totalAlertas,
  anosAnalisados,
}: Props) {
  const c = CONFIG[nivel] ?? CONFIG["MÉDIO"];
  const Icon = c.icon;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2,
      cy = size / 2;
    const r = size * 0.38;
    let frame = 0;
    const totalFrames = 60;
    const targetAngle = (score / 100) * Math.PI * 1.6;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentAngle = targetAngle * eased;

      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.7, Math.PI * 2.3);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();

      if (currentAngle > 0) {
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        const colors: Record<NivelRisco, string[]> = {
          BAIXO: ["#10b981", "#34d399"],
          MÉDIO: ["#f59e0b", "#fbbf24"],
          ALTO: ["#f97316", "#fb923c"],
          CRÍTICO: ["#ef4444", "#f87171"],
        };
        const [c1, c2] = colors[nivel] ?? colors["MÉDIO"];
        gradient.addColorStop(0, c1);
        gradient.addColorStop(1, c2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI * 0.7, Math.PI * 0.7 + currentAngle);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      if (frame < totalFrames) {
        frame++;
        requestAnimationFrame(draw);
      }
    };
    draw();
  }, [score, nivel]);

  return (
    <div
      className={cn(
        "relative rounded-2xl border p-6 flex flex-col items-center gap-4",
        c.bg,
        c.borda,
      )}
    >
      <div className="relative w-32 h-32">
        <canvas
          ref={canvasRef}
          width={128}
          height={128}
          className="w-full h-full"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn("font-mono text-3xl font-bold leading-none", c.cor)}
          >
            {score.toFixed(0)}
          </span>
          <span className="text-zinc-500 text-xs font-mono mt-0.5">/ 100</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Icon className={cn("w-5 h-5", c.cor)} />
        <span
          className={cn("font-semibold text-sm tracking-wide uppercase", c.cor)}
        >
          {c.label}
        </span>
      </div>

      <div className="w-full border-t border-white/10 pt-4 grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">
            Alertas
          </p>
          <p className={cn("text-xl font-mono font-bold", c.cor)}>
            {totalAlertas}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">
            Anos
          </p>
          <p className="text-zinc-300 text-sm font-mono">
            {anosAnalisados.join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}
