import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryDeputadosDto } from './dto/query-deputados.dto';

@Injectable()
export class DeputadosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryDeputadosDto) {
    const { partido, estado, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (estado) where.estado = estado.toUpperCase();
    if (partido) {
      where.partido = { sigla: partido.toUpperCase() };
    }

    const [deputados, total] = await Promise.all([
      this.prisma.deputado.findMany({
        where,
        include: { partido: true },
        orderBy: { nome: 'asc' },
        skip,
        take: +limit,
      }),
      this.prisma.deputado.count({ where }),
    ]);

    return {
      data: deputados,
      meta: {
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const deputado = await this.prisma.deputado.findUnique({
      where: { id },
      include: {
        partido: true,
        liderancas: true,
        _count: { select: { votos: true } },
      },
    });

    if (!deputado) {
      throw new NotFoundException(`Deputado ${id} não encontrado`);
    }

    return deputado;
  }

  async findVotos(id: string, page = 1, limit = 20) {
    await this.findOne(id); // valida existência

    const skip = (page - 1) * limit;

    const [votos, total] = await Promise.all([
      this.prisma.voto.findMany({
        where: { deputadoId: id },
        include: {
          votacao: true,
        },
        orderBy: { votacao: { data: 'desc' } },
        skip,
        take: limit,
      }),
      this.prisma.voto.count({ where: { deputadoId: id } }),
    ]);

    return {
      data: votos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findEstatisticas(id: string) {
    await this.findOne(id); // valida existência

    const votos = await this.prisma.voto.groupBy({
      by: ['voto'],
      where: { deputadoId: id },
      _count: { voto: true },
    });

    const total = votos.reduce((acc, v) => acc + v._count.voto, 0);

    return {
      total,
      porTipo: votos.reduce(
        (acc, v) => {
          acc[v.voto] = v._count.voto;
          return acc;
        },
        {} as Record<string, number>,
      ),
      percentuais: votos.reduce(
        (acc, v) => {
          acc[v.voto] = total > 0 ? ((v._count.voto / total) * 100).toFixed(1) : '0';
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }
}
