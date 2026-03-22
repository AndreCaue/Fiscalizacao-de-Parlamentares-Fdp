import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VotosService } from './votos.service';

@ApiTags('votos')
@Controller('votos')
export class VotosController {
  constructor(private readonly votosService: VotosService) {}

  @Get('por-partido')
  @ApiOperation({ summary: 'Votos agrupados por partido em uma votação' })
  @ApiQuery({ name: 'votacaoId', required: true })
  findPorPartido(@Query('votacaoId') votacaoId: string) {
    return this.votosService.findPorPartido(votacaoId);
  }

  @Get('divergencia')
  @ApiOperation({
    summary: 'Deputados que votaram diferente da maioria do partido',
  })
  @ApiQuery({ name: 'votacaoId', required: true })
  findDivergentes(@Query('votacaoId') votacaoId: string) {
    return this.votosService.findDivergentes(votacaoId);
  }
}
