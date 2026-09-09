export interface Cartao {
  id: string;
  vinculoId: string;
  nome: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  dataAbertura: string;
  dataFechamento?: string;
  ativa: boolean;
}

export type CartaoInput = Omit<Cartao, 'id'> & { id?: string };
