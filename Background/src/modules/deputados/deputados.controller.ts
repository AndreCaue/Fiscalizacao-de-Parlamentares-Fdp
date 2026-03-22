import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DeputadosService } from './deputados.service';
import { QueryDeputadosDto } from './dto/query-deputados.dto';

@ApiTags('deputados')
@Controller('deputados')
export class DeputadosController {
  constructor(private readonly deputadosService: DeputadosService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista todos os deputados' })
  @ApiResponse({ status: 200, description: 'Lista de deputados retornada com sucesso' })
  @ApiQuery({ name: 'partido', required: false, description: 'Filtrar por sigla do partido' })
  @ApiQuery({ name: 'estado', required: false, description: 'Filtrar por UF do estado' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (default: 50)' })
  findAll(@Query() query: QueryDeputadosDto) {
    return this.deputadosService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Busca um deputado por ID' })
  @ApiResponse({ status: 200, description: 'Deputado encontrado' })
  @ApiResponse({ status: 404, description: 'Deputado não encontrado' })
  findOne(@Param('id') id: string) {
    return this.deputadosService.findOne(id);
  }

  @Get(':id/votos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Histórico de votações de um deputado' })
  @ApiResponse({ status: 200, description: 'Histórico de votos retornado com sucesso' })
  findVotos(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.deputadosService.findVotos(id, +page, +limit);
  }

  @Get(':id/estatisticas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estatísticas de votação de um deputado' })
  findEstatisticas(@Param('id') id: string) {
    return this.deputadosService.findEstatisticas(id);
  }
}
