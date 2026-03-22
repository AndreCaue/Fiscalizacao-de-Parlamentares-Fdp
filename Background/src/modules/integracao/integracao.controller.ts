import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IntegracaoService } from './integracao.service';
import { SyncService } from './sync.service';

@ApiTags('integracao')
@Controller('integracao')
export class IntegracaoController {
  constructor(
    private readonly integracaoService: IntegracaoService,
    private readonly syncService: SyncService,
  ) {}

  @Post('sync/completo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispara sincronização completa manualmente' })
  @ApiQuery({
    name: 'dataInicio',
    required: false,
    description: 'YYYY-MM-DD (default: 30 dias atrás)',
  })
  async syncCompleto(@Query('dataInicio') dataInicio?: string) {
    if (this.syncService.isSyncEmAndamento()) {
      return {
        message:
          'Sincronização já em andamento. Tente novamente em alguns minutos.',
      };
    }
    return this.integracaoService.sincronizacaoCompleta(dataInicio);
  }

  @Post('sync/partidos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincroniza partidos com a API da Câmara' })
  async syncPartidos() {
    return this.integracaoService.sincronizarPartidos();
  }

  @Post('sync/deputados')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincroniza deputados com a API da Câmara' })
  async syncDeputados() {
    return this.integracaoService.sincronizarDeputados();
  }

  @Post('sync/votacoes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincroniza votações recentes' })
  @ApiQuery({ name: 'dataInicio', required: false })
  @ApiQuery({ name: 'dataFim', required: false })
  async syncVotacoes(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.integracaoService.sincronizarVotacoes(dataInicio, dataFim);
  }

  @Post('sync/votos/:votacaoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincroniza votos de uma votação específica' })
  async syncVotos(@Param('votacaoId') votacaoId: string) {
    return this.integracaoService.sincronizarVotos(votacaoId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Histórico de sincronizações' })
  @ApiQuery({ name: 'limit', required: false })
  async getLogs(@Query('limit') limit = '20') {
    return this.integracaoService.getLogs(+limit);
  }

  @Post('sync/orientacoes/:votacaoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincroniza orientações de bancada de uma votação' })
  async syncOrientacoes(@Param('votacaoId') votacaoId: string) {
    return this.integracaoService.sincronizarOrientacoes(votacaoId);
  }

  @Post('disciplina/:votacaoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalcula disciplina partidária de uma votação' })
  async recalcularDisciplina(@Param('votacaoId') votacaoId: string) {
    await this.integracaoService.calcularDisciplinaPartidaria(votacaoId);
    return { ok: true };
  }

  @Get('status')
  @ApiOperation({ summary: 'Status atual do sistema de sincronização' })
  getStatus() {
    return {
      syncEmAndamento: this.syncService.isSyncEmAndamento(),
      agendamentos: [
        {
          nome: 'sync-votacoes-diario',
          horario: 'Todo dia às 06:00 (Brasília)',
        },
        {
          nome: 'sync-completo-semanal',
          horario: 'Todo domingo às 03:00 (Brasília)',
        },
      ],
    };
  }
}
