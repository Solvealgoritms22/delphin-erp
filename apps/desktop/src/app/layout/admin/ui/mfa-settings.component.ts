import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-mfa-settings',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, TranslocoPipe],
  template: `
    <section class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
      <h3 class="text-base font-semibold text-neutral-900 dark:text-white">{{ 'mfa.title' | transloco }}</h3>
      @if (loading()) {
        <div class="h-16 mt-3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" [attr.aria-label]="'mfa.loading' | transloco"></div>
      } @else {
        <p class="my-3 text-sm text-neutral-600 dark:text-neutral-400">{{ (enabled() ? 'mfa.enabledHelp' : 'mfa.disabledHelp') | transloco }}</p>
        @if (setup(); as data) {
          <p class="text-sm mb-3">{{ 'mfa.scanHelp' | transloco }}</p>
          <img [src]="data.qrDataUrl" [alt]="'mfa.qrAlt' | transloco" class="w-48 h-48 mx-auto bg-white rounded-lg" />
          <p class="mt-3 text-xs text-neutral-500 font-medium">{{ 'mfa.manualKey' | transloco }}</p>
          <div class="my-2 p-2.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg border border-neutral-200 dark:border-neutral-700/60">
            <code class="block text-xs font-mono tracking-wider font-semibold text-neutral-800 dark:text-neutral-200 select-all break-all">{{ data.secret }}</code>
          </div>
        }
        @if (enabled() || setup()) {
          <mat-form-field appearance="outline" class="w-full mt-4" subscriptSizing="dynamic">
            <mat-label>{{ 'mfa.code' | transloco }}</mat-label>
            <input matInput [(ngModel)]="code" [ngModelOptions]="{standalone: true}" autocomplete="one-time-code" placeholder="123456" maxlength="40" />
          </mat-form-field>
          <div class="mt-4 flex flex-wrap gap-2">
            @if (setup()) {
              <button mat-flat-button color="primary" type="button" [disabled]="busy() || !code" (click)="manage('enable')">{{ 'mfa.enable' | transloco }}</button>
            } @else {
              <button mat-stroked-button type="button" [disabled]="busy() || !code" (click)="manage('recovery-codes')">{{ 'mfa.regenerate' | transloco }}</button>
              <button mat-button type="button" [disabled]="busy() || !code" (click)="manage('disable')">{{ 'mfa.disable' | transloco }}</button>
            }
          </div>
        } @else {
          <button mat-stroked-button type="button" [disabled]="busy()" (click)="start()">{{ 'mfa.start' | transloco }}</button>
        }
        @if (codes().length) {
          <div class="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <p class="text-sm font-medium mb-2">{{ 'mfa.saveCodes' | transloco }}</p>
            <div class="space-y-1">@for (value of codes(); track value) { <code class="block text-xs break-all select-all">{{ value }}</code> }</div>
          </div>
        }
      }
      @if (message()) { <p role="status" class="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{{ message() | transloco }}</p> }
    </section>`,
})
export class MfaSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private url = environment.apiUrl + '/auth/mfa';
  loading = signal(true);
  busy = signal(false);
  enabled = signal(false);
  setup = signal<{secret: string; qrDataUrl: string} | null>(null);
  codes = signal<string[]>([]);
  message = signal('');
  code = '';
  ngOnInit() {
    this.http.get<{enabled: boolean}>(this.url).subscribe({
      next: value => { this.enabled.set(value.enabled); this.loading.set(false); },
      error: () => { this.message.set('mfa.loadError'); this.loading.set(false); },
    });
  }
  start() {
    if (this.busy()) return;
    this.busy.set(true); this.message.set('');
    this.http.post<{secret: string; qrDataUrl: string}>(this.url + '/setup', {}).subscribe({
      next: value => { this.setup.set(value); this.busy.set(false); },
      error: error => { this.busy.set(false); this.message.set(error.status === 401 ? 'mfa.relogin' : 'mfa.setupError'); },
    });
  }
  manage(action: 'enable' | 'disable' | 'recovery-codes') {
    if (this.busy()) return;
    this.busy.set(true); this.message.set('');
    this.http.post<{recoveryCodes: string[]}>(this.url + '/' + action, {code: this.code}).subscribe({
      next: value => {
        this.enabled.set(action !== 'disable'); this.setup.set(null); this.codes.set(value.recoveryCodes);
        this.code = ''; this.busy.set(false); this.message.set('mfa.saved');
      },
      error: () => { this.busy.set(false); this.code = ''; this.message.set('mfa.invalidCode'); },
    });
  }
}
