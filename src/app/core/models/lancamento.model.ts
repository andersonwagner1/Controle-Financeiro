export type TipoLancamento = 'CREDITO' | 'DEBITO' | 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE';

export interface Lancamento {
  id?: number;
  bancoContaId: number;
  tipo: TipoLancamento;
  
  categoria: string;
  valor: number;
  data: string;
  
  observacao?: string;
  saldoApos?: number;
  transferenciaId?: number;
  investimentoId?: number;
}

