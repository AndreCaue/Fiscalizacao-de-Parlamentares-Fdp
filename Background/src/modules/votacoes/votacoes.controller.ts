import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VotacoesService } from './votacoes.service';

@ApiTags('votacoes')
@Controller('votacoes')
export class VotacoesController {
  constructor(private readonly votacoesService: VotacoesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista votações com filtros' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'tipo',
    required: false,
    description: 'Nominal ou Simbólica',
  })
  @ApiQuery({ name: 'dataInicio', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'dataFim', required: false, description: 'YYYY-MM-DD' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('tipo') tipo?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.votacoesService.findAll({
      page: +page,
      limit: +limit,
      tipo,
      dataInicio,
      dataFim,
    });
  }

  @Get('recentes')
  @ApiOperation({ summary: 'Lista as votações mais recentes' })
  findRecentes(@Query('limit') limit = '10') {
    return this.votacoesService.findRecentes(+limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes de uma votação' })
  findOne(@Param('id') id: string) {
    return this.votacoesService.findOne(id);
  }

  @Get(':id/votos')
  @ApiOperation({ summary: 'Lista todos os votos de uma votação' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'voto',
    required: false,
    description: 'SIM, NAO, ABSTENCAO, OBSTRUCAO',
  })
  findVotos(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '100',
    @Query('voto') voto?: string,
  ) {
    return this.votacoesService.findVotos(id, +page, +limit, voto);
  }

  @Get(':id/resumo')
  @ApiOperation({
    summary: 'Resumo dos votos de uma votação (contagem por tipo)',
  })
  findResumo(@Param('id') id: string) {
    return this.votacoesService.findResumo(id);
  }

  @Get(':id/grafo')
  @ApiOperation({ summary: 'Dados para visualização em grafo de uma votação' })
  findGrafo(@Param('id') id: string) {
    return this.votacoesService.findGrafo(id);
  }
}
