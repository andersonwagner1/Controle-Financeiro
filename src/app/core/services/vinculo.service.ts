import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Vinculo } from '../models/vinculo.model';

@Injectable({ providedIn: 'root' })
export class VinculoService {
  private readonly apiUrl = 'http://localhost:8080/api/vinculos';
  private vinculos$ = new BehaviorSubject<Vinculo[]>([
    { id: 'v-nu-cc', bancoId: 'nubank', contaBaseId: 'cb-cc', saldo: 4250.75, dataInicio: '2021-03-15', ativa: true },
    { id: 'v-nu-cp', bancoId: 'nubank', contaBaseId: 'cb-cp', saldo: 8900.00, dataInicio: '2021-03-15', rentabilidade: 100, ativa: true },
    { id: 'v-nu-cdb', bancoId: 'nubank', contaBaseId: 'cb-cdb', saldo: 25000.00, dataInicio: '2023-03-15', rentabilidade: 120, vencimento: '2027-03-15', ativa: true },
    { id: 'v-ita-cc', bancoId: 'itau', contaBaseId: 'cb-cc', saldo: 1850.40, dataInicio: '2019-07-20', ativa: true },
    { id: 'v-ita-cp', bancoId: 'itau', contaBaseId: 'cb-cp', saldo: 12500.00, dataInicio: '2019-07-20', rentabilidade: 70, ativa: true },
    { id: 'v-ita-fii1', bancoId: 'itau', contaBaseId: 'cb-fii', saldo: 35800.00, dataInicio: '2022-01-10', rentabilidade: 9.8, ativa: true },
    { id: 'v-ita-fii2', bancoId: 'itau', contaBaseId: 'cb-fii', saldo: 18500.00, dataInicio: '2022-06-05', rentabilidade: 11.2, ativa: true },
    { id: 'v-bra-cc', bancoId: 'bradesco', contaBaseId: 'cb-cc', saldo: 620.30, dataInicio: '2018-11-02', ativa: true },
    { id: 'v-bra-cp', bancoId: 'bradesco', contaBaseId: 'cb-cp', saldo: 5700.00, dataInicio: '2018-11-02', rentabilidade: 70, ativa: true },
    { id: 'v-bra-selic', bancoId: 'bradesco', contaBaseId: 'cb-selic', saldo: 42000.00, dataInicio: '2023-06-01', ativa: true },
    { id: 'v-bra-ipca', bancoId: 'bradesco', contaBaseId: 'cb-ipca', saldo: 28000.00, dataInicio: '2023-06-01', rentabilidade: 6.2, vencimento: '2035-05-15', ativa: true },
    { id: 'v-sic-cc', bancoId: 'sicoob', contaBaseId: 'cb-cc', saldo: 3100.00, dataInicio: '2020-05-10', ativa: true },
    { id: 'v-sic-cp', bancoId: 'sicoob', contaBaseId: 'cb-cp', saldo: 9800.00, dataInicio: '2020-05-10', rentabilidade: 70, ativa: true },
    { id: 'v-sic-cdb', bancoId: 'sicoob', contaBaseId: 'cb-cdb', saldo: 15000.00, dataInicio: '2024-05-10', rentabilidade: 110, vencimento: '2026-05-10', ativa: true },
  ]);

  constructor(private http: HttpClient) {
    this.http.get<Vinculo[]>(this.apiUrl).subscribe({ next: vinculos => this.vinculos$.next(vinculos), error: () => undefined });
  }

  getVinculos(): Observable<Vinculo[]> {
    return this.vinculos$.asObservable();
  }

  getVinculosSnapshot(): Vinculo[] {
    return this.vinculos$.getValue();
  }

  getVinculoById(id: string): Vinculo | undefined {
    return this.vinculos$.getValue().find(v => v.id === id);
  }

  adicionarVinculo(vinculo: Vinculo): void {
    this.http.post<Vinculo>(this.apiUrl, vinculo).subscribe({ next: salvo => this.vinculos$.next([...this.vinculos$.getValue(), salvo]) });
  }

  atualizarVinculo(vinculoAtualizado: Vinculo): void {
    this.http.put<Vinculo>(`${this.apiUrl}/${vinculoAtualizado.id}`, vinculoAtualizado).subscribe({ next: salvo => this.vinculos$.next(this.vinculos$.getValue().map(v => v.id === salvo.id ? salvo : v)) });
  }

  atualizarSaldo(vinculoId: string, novoSaldo: number): void {
    this.http.patch<Vinculo>(`${this.apiUrl}/${vinculoId}/saldo?saldo=${novoSaldo}`, {}).subscribe({ next: salvo => this.vinculos$.next(this.vinculos$.getValue().map(v => v.id === salvo.id ? salvo : v)) });
  }
}
