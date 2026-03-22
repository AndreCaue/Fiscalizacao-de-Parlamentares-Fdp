import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PartidosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const partidos = await this.prisma.partido.findMany({
      orderBy: { sigla: 'asc' },
      include: {
        _count: { select: { deputados: true } },
      },
    });
    return { data: partidos };
  }

  async findOne(id: string) {
    const partido = await this.prisma.partido.findUnique({
      where: { id },
      include: {
        _count: { select: { deputados: true } },
      },
    });
    if (!partido) throw new NotFoundException(`Partido ${id} não encontrado`);
    return partido;
  }

  async findDeputados(id: string) {
    await this.findOne(id);
    const deputados = await this.prisma.deputado.findMany({
      where: { partidoId: id },
      orderBy: { nome: 'asc' },
    });
    return { data: deputados };
  }
}
