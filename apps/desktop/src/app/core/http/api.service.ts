import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type ApiOptions = {
  params?: HttpParams | { [param: string]: string | number | boolean | readonly (string | number | boolean)[] };
  headers?: { [header: string]: string | string[] };
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);

  private baseUrl = '/api';

  get<T>(path: string, options?: ApiOptions): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, options);
  }

  post<T>(path: string, body: any, options?: ApiOptions): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, options);
  }

  put<T>(path: string, body: any, options?: ApiOptions): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body, options);
  }

  patch<T>(path: string, body: any, options?: ApiOptions): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, options);
  }

  delete<T>(path: string, options?: ApiOptions): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`, options);
  }
}
