import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Lancamento } from '../models/lancamento.model';
import { ContaService } from './conta.service';

@Injectable({ providedIn: 'root' })
export class LancamentoService {
  private readonly apiUrl = 'http://localhost:8080/api/lancamentos';
  private lancamentos$ = new BehaviorSubject<Lancamento[]>([
    { id: 'l001', contaId: 'v-nu-cc', tipo: 'credito', descricao: 'Salário Agosto', categoria: 'Salário', valor: 8500.00, data: '2026-08-05', saldoApos: 4250.75 },
    { id: 'l002', contaId: 'v-nu-cc', tipo: 'debito', descricao: 'Supermercado Extra', categoria: 'Alimentação', valor: 452.30, data: '2026-08-07', saldoApos: 3798.45 },
    { id: 'l003', contaId: 'v-nu-cc', tipo: 'debito', descricao: 'Conta de Luz', categoria: 'Conta de Luz', valor: 187.60, data: '2026-08-10', saldoApos: 3610.85 },
    { id: 'l004', contaId: 'v-nu-cc', tipo: 'debito', descricao: 'Aluguel', categoria: 'Moradia', valor: 2100.00, data: '2026-08-10', saldoApos: 1510.85 },
    { id: 'l005', contaId: 'v-nu-cc', tipo: 'credito', descricao: 'Freelance site', categoria: 'Freelance', valor: 1500.00, data: '2026-08-15', saldoApos: 3010.85 },
    { id: 'l006', contaId: 'v-nu-cc', tipo: 'debito', descricao: 'Farmácia', categoria: 'Saúde', valor: 89.90, data: '2026-08-18', saldoApos: 2920.95 },
    { id: 'l007', contaId: 'v-nu-cc', tipo: 'debito', descricao: 'Netflix + Spotify', categoria: 'Lazer', valor: 74.90, data: '2026-08-20', saldoApos: 2846.05 },

    { id: 'l008', contaId: 'v-ita-cc', tipo: 'credito', descricao: '13º Salário parcial', categoria: 'Salário', valor: 4250.00, data: '2026-08-01', saldoApos: 1850.40 },
    { id: 'l009', contaId: 'v-ita-cc', tipo: 'debito', descricao: 'Cartão de Crédito Itaú', categoria: 'Cartão de Crédito', valor: 3200.00, data: '2026-08-15', saldoApos: -1349.60 },

    { id: 'l010', contaId: 'v-bra-cc', tipo: 'credito', descricao: 'PIX recebido', categoria: 'Transferência Recebida', valor: 500.00, data: '2026-08-05', saldoApos: 620.30 },
    { id: 'l011', contaId: 'v-bra-cc', tipo: 'debito', descricao: 'Combustível', categoria: 'Transporte', valor: 280.00, data: '2026-08-12', saldoApos: 340.30 },

    { id: 'l012', contaId: 'v-sic-cc', tipo: 'credito', descricao: 'Venda produto', categoria: 'Venda', valor: 1200.00, data: '2026-08-08', saldoApos: 3100.00 },
    { id: 'l013', contaId: 'v-sic-cc', tipo: 'debito', descricao: 'Internet fibra', categoria: 'Internet', valor: 120.00, data: '2026-08-10', saldoApos: 2980.00 },

    // Rendimentos de investimentos
    { id: 'l014', contaId: 'v-ita-fii1', tipo: 'credito', descricao: 'Dividendo HGLG11 - Agosto', categoria: 'Dividendo FII', valor: 292.35, data: '2026-08-14', saldoApos: 35800.00 },
    { id: 'l015', contaId: 'v-ita-fii2', tipo: 'credito', descricao: 'Dividendo MXRF11 - Agosto', categoria: 'Dividendo FII', valor: 172.25, data: '2026-08-14', saldoApos: 18500.00 },
    { id: 'l016', contaId: 'v-bra-selic', tipo: 'credito', descricao: 'Rendimento SELIC Agosto', categoria: 'Juros CDB', valor: 484.25, data: '2026-09-01', saldoApos: 42000.00 },
    { id: 'l017', contaId: 'v-nu-cdb', tipo: 'credito', descricao: 'Rendimento CDB Nubank', categoria: 'Juros CDB', valor: 312.50, data: '2026-09-01', saldoApos: 25000.00 },
  ]);

  constructor(private contaService: ContaService, private http: HttpClient) {
    this.http.get<Lancamento[]>(this.apiUrl).subscribe({ next: lancamentos => this.lancamentos$.next(lancamentos), error: () => undefined });
  }

  getLancamentos() {
    return this.lancamentos$.asObservable();
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
}
