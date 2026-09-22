export type TipoLancamentoCartao = 'credito' | 'debito';

export interface LancamentoCartao {
  id: number;
  vinculoId: number;
  
  tipo: TipoLancamentoCartao;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  competencia?: string;
  observacao?: string;
  transferenciaId?: number;
}
