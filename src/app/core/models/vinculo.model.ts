export interface Vinculo {
  id: string;
  bancoId: string;
  contaBaseId: string;
  descricao?: string;
  saldo: number;
  dataInicio: string;
  dataFim?: string;
  rentabilidade?: number;
  vencimento?: string;
  limite?: number;
  diaFechamento?: number;
  diaVencimento?: number;
  ativa: boolean;
}
