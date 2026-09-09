import { TipoConta } from './conta.model';

export interface ContaBase {
  id: string;
  descricao: string;
  tipo: TipoConta;
}
