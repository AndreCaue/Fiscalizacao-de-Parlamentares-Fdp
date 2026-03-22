import { Module } from '@nestjs/common';
import { VotacoesController } from './votacoes.controller';
import { VotacoesService } from './votacoes.service';

@Module({
  controllers: [VotacoesController],
  providers: [VotacoesService],
  exports: [VotacoesService],
})
export class VotacoesModule {}
