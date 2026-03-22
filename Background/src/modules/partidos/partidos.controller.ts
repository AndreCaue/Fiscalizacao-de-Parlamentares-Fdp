import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PartidosService } from './partidos.service';

@ApiTags('partidos')
@Controller('partidos')
export class PartidosController {
  constructor(private readonly partidosService: PartidosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os partidos' })
  findAll() {
    return this.partidosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca partido por ID' })
  findOne(@Param('id') id: string) {
    return this.partidosService.findOne(id);
  }

  @Get(':id/deputados')
  @ApiOperation({ summary: 'Lista deputados de um partido' })
  findDeputados(@Param('id') id: string) {
    return this.partidosService.findDeputados(id);
  }
}
