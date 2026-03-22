import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegracaoController } from './integracao.controller';
import { IntegracaoService } from './integracao.service';
import { CamaraApiService } from './camara-api.service';
import { SyncService } from './sync.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL:
        process.env.CAMARA_API_BASE_URL ||
        'https://dadosabertos.camara.leg.br/api/v2',
      timeout: 30000,
      headers: {
        Accept: 'application/json',
      },
    }),
  ],
  controllers: [IntegracaoController],
  providers: [IntegracaoService, CamaraApiService, SyncService],
  exports: [IntegracaoService, CamaraApiService],
})
export class IntegracaoModule {}
