import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Investimento } from '../models/investimento.model';

@Injectable({ providedIn: 'root' })
export class InvestimentoService {
  private readonly apiUrl = 'http://localhost:8080/api/investimentos';
  private readonly investimentos$ = new BehaviorSubject<Investimento[]>([]);

  constructor(private http: HttpClient) {}

  getInvestimentos(): Observable<Investimento[]> {
    return this.investimentos$.asObservable();
  }

  getInvestimentosAtivos(): Observable<Investimento[]> {
    return this.getInvestimentos().pipe(
      map(investimentos => investimentos.filter(investimento => investimento.ativo !== false))
    );
  }

  listarInvestimentos(): Observable<Investimento[]> {
    return this.http.get<Investimento[]>(this.apiUrl).pipe(
      tap(investimentos => this.investimentos$.next(investimentos))
    );
  }

  adicionarInvestimento(nome: string): Observable<Investimento> {
    return this.http.post<Investimento>(this.apiUrl, { nome: nome.trim(), ativo: true }).pipe(
      tap(investimento => this.investimentos$.next([
        ...this.investimentos$.getValue(),
        investimento
      ]))
    );
  }

  atualizarInvestimento(investimento: Investimento): Observable<Investimento> {
    return this.http.put<Investimento>(`${this.apiUrl}/${investimento.id}`, investimento).pipe(
      tap(salvo => this.investimentos$.next(this.investimentos$.getValue().map(item =>
        item.id === salvo.id ? salvo : item
      )))
    );
  }
}
