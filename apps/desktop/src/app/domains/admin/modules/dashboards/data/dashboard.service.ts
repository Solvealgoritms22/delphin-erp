import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

export interface DashboardSummary {
  totalUsers: number;
  totalClients: number;
  totalProducts: number;
  totalSuppliers: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  getSummary() {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/summary`);
  }
}
