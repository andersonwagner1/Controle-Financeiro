import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardCart } from '../models/dashboard-cart.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = 'http://localhost:8080/api/dashboard/cart';

  constructor(private http: HttpClient) {}

  getDashboardCart(): Observable<DashboardCart> {
    return this.http.get<DashboardCart>(this.apiUrl);
  }
}