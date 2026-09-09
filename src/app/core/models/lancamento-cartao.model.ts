export type TipoLancamentoCartao = 'credito' | 'debito';

export interface LancamentoCartao {
  id: string;
  vinculoId: string;
  tipo: TipoLancamentoCartao;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  competencia?: string;
  observacao?: string;
  transferenciaId?: string;
}
