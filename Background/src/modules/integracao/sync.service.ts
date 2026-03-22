/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule'; // CronExpression
import { IntegracaoService } from './integracao.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private syncEmAndamento = false;

  constructor(private readonly integracaoService: IntegracaoService) {}

  // Roda todo dia às 6h da manhã (horário de Brasília = UTC-3, então 09:00 UTC)
  @Cron('0 9 * * *', {
    name: 'sync-votacoes-diario',
    timeZone: 'America/Sao_Paulo',
  })
  async syncDiarioVotacoes() {
    if (this.syncEmAndamento) {
      this.logger.warn('Sync já em andamento, pulando...');
      return;
    }

    this.logger.log('⏰ Iniciando sync diário de votações...');
    this.syncEmAndamento = true;

    try {
      // Busca apenas os últimos 3 dias
      const tresDiasAtras = new Date();
      tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
      const dataInicio = tresDiasAtras.toISOString().split('T')[0];

      await this.integracaoService.sincronizarVotacoes(dataInicio);
      this.logger.log('✅ Sync diário de votações concluído');
    } catch (error) {
      this.logger.error(`❌ Erro no sync diário: ${error.message}`);
    } finally {
      this.syncEmAndamento = false;
    }
  }

  // Roda todo domingo às 3h para sync completo semanal
  @Cron('0 3 * * 0', {
    name: 'sync-completo-semanal',
    timeZone: 'America/Sao_Paulo',
  })
  async syncSemaналCompleto() {
    if (this.syncEmAndamento) {
      this.logger.warn('Sync já em andamento, pulando sync semanal...');
      return;
    }

    this.logger.log('⏰ Iniciando sync semanal completo...');
    this.syncEmAndamento = true;

    try {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      await this.integracaoService.sincronizacaoCompleta(
        seteDiasAtras.toISOString().split('T')[0],
      );
      this.logger.log('✅ Sync semanal completo concluído');
    } catch (error) {
      this.logger.error(`❌ Erro no sync semanal: ${error.message}`);
    } finally {
      this.syncEmAndamento = false;
    }
  }

  isSyncEmAndamento() {
    return this.syncEmAndamento;
  }
}
