export type TipoLancamento = 'credito' | 'debito';

export interface Lancamento {
  id: string;
  contaId: string;
  tipo: TipoLancamento;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  competencia?: string;
  observacao?: string;
  saldoApos?: number;
  transferenciaId?: string;
}

export const CATEGORIAS_CREDITO = [
  'Salário',
  'Freelance',
  'Rendimento',
  'Transferência Recebida',
  'Venda',
  'Reembolso',
  'Dividendo FII',
  'Juros CDB',
  'Outros Créditos',
];

export const CATEGORIAS_DEBITO = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Moradia',
  'Conta de Luz',
  'Conta de Água',
  'Internet',
  'Celular',
  'Vestuário',
  'Cartão de Crédito',
  'Transferência Enviada',
  'Investimento',
  'Outros Débitos',
];
