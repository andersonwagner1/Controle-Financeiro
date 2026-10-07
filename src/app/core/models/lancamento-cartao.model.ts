export type TipoLancamentoCartao = 'credito' | 'debito';

export interface LancamentoCartao {
  id: number;

  descricao: string;

  tipoMovimentacao: string;

  cartaoCredito : string

  

  valor: number;
  data: string;
  
  tipo: TipoLancamentoCartao;

  cartaoCreditoId: number;
  
  /*
  categoria: string;

  competencia?: string;
  observacao?: string;
  transferenciaId?: number;*/
}
