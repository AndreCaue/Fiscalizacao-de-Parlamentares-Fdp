import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from './prisma/prisma.module';
import { DeputadosModule } from './modules/deputados/deputados.module';
import { PartidosModule } from './modules/partidos/partidos.module';
import { VotacoesModule } from './modules/votacoes/votacoes.module';
import { VotosModule } from './modules/votos/votos.module';
import { IntegracaoModule } from './modules/integracao/integracao.module';

@Module({
  imports: [
    // Config global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // HTTP client
    HttpModule,

    // Banco de dados
    PrismaModule,

    // Módulos da aplicação
    DeputadosModule,
    PartidosModule,
    VotacoesModule,
    VotosModule,
    IntegracaoModule,
  ],
})
export class AppModule {}
