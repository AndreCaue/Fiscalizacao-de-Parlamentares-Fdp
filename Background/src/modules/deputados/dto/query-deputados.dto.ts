import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDeputadosDto {
  @ApiPropertyOptional({ description: 'Filtrar por sigla do partido (ex: PT, PL)' })
  @IsOptional()
  @IsString()
  partido?: string;

  @ApiPropertyOptional({ description: 'Filtrar por UF do estado (ex: SP, RJ)' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: 'Número da página', default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página', default: 50 })
  @IsOptional()
  @IsNumberString()
  limit?: number;
}
