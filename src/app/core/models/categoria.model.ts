export type TipoCategoria = 'CREDITO' | 'DEBITO' | 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE' | 'TODOS';
export type StatusCategoria = 'SIM' | 'NAO';

export interface Categoria {
  id?: number;
  nome: string;
  tipo: TipoCategoria;
  ativo: StatusCategoria;
}

export const TIPOS_CATEGORIA: Record<TipoCategoria, string> = {
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
  TRANSFERENCIA: 'Transferência',
  APLICACAO:'aPLICAÇÃO',
  RESGATE:'resgate',
  TODOS: "Todos"
};

export const STATUS_CATEGORIA: Record<StatusCategoria, string> = {
  SIM: 'Ativo',
  NAO: 'Inativo'
};
