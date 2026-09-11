import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LancamentoCartao } from '../models/lancamento-cartao.model';

@Injectable({ providedIn: 'root' })
export class LancamentoCartaoService {
  private readonly apiUrl = 'http://localhost:8080/api/lancamentos-cartao';
  private readonly lancamentos$ = new BehaviorSubject<LancamentoCartao[]>([]);

  constructor(private http: HttpClient) {}

  getLancamentos(): Observable<LancamentoCartao[]> {
    return this.lancamentos$.asObservable();
  }

  getLancamentosSnapshot(): LancamentoCartao[] {
    return this.lancamentos$.getValue();
  }

  buscarPorPeriodo(dataInicio: string, dataFim: string): Observable<LancamentoCartao[]> {
    if (!dataInicio || !dataFim) {
      throw new Error('dataInicio e dataFim são obrigatórios para consultar lançamentos do cartão.');
    }

    const params = new HttpParams()
      .set('dataInicio', dataInicio)
      .set('dataFim', dataFim)
      .set('sort', 'data,desc');

    return this.http.get<LancamentoCartao[]>(this.apiUrl, { params }).pipe(
      tap(lancamentos => this.lancamentos$.next(lancamentos))
    );
  }

  adicionarLancamento(lancamento: Omit<LancamentoCartao, 'id'>): Observable<LancamentoCartao> {
    const novoLancamento = {
      ...lancamento,
      id: 'lc' + Date.now() + Math.random().toString(36).slice(2, 7)
    };

    return this.http.post<LancamentoCartao>(this.apiUrl, novoLancamento).pipe(
      tap(salvo => this.lancamentos$.next([salvo, ...this.lancamentos$.getValue()]))
    );
  }
}
