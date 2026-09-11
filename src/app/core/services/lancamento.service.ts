import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Lancamento } from '../models/lancamento.model';
import { ContaService } from './conta.service';

export interface PaginaLancamentos {
  content: Lancamento[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class LancamentoService {
  private readonly apiUrl = 'http://localhost:8080/api/lancamentos';
  private lancamentos$ = new BehaviorSubject<Lancamento[]>([]);

  constructor(private contaService: ContaService, private http: HttpClient) {
    const { dataInicio, dataFim } = this.periodoMesVigente();
    this.buscarPagina(dataInicio, dataFim).subscribe({ error: () => undefined });
  }

  getLancamentos() {
    return this.lancamentos$.asObservable();
  }

  buscarPagina(dataInicio: string, dataFim: string, page = 0, size = 50, contaId?: string): Observable<Lancamento[]> {
    if (!dataInicio || !dataFim) {
      throw new Error('dataInicio e dataFim são obrigatórios para consultar lançamentos.');
    }

    let params = new HttpParams()
      .set('dataInicial', dataInicio)
      .set('dataFinal', dataFim)
      .set('page', page)
      .set('size', size)
      .set('sort', 'data,desc');

    if (contaId) {
      params = params.set('contaId', contaId);
    }
    
    return this.http.get<Lancamento[]>(this.apiUrl, { params }).pipe(
      tap(resultado => 
        {
          
          this.lancamentos$.next(resultado);
          
  })
    );
  }

  periodoMesVigente(dataReferencia = new Date()): { dataInicio: string; dataFim: string } {
    const ano = dataReferencia.getFullYear();
    const mes = dataReferencia.getMonth();
    return {
      dataInicio: this.formatarData(new Date(ano, mes, 1)),
      dataFim: this.formatarData(new Date(ano, mes + 1, 0))
    };
  }

  getLancamentosSnapshot(): Lancamento[] {
    return this.lancamentos$.getValue();
  }

  getLancamentosByConta(contaId: string): Lancamento[] {
    return this.lancamentos$.getValue().filter(l => l.contaId === contaId);
  }

  adicionarLancamento(lancamento: Omit<Lancamento, 'id' | 'saldoApos'>): void {
    const conta = this.contaService.getContaById(lancamento.contaId);
    if (!conta) return;

    const novoSaldo = lancamento.tipo === 'credito'
      ? conta.saldo + lancamento.valor
      : conta.saldo - lancamento.valor;

    const novoLancamento: Lancamento = {
      ...lancamento,
      id: 'l' + Date.now(),
      saldoApos: novoSaldo,
    };

    this.http.post<Lancamento>(this.apiUrl, novoLancamento).subscribe({ next: salvo => {
      this.lancamentos$.next([salvo, ...this.lancamentos$.getValue()]);
      this.contaService.atualizarSaldo(lancamento.contaId, novoSaldo);
    }});
  }

  atualizarLancamento(lancamento: Lancamento): void {
    const oldLancamento = this.getLancamentosSnapshot().find(l => l.id === lancamento.id);
    if (!oldLancamento) return;

    const conta = this.contaService.getContaById(lancamento.contaId);
    if (!conta) return;

    let saldoTemp = oldLancamento.tipo === 'credito' ? conta.saldo - oldLancamento.valor : conta.saldo + oldLancamento.valor;
    let novoSaldo = lancamento.tipo === 'credito' ? saldoTemp + lancamento.valor : saldoTemp - lancamento.valor;

    const atualizado = { ...lancamento, saldoApos: novoSaldo };
    const lancamentos = this.getLancamentosSnapshot().map(l => l.id === lancamento.id ? atualizado : l);
    this.http.put<Lancamento>(`${this.apiUrl}/${lancamento.id}`, atualizado).subscribe({ next: salvo => {
      this.lancamentos$.next(lancamentos.map(item => item.id === salvo.id ? salvo : item));
      this.contaService.atualizarSaldo(lancamento.contaId, novoSaldo);
    }});
  }

  removerLancamento(id: string): void {
    const lancamento = this.getLancamentosSnapshot().find(l => l.id === id);
    if (!lancamento) return;

    const conta = this.contaService.getContaById(lancamento.contaId);
    if (conta) {
      let novoSaldo = lancamento.tipo === 'credito' ? conta.saldo - lancamento.valor : conta.saldo + lancamento.valor;
      this.contaService.atualizarSaldo(lancamento.contaId, novoSaldo);
    }

    this.http.delete(`${this.apiUrl}/${id}`).subscribe({ next: () => this.lancamentos$.next(this.getLancamentosSnapshot().filter(l => l.id !== id)) });
  }

  getTotalCreditoMes(mes: number, ano: number): number {
    return this.lancamentos$.getValue()
      .filter(l => {
        const d = new Date(l.data);
        return l.tipo === 'credito' && d.getMonth() + 1 === mes && d.getFullYear() === ano;
      })
      .reduce((acc, l) => acc + l.valor, 0);
  }

  getTotalDebitoMes(mes: number, ano: number): number {
    return this.lancamentos$.getValue()
      .filter(l => {
        const d = new Date(l.data);
        return l.tipo === 'debito' && d.getMonth() + 1 === mes && d.getFullYear() === ano;
      })
      .reduce((acc, l) => acc + l.valor, 0);
  }

  getTransferencias(): Observable<any[]> {
    return new Observable<any[]>(subscriber => {
      this.lancamentos$.subscribe(lancamentos => {
        const transferenciasMap = new Map<string, any>();
        for (const l of lancamentos) {
          if (l.transferenciaId) {
            if (!transferenciasMap.has(l.transferenciaId)) {
              transferenciasMap.set(l.transferenciaId, {
                id: l.transferenciaId,
                valor: l.valor,
                data: l.data,
                descricao: l.descricao
              });
            }
            if (l.tipo === 'debito') {
              transferenciasMap.get(l.transferenciaId).contaOrigemId = l.contaId;
            } else {
              transferenciasMap.get(l.transferenciaId).contaDestinoId = l.contaId;
            }
          }
        }
        subscriber.next(Array.from(transferenciasMap.values()));
      });
    });
  }

  realizarTransferencia(transferencia: any): boolean {
    const origem = this.contaService.getContaById(transferencia.contaOrigemId);
    const destino = this.contaService.getContaById(transferencia.contaDestinoId);

    if (!origem || !destino) return false;
    if (origem.saldo < transferencia.valor) return false;

    const transferenciaId = 't' + Date.now();

    this.http.post<any>('http://localhost:8080/api/transferencias', { ...transferencia, id: transferenciaId }).subscribe({ next: salvo => {
      const valor = transferencia.valor;
      const debito: Lancamento = { id: `${salvo.id}-debito`, contaId: origem.id, tipo: 'debito', descricao: transferencia.descricao, categoria: 'Transferência Enviada', valor, data: transferencia.data, competencia: transferencia.competencia, transferenciaId: salvo.id };
      const credito: Lancamento = { id: `${salvo.id}-credito`, contaId: destino.id, tipo: 'credito', descricao: transferencia.descricao, categoria: 'Transferência Recebida', valor, data: transferencia.data, competencia: transferencia.competencia, transferenciaId: salvo.id };
      this.lancamentos$.next([debito, credito, ...this.getLancamentosSnapshot()]);
      this.contaService.atualizarSaldo(origem.id, origem.saldo - valor);
      this.contaService.atualizarSaldo(destino.id, destino.saldo + valor);
    }});

    return true;
  }

  private formatarData(data: Date): string {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  }
}
