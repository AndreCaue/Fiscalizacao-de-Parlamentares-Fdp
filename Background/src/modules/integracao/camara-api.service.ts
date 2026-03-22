/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface DeputadoCamara {
  id: number;
  nome: string;
  siglaPartido: string;
  siglaUf: string;
  idLegislatura: number;
  urlFoto: string;
  email: string;
  uri: string;
}

export interface PartidoCamara {
  id: number;
  sigla: string;
  nome: string;
  uri: string;
}

export interface VotacaoCamara {
  id: string;
  uri: string;
  data: string;
  dataHoraRegistro: string;
  descricao: string;
  aprovacao: number;
  siglaOrgao?: string;
  proposta?: {
    id: number;
    uri: string;
    siglaTipo: string;
    numero: string;
    ano: number;
  };
  tipoVotacao?: string;
}

export interface VotoCamara {
  deputado_: {
    id: number;
    nome: string;
    siglaPartido: string;
    siglaUf: string;
    uri: string;
    uriPartido: string;
    urlFoto: string;
  };
  tipoVoto: string;
}

export interface OrientacaoCamara {
  orientacaoVoto: string;
  codTipoLideranca: string; // "P" = partido, "B" = bloco
  siglaPartidoBloco: string;
  codPartidoBloco: number | null;
  uriPartidoBloco: string | null;
}

@Injectable()
export class CamaraApiService {
  private readonly logger = new Logger(CamaraApiService.name);
  private readonly BASE = 'https://dadosabertos.camara.leg.br/api/v2';

  constructor(private readonly http: HttpService) {}

  private async get<T>(
    path: string,
    params?: Record<string, any>,
  ): Promise<T[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ dados: T[] }>(`${this.BASE}${path}`, {
          params: { itens: 100, ...params },
        }),
      );
      return data.dados || [];
    } catch (error) {
      this.logger.error(`Erro ao buscar ${path}: ${error.message}`);
      return [];
    }
  }

  private async getPaginated<T>(
    path: string,
    params?: Record<string, any>,
    maxPages = 5,
  ): Promise<T[]> {
    const todos: T[] = [];

    for (let pagina = 1; pagina <= maxPages; pagina++) {
      try {
        const { data, headers } = await firstValueFrom(
          this.http.get<{ dados: T[] }>(`${this.BASE}${path}`, {
            params: { itens: 100, pagina, ...params },
          }),
        );

        const items = data.dados || [];
        todos.push(...items);

        const linkHeader = headers['link'] || '';
        if (!linkHeader.includes('rel="next"') || items.length === 0) break;
      } catch (error) {
        this.logger.error(`Erro página ${pagina} de ${path}: ${error.message}`);
        break;
      }
    }

    return todos;
  }

  async buscarDeputados(legislatura = 57): Promise<DeputadoCamara[]> {
    this.logger.log(`Buscando deputados da legislatura ${legislatura}...`);
    return this.getPaginated<DeputadoCamara>(
      '/deputados',
      {
        idLegislatura: legislatura,
        ordem: 'ASC',
        ordenarPor: 'nome',
      },
      10,
    );
  }

  async buscarPartidos(): Promise<PartidoCamara[]> {
    this.logger.log('Buscando partidos...');
    return this.getPaginated<PartidoCamara>(
      '/partidos',
      {
        ordem: 'ASC',
        ordenarPor: 'sigla',
      },
      3,
    );
  }

  async buscarVotacoes(
    dataInicio?: string,
    dataFim?: string,
    maxPages = 3,
  ): Promise<VotacaoCamara[]> {
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);

    const params: Record<string, any> = {
      dataInicio: dataInicio || trintaDiasAtras.toISOString().split('T')[0],
      dataFim: dataFim || hoje.toISOString().split('T')[0],
      ordem: 'DESC',
      ordenarPor: 'dataHoraRegistro',
    };

    this.logger.log(
      `Buscando votações de ${params.dataInicio} a ${params.dataFim}...`,
    );
    return this.getPaginated<VotacaoCamara>('/votacoes', params, maxPages);
  }

  async buscarVotosDeVotacao(votacaoId: string): Promise<VotoCamara[]> {
    this.logger.log(`Buscando votos da votação ${votacaoId}...`);
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ dados: VotoCamara[] }>(
          `${this.BASE}/votacoes/${votacaoId}/votos`,
        ),
      );
      return data.dados || [];
    } catch (error) {
      this.logger.error(
        `Erro ao buscar votos de ${votacaoId}: ${error.message}`,
      );
      return [];
    }
  }

  async buscarOrientacoesDeVotacao(
    votacaoId: string,
  ): Promise<OrientacaoCamara[]> {
    this.logger.log(`Buscando orientações da votação ${votacaoId}...`);
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ dados: OrientacaoCamara[] }>(
          `${this.BASE}/votacoes/${votacaoId}/orientacoes`,
        ),
      );
      return data.dados || [];
    } catch (error) {
      this.logger.error(
        `Erro ao buscar orientações de ${votacaoId}: ${error.message}`,
      );
      return [];
    }
  }

  normalizarVoto(tipoVoto: string): string {
    const mapa: Record<string, string> = {
      Sim: 'SIM',
      sim: 'SIM',
      SIM: 'SIM',
      Não: 'NAO',
      Nao: 'NAO',
      não: 'NAO',
      NAO: 'NAO',
      NÃO: 'NAO',
      Abstenção: 'ABSTENCAO',
      Abstencao: 'ABSTENCAO',
      abstenção: 'ABSTENCAO',
      ABSTENCAO: 'ABSTENCAO',
      Obstrução: 'OBSTRUCAO',
      Obstrucao: 'OBSTRUCAO',
      OBSTRUCAO: 'OBSTRUCAO',
    };
    return mapa[tipoVoto] || 'ABSTENCAO';
  }

  normalizarOrientacao(orientacaoVoto: string): string {
    const mapa: Record<string, string> = {
      Sim: 'SIM',
      Não: 'NAO',
      Abstenção: 'ABSTENCAO',
      Obstrução: 'OBSTRUCAO',
      Liberado: 'LIBERADO',
      '': 'AUSENTE',
    };
    return mapa[orientacaoVoto] ?? 'AUSENTE';
  }
}
