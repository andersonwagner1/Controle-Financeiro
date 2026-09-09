export type TipoCategoria = 'C' | 'D' | 'T';
export type StatusCategoria = 'A' | 'I';

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  ativo: StatusCategoria;
}

export const TIPOS_CATEGORIA: Record<TipoCategoria, string> = {
  C: 'Crédito',
  D: 'Débito',
  T: 'Transferência'
};

export const STATUS_CATEGORIA: Record<StatusCategoria, string> = {
  A: 'Ativo',
  I: 'Inativo'
};
