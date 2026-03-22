/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface FindAllParams {
  page: number;
  limit: number;
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
}

export const COR_VOTO: Record<string, string> = {
  SIM: '#22c55e',
  NAO: '#ef4444',
  ABSTENCAO: '#3b82f6',
  OBSTRUCAO: '#f59e0b',
};

@Injectable()
export class VotacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ page, limit, tipo, dataInicio, dataFim }: FindAllParams) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (tipo) where.tipo = { contains: tipo };
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) where.data.gte = new Date(dataInicio);
      if (dataFim) where.data.lte = new Date(dataFim);
    }

    const [votacoes, total] = await Promise.all([
      this.prisma.votacao.findMany({
        where,
        orderBy: { data: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { votos: true } },
        },
      }),
      this.prisma.votacao.count({ where }),
    ]);

    return {
      data: votacoes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findRecentes(limit: number) {
    const votacoes = await this.prisma.votacao.findMany({
      orderBy: { data: 'desc' },
      take: limit,
      include: {
        _count: { select: { votos: true } },
      },
    });
    return { data: votacoes };
  }

  async findOne(id: string) {
    const votacao = await this.prisma.votacao.findUnique({
      where: { id },
      include: {
        _count: { select: { votos: true } },
        orientacoes: {
          orderBy: { tipoLideranca: 'asc' },
        },
      },
    });
    if (!votacao) throw new NotFoundException(`Votação ${id} não encontrada`);
    return {
      ...votacao,
      orientacoes: votacao.orientacoes.map((o) => ({
        ...o,
        cor:
          COR_VOTO[o.orientacao as keyof typeof COR_VOTO] ||
          (o.orientacao === 'LIBERADO' ? '#9ca3af' : '#4b5563'),
      })),
    };
  }

  async findVotos(id: string, page: number, limit: number, voto?: string) {
    await this.findOne(id);
    const skip = (page - 1) * limit;
    const where: any = { votacaoId: id };
    if (voto) where.voto = voto.toUpperCase();

    const [votos, total] = await Promise.all([
      this.prisma.voto.findMany({
        where,
        include: {
          deputado: { include: { partido: true } },
        },
        orderBy: { deputado: { nome: 'asc' } },
        skip,
        take: limit,
      }),
      this.prisma.voto.count({ where }),
    ]);

    return {
      data: votos.map((v) => ({
        ...v,
        cor: COR_VOTO[v.voto] || '#6b7280',
        seguiuOrientacao: v.seguiuOrientacao,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findResumo(id: string) {
    await this.findOne(id);

    const grupos = await this.prisma.voto.groupBy({
      by: ['voto'],
      where: { votacaoId: id },
      _count: { voto: true },
    });

    const total = grupos.reduce((acc, g) => acc + g._count.voto, 0);

    return {
      votacaoId: id,
      total,
      resultado: grupos.map((g) => ({
        tipo: g.voto,
        quantidade: g._count.voto,
        percentual: total > 0 ? +((g._count.voto / total) * 100).toFixed(1) : 0,
        cor: COR_VOTO[g.voto] || '#6b7280',
      })),
    };
  }

  async findGrafo(id: string) {
    await this.findOne(id);

    const votos = await this.prisma.voto.findMany({
      where: { votacaoId: id },
      include: {
        deputado: { include: { partido: true } },
      },
    });

    // Nós: partidos únicos
    const partidosMap = new Map<
      string,
      { id: string; sigla: string; nome: string; count: number }
    >();
    votos.forEach((v) => {
      const p = v.deputado.partido;
      if (!partidosMap.has(p.id)) {
        partidosMap.set(p.id, {
          id: p.id,
          sigla: p.sigla,
          nome: p.nome,
          count: 0,
        });
      }
      partidosMap.get(p.id)!.count++;
    });

    // Nós React Flow: partidos + deputados
    const nodes = [
      // Partidos como nós maiores
      ...Array.from(partidosMap.values()).map((p) => ({
        id: `partido-${p.id}`,
        type: 'partido',
        data: { label: p.sigla, nome: p.nome, count: p.count },
        position: { x: 0, y: 0 },
      })),
      // Deputados como nós menores
      ...votos.map((v) => ({
        id: `deputado-${v.deputadoId}`,
        type: 'deputado',
        data: {
          label: v.deputado.nome.split(' ')[0],
          nomeCompleto: v.deputado.nome,
          urlFoto: v.deputado.urlFoto,
          partido: v.deputado.partido.sigla,
          voto: v.voto,
          cor: COR_VOTO[v.voto] || '#6b7280',
        },
        position: { x: 0, y: 0 },
      })),
    ];

    // Arestas: partido → deputado
    const edges = votos.map((v) => ({
      id: `edge-${v.deputadoId}`,
      source: `partido-${v.deputado.partidoId}`,
      target: `deputado-${v.deputadoId}`,
      style: { stroke: COR_VOTO[v.voto] || '#6b7280', opacity: 0.6 },
    }));

    return { nodes, edges, total: votos.length };
  }
}
