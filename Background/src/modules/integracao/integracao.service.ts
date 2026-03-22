/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CamaraApiService } from './camara-api.service';

@Injectable()
export class IntegracaoService {
  private readonly logger = new Logger(IntegracaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly camaraApi: CamaraApiService,
  ) {}

  // ─── Partidos ──────────────────────────────────────────────────────────────

  async sincronizarPartidos(): Promise<{
    sincronizados: number;
    erros: number;
  }> {
    const log = await this.criarLog('partidos');
    let sincronizados = 0;
    let erros = 0;

    try {
      const partidos = await this.camaraApi.buscarPartidos();
      this.logger.log(`${partidos.length} partidos encontrados na API`);

      for (const partido of partidos) {
        try {
          await this.prisma.partido.upsert({
            where: { id: String(partido.id) },
            create: {
              id: String(partido.id),
              nome: partido.nome,
              sigla: partido.sigla,
            },
            update: {
              nome: partido.nome,
              sigla: partido.sigla,
            },
          });
          sincronizados++;
        } catch (e) {
          this.logger.error(
            `Erro ao salvar partido ${partido.sigla}: ${e.message}`,
          );
          erros++;
        }
      }

      await this.atualizarLog(log.id, 'success', sincronizados);
      return { sincronizados, erros };
    } catch (error) {
      await this.atualizarLog(log.id, 'error', 0, error.message);
      throw error;
    }
  }

  // ─── Deputados ─────────────────────────────────────────────────────────────

  async sincronizarDeputados(): Promise<{
    sincronizados: number;
    erros: number;
  }> {
    const log = await this.criarLog('deputados');
    let sincronizados = 0;
    let erros = 0;

    try {
      // Garante que partidos existem primeiro
      const totalPartidos = await this.prisma.partido.count();
      if (totalPartidos === 0) {
        this.logger.log(
          'Nenhum partido encontrado — sincronizando partidos primeiro...',
        );
        await this.sincronizarPartidos();
      }

      const deputados = await this.camaraApi.buscarDeputados();
      this.logger.log(`${deputados.length} deputados encontrados na API`);

      for (const dep of deputados) {
        try {
          // Busca ou cria partido pelo sigla
          let partido = await this.prisma.partido.findFirst({
            where: { sigla: dep.siglaPartido },
          });

          if (!partido) {
            // Cria partido placeholder se não existir
            partido = await this.prisma.partido.upsert({
              where: { sigla: dep.siglaPartido },
              create: {
                id: `sigla-${dep.siglaPartido}`,
                nome: dep.siglaPartido,
                sigla: dep.siglaPartido,
              },
              update: {},
            });
          }

          await this.prisma.deputado.upsert({
            where: { id: String(dep.id) },
            create: {
              id: String(dep.id),
              nome: dep.nome,
              estado: dep.siglaUf,
              urlFoto: dep.urlFoto,
              email: dep.email,
              partidoId: partido.id,
            },
            update: {
              nome: dep.nome,
              estado: dep.siglaUf,
              urlFoto: dep.urlFoto,
              email: dep.email,
              partidoId: partido.id,
            },
          });
          sincronizados++;
        } catch (e) {
          this.logger.error(
            `Erro ao salvar deputado ${dep.nome}: ${e.message}`,
          );
          erros++;
        }
      }

      await this.atualizarLog(log.id, 'success', sincronizados);
      return { sincronizados, erros };
    } catch (error) {
      await this.atualizarLog(log.id, 'error', 0, error.message);
      throw error;
    }
  }

  // ─── Votações ──────────────────────────────────────────────────────────────

  async sincronizarVotacoes(
    dataInicio?: string,
    dataFim?: string,
  ): Promise<{ sincronizados: number; erros: number }> {
    const log = await this.criarLog('votacoes');
    let sincronizados = 0;
    let erros = 0;

    try {
      const votacoes = await this.camaraApi.buscarVotacoes(dataInicio, dataFim);
      this.logger.log(`${votacoes.length} votações encontradas na API`);

      // Salva todas as votações — a API não retorna tipoVotacao na listagem
      // O tipo é descoberto ao buscar os votos individuais de cada votação
      for (const votacao of votacoes) {
        try {
          await this.prisma.votacao.upsert({
            where: { id: String(votacao.id) },
            create: {
              id: String(votacao.id),
              descricao: votacao.descricao || `Votação ${votacao.id}`,
              data: new Date((votacao as any).dataHoraRegistro || votacao.data),
              tipo: (votacao as any).tipoVotacao || 'Nominal',
              siglaTipo:
                (votacao as any).siglaOrgao || votacao.proposta?.siglaTipo,
              uri: votacao.uri,
            },
            update: {
              descricao: votacao.descricao || `Votação ${votacao.id}`,
              data: new Date((votacao as any).dataHoraRegistro || votacao.data),
            },
          });
          sincronizados++;
        } catch (e) {
          this.logger.error(
            `Erro ao salvar votação ${votacao.id}: ${e.message}`,
          );
          erros++;
        }
      }

      await this.atualizarLog(log.id, 'success', sincronizados);
      return { sincronizados, erros };
    } catch (error) {
      await this.atualizarLog(log.id, 'error', 0, error.message);
      throw error;
    }
  }

  // ─── Votos de uma votação ──────────────────────────────────────────────────

  async sincronizarVotos(
    votacaoId: string,
  ): Promise<{ sincronizados: number; erros: number }> {
    const log = await this.criarLog('votos');
    let sincronizados = 0;
    let erros = 0;

    try {
      const votosApi = await this.camaraApi.buscarVotosDeVotacao(votacaoId);
      this.logger.log(
        `${votosApi.length} votos encontrados para votação ${votacaoId}`,
      );

      for (const votoApi of votosApi) {
        const dep = votoApi.deputado_;
        if (!dep?.id) continue;

        try {
          // Garante que o deputado existe
          let partido = await this.prisma.partido.findFirst({
            where: { sigla: dep.siglaPartido },
          });

          if (!partido) {
            partido = await this.prisma.partido.upsert({
              where: { sigla: dep.siglaPartido },
              create: {
                id: `sigla-${dep.siglaPartido}`,
                nome: dep.siglaPartido,
                sigla: dep.siglaPartido,
              },
              update: {},
            });
          }

          await this.prisma.deputado.upsert({
            where: { id: String(dep.id) },
            create: {
              id: String(dep.id),
              nome: dep.nome,
              estado: dep.siglaUf,
              urlFoto: dep.urlFoto,
              partidoId: partido.id,
            },
            update: {
              nome: dep.nome,
              urlFoto: dep.urlFoto,
              partidoId: partido.id,
            },
          });

          // Upsert do voto (seguiuOrientacao calculado depois)
          await this.prisma.voto.upsert({
            where: {
              deputadoId_votacaoId: {
                deputadoId: String(dep.id),
                votacaoId,
              },
            },
            create: {
              deputadoId: String(dep.id),
              votacaoId,
              voto: this.camaraApi.normalizarVoto(votoApi.tipoVoto),
            },
            update: {
              voto: this.camaraApi.normalizarVoto(votoApi.tipoVoto),
            },
          });

          sincronizados++;
        } catch (e) {
          this.logger.error(`Erro ao salvar voto de ${dep.nome}: ${e.message}`);
          erros++;
        }
      }

      await this.atualizarLog(log.id, 'success', sincronizados);

      // Após salvar votos, sincroniza orientações e recalcula disciplina
      await this.sincronizarOrientacoes(votacaoId);
      await this.calcularDisciplinaPartidaria(votacaoId);

      return { sincronizados, erros };
    } catch (error) {
      await this.atualizarLog(log.id, 'error', 0, error.message);
      throw error;
    }
  }

  // ─── Orientações de bancada ─────────────────────────────────────────────────

  async sincronizarOrientacoes(
    votacaoId: string,
  ): Promise<{ sincronizados: number }> {
    try {
      const orientacoesApi =
        await this.camaraApi.buscarOrientacoesDeVotacao(votacaoId);
      if (!orientacoesApi.length) return { sincronizados: 0 };

      let sincronizados = 0;
      for (const o of orientacoesApi) {
        try {
          await this.prisma.orientacaoBancada.upsert({
            where: {
              votacaoId_siglaPartidoBloco: {
                votacaoId,
                siglaPartidoBloco: o.siglaPartidoBloco,
              },
            },
            create: {
              votacaoId,
              siglaPartidoBloco: o.siglaPartidoBloco,
              codPartidoBloco: o.codPartidoBloco,
              tipoLideranca: o.codTipoLideranca,
              orientacao: this.camaraApi.normalizarOrientacao(o.orientacaoVoto),
            },
            update: {
              orientacao: this.camaraApi.normalizarOrientacao(o.orientacaoVoto),
              tipoLideranca: o.codTipoLideranca,
            },
          });
          sincronizados++;
        } catch (e) {
          this.logger.error(
            `Erro ao salvar orientação ${o.siglaPartidoBloco}: ${e.message}`,
          );
        }
      }

      this.logger.log(
        `${sincronizados} orientações salvas para votação ${votacaoId}`,
      );
      return { sincronizados };
    } catch (error) {
      this.logger.error(
        `Erro ao sincronizar orientações de ${votacaoId}: ${error.message}`,
      );
      return { sincronizados: 0 };
    }
  }

  // ─── Disciplina partidária ──────────────────────────────────────────────────
  // Calcula se cada deputado seguiu a orientação do seu partido nessa votação

  async calcularDisciplinaPartidaria(votacaoId: string): Promise<void> {
    try {
      // Busca todas as orientações de partido (não blocos) para essa votação
      const orientacoes = await this.prisma.orientacaoBancada.findMany({
        where: {
          votacaoId,
          tipoLideranca: 'P', // só partidos, não blocos
        },
      });

      if (!orientacoes.length) return;

      // Monta mapa: siglaPartido → orientacao
      const mapaOrientacao = new Map<string, string>();
      for (const o of orientacoes) {
        mapaOrientacao.set(o.siglaPartidoBloco, o.orientacao);
      }

      // Busca todos os votos dessa votação com o partido do deputado
      const votos = await this.prisma.voto.findMany({
        where: { votacaoId },
        include: {
          deputado: { include: { partido: true } },
        },
      });

      // Atualiza seguiuOrientacao em batch
      for (const voto of votos) {
        const siglaPartido = voto.deputado.partido?.sigla;
        const orientacaoPartido = siglaPartido
          ? mapaOrientacao.get(siglaPartido)
          : null;

        let seguiuOrientacao: boolean | null = null;

        if (
          orientacaoPartido &&
          orientacaoPartido !== 'AUSENTE' &&
          orientacaoPartido !== 'LIBERADO'
        ) {
          // Partido deu orientação clara — compara com o voto do deputado
          seguiuOrientacao = voto.voto === orientacaoPartido;
        }
        // Se LIBERADO ou AUSENTE → seguiuOrientacao fica null

        await this.prisma.voto.update({
          where: { id: voto.id },
          data: { seguiuOrientacao },
        });
      }

      this.logger.log(
        `Disciplina partidária calculada para votação ${votacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao calcular disciplina de ${votacaoId}: ${error.message}`,
      );
    }
  }

  // ─── Sync completo ─────────────────────────────────────────────────────────

  async sincronizacaoCompleta(
    dataInicio?: string,
  ): Promise<Record<string, any>> {
    this.logger.log('🔄 Iniciando sincronização completa...');
    const resultado: Record<string, any> = {};

    resultado.partidos = await this.sincronizarPartidos();
    resultado.deputados = await this.sincronizarDeputados();
    resultado.votacoes = await this.sincronizarVotacoes(dataInicio);

    // Só busca votos de votações que parecem nominais (têm contagem na descrição)
    const votacoesSemVotos = await this.prisma.votacao.findMany({
      where: {
        votos: { none: {} },
        descricao: { contains: 'Sim:' },
      },
      take: 20,
    });

    this.logger.log(
      `Sincronizando votos + orientações de ${votacoesSemVotos.length} votações...`,
    );
    let totalVotos = 0;
    for (const v of votacoesSemVotos) {
      const { sincronizados } = await this.sincronizarVotos(v.id);
      totalVotos += sincronizados;
      await new Promise((r) => setTimeout(r, 300));
    }

    resultado.votos = { sincronizados: totalVotos };
    this.logger.log('✅ Sincronização completa finalizada!', resultado);
    return resultado;
  }

  // ─── Logs ──────────────────────────────────────────────────────────────────

  async getLogs(limit = 20) {
    return this.prisma.syncLog.findMany({
      orderBy: { criadoEm: 'desc' },
      take: limit,
    });
  }

  private async criarLog(tipo: string) {
    return this.prisma.syncLog.create({
      data: { tipo, status: 'running' },
    });
  }

  private async atualizarLog(
    id: string,
    status: string,
    registros: number,
    mensagem?: string,
  ) {
    await this.prisma.syncLog.update({
      where: { id },
      data: { status, registros, mensagem },
    });
  }
}
