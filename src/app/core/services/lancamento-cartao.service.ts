import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LancamentoCartao } from '../models/lancamento-cartao.model';

@Injectable({ providedIn: 'root' })
export class LancamentoCartaoService {
  private readonly apiUrl = 'http://localhost:8080/api/lancamentos-cartao';
  private readonly lancamentos$ = new BehaviorSubject<LancamentoCartao[]>([]);

  constructor(private http: HttpClient) {}

  buscarMovimentacaoPorPeriodo(cartaoCreditoId: number, dataInicio: string, dataFim: string): Observable<LancamentoCartao[]> {
    if (!dataInicio || !dataFim) {
      throw new Error('dataInicio e dataFim são obrigatórios para consultar lançamentos do cartão.');
    }

    const params = new HttpParams()
      .set('dataInicio', dataInicio)
      .set('dataFim', dataFim)
      .set('contaId', cartaoCreditoId)
      .set('sort', 'data,desc');

    return this.http.get<LancamentoCartao[]>(this.apiUrl, { params })      
  }

  buscarPeriodoDashboard(dataInicio: string, dataFim: string): Observable<LancamentoCartao[]> {
    const params = new HttpParams()
      .set('dataInicio', dataInicio)
      .set('dataFim', dataFim)
      .set('sort', 'data,desc');

    return this.http.get<LancamentoCartao[]>(this.apiUrl, { params });
  }

  adicionarLancamento(lancamento: Omit<LancamentoCartao, 'id'>): Observable<LancamentoCartao> {
    console.log('Adicionando lançamento:', lancamento);

    return this.http.post<LancamentoCartao>(this.apiUrl, lancamento).pipe(
      tap(salvo => this.lancamentos$.next([salvo, ...this.lancamentos$.getValue()]))
    );
  }
}
