import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { COR_VOTO } from '../votacoes/votacoes.service';

@Injectable()
export class VotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findPorPartido(votacaoId: string) {
    const votos = await this.prisma.voto.findMany({
      where: { votacaoId },
      include: {
        deputado: { include: { partido: true } },
      },
    });

    // Agrupa por partido
    const porPartido = new Map<
      string,
      {
        partido: { id: string; sigla: string; nome: string };
        votos: Record<string, number>;
        deputados: any[];
      }
    >();

    for (const voto of votos) {
      const p = voto.deputado.partido;
      if (!porPartido.has(p.id)) {
        porPartido.set(p.id, {
          partido: { id: p.id, sigla: p.sigla, nome: p.nome },
          votos: { SIM: 0, NAO: 0, ABSTENCAO: 0, OBSTRUCAO: 0 },
          deputados: [],
        });
      }
      const entry = porPartido.get(p.id)!;
      entry.votos[voto.voto] = (entry.votos[voto.voto] || 0) + 1;
      entry.deputados.push({
        id: voto.deputadoId,
        nome: voto.deputado.nome,
        voto: voto.voto,
        cor: COR_VOTO[voto.voto],
        urlFoto: voto.deputado.urlFoto,
      });
    }

    const resultado = Array.from(porPartido.values()).map((p) => ({
      ...p,
      votoMajoritario: Object.entries(p.votos).sort(
        ([, a], [, b]) => b - a,
      )[0]?.[0],
      totalDeputados: p.deputados.length,
    }));

    return {
      data: resultado.sort((a, b) => b.totalDeputados - a.totalDeputados),
    };
  }

  async findDivergentes(votacaoId: string) {
    const { data: porPartido } = await this.findPorPartido(votacaoId);

    const divergentes: any[] = [];

    for (const partido of porPartido) {
      const { votoMajoritario, deputados } = partido;
      if (!votoMajoritario) continue;

      const divergentesDoPartido = deputados.filter(
        (d) => d.voto !== votoMajoritario,
      );

      if (divergentesDoPartido.length > 0) {
        divergentes.push({
          partido: partido.partido,
          votoMajoritario,
          divergentes: divergentesDoPartido,
        });
      }
    }

    return { data: divergentes };
  }
}
