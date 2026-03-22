import { Module } from '@nestjs/common';
import { DeputadosController } from './deputados.controller';
import { DeputadosService } from './deputados.service';

@Module({
  controllers: [DeputadosController],
  providers: [DeputadosService],
  exports: [DeputadosService],
})
export class DeputadosModule {}
