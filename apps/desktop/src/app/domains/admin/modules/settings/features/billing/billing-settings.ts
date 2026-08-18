import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { environment } from '@/environments/environment';

type BillingData = {
  configuracion: any;
  impuestos: any[];
  terminosPago: any[];
};

@Component({
  selector: 'app-billing-settings',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslocoPipe,
  ],
  template: `
    <div
      class="flex h-full w-full min-w-0 flex-col bg-white dark:bg-neutral-900"
    >
      <header
        class="shrink-0 border-b border-neutral-200 px-6 py-8 md:px-8 dark:border-neutral-700"
      >
        <h1
          class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
        >
          {{ 'billingConfig.title' | transloco }}
        </h1>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {{ 'billingConfig.description' | transloco }}
        </p>
      </header>
      @if (data(); as config) {
        <div
          class="grid flex-auto gap-6 overflow-y-auto p-6 md:grid-cols-2 md:p-8"
        >
          <section
            class="rounded-2xl border border-neutral-200 p-6 pb-8 dark:border-neutral-700"
          >
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
              {{ 'billingConfig.general' | transloco }}
            </h2>
            <p class="mt-1 mb-6 text-sm text-neutral-500 dark:text-neutral-400">
              {{ 'billingConfig.generalDescription' | transloco }}
            </p>
            <div class="grid gap-4 sm:grid-cols-2">
              <mat-form-field appearance="outline"
                ><mat-label>{{
                  'billingConfig.baseCurrency' | transloco
                }}</mat-label
                ><mat-select [(ngModel)]="config.configuracion.monedaBase"
                  ><mat-option value="DOP">{{
                    'billingConfig.currencyDop' | transloco
                  }}</mat-option
                  ><mat-option value="USD">{{
                    'billingConfig.currencyUsd' | transloco
                  }}</mat-option
                  ><mat-option value="EUR">{{
                    'billingConfig.currencyEur' | transloco
                  }}</mat-option></mat-select
                ></mat-form-field
              >
              <mat-form-field appearance="outline"
                ><mat-label>{{
                  'billingConfig.timezone' | transloco
                }}</mat-label
                ><mat-select [(ngModel)]="config.configuracion.zonaHoraria"
                  ><mat-option value="America/Santo_Domingo">{{
                    'billingConfig.timezoneSantoDomingo' | transloco
                  }}</mat-option
                  ><mat-option value="America/New_York">{{
                    'billingConfig.timezoneNewYork' | transloco
                  }}</mat-option
                  ><mat-option value="UTC">UTC</mat-option></mat-select
                ></mat-form-field
              >
              <mat-form-field appearance="outline"
                ><mat-label>{{
                  'billingConfig.rounding' | transloco
                }}</mat-label
                ><mat-select [(ngModel)]="config.configuracion.metodoRedondeo"
                  ><mat-option value="HALF_UP">{{
                    'billingConfig.halfUp' | transloco
                  }}</mat-option></mat-select
                ></mat-form-field
              >
              <mat-form-field appearance="outline"
                ><mat-label>{{
                  'billingConfig.roundingBy' | transloco
                }}</mat-label
                ><mat-select [(ngModel)]="config.configuracion.redondeoPor"
                  ><mat-option value="LINEA">{{
                    'billingConfig.byLine' | transloco
                  }}</mat-option
                  ><mat-option value="DOCUMENTO">{{
                    'billingConfig.byDocument' | transloco
                  }}</mat-option></mat-select
                ></mat-form-field
              >
            </div>
            <div class="mt-2 grid gap-4 sm:grid-cols-2">
              <mat-form-field appearance="outline"
                ><mat-label>{{
                  'billingConfig.currencyPrecision' | transloco
                }}</mat-label
                ><mat-select [(ngModel)]="config.configuracion.precisionMoneda"
                  ><mat-option [value]="0">0</mat-option
                  ><mat-option [value]="2">2</mat-option></mat-select
                ></mat-form-field
              >
              <mat-form-field appearance="outline"
                ><mat-label>{{
                  'billingConfig.quantityPrecision' | transloco
                }}</mat-label
                ><mat-select
                  [(ngModel)]="config.configuracion.precisionCantidad"
                  ><mat-option [value]="2">2</mat-option
                  ><mat-option [value]="3">3</mat-option
                  ><mat-option [value]="4">4</mat-option></mat-select
                ></mat-form-field
              >
              <mat-form-field appearance="outline"
                ><mat-label>{{
                  'billingConfig.includesTax' | transloco
                }}</mat-label
                ><mat-select
                  [(ngModel)]="config.configuracion.preciosIncluyenImpuesto"
                  ><mat-option [value]="false">{{
                    'billingConfig.no' | transloco
                  }}</mat-option
                  ><mat-option [value]="true">{{
                    'billingConfig.yes' | transloco
                  }}</mat-option></mat-select
                ></mat-form-field
              >
              <mat-form-field appearance="outline"
                ><mat-label>{{
                  'billingConfig.graceDays' | transloco
                }}</mat-label
                ><input
                  matInput
                  type="number"
                  min="0"
                  max="365"
                  [(ngModel)]="config.configuracion.diasGracia"
                  placeholder="0"
              /></mat-form-field>
            </div>
            <button
              class="mt-2 mb-2"
              mat-flat-button
              color="primary"
              type="button"
              [disabled]="saving()"
              (click)="save(config.configuracion)"
            >
              {{ 'common.save' | transloco }}
            </button>
          </section>
          <section
            class="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700"
          >
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
              {{ 'billingConfig.taxes' | transloco }}
            </h2>
            <p class="mt-1 mb-6 text-sm text-neutral-500 dark:text-neutral-400">
              {{ 'billingConfig.taxesDescription' | transloco }}
            </p>
            <div class="grid gap-3">
              @for (tax of config.impuestos; track tax.id) {
                <div
                  class="grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-[1fr_120px_180px_auto] sm:items-end dark:bg-neutral-800"
                >
                  <mat-form-field
                    appearance="outline"
                    subscriptSizing="dynamic"
                    ><mat-label>{{
                      'billingConfig.taxName' | transloco
                    }}</mat-label
                    ><input
                      matInput
                      [(ngModel)]="tax.nombre"
                      placeholder="ITBIS 18%"
                  /></mat-form-field>
                  <mat-form-field
                    appearance="outline"
                    subscriptSizing="dynamic"
                    ><mat-label>{{
                      'billingConfig.rate' | transloco
                    }}</mat-label
                    ><input
                      matInput
                      type="number"
                      min="0"
                      max="100"
                      [(ngModel)]="tax.tasa"
                      placeholder="18"
                  /></mat-form-field>
                  <mat-form-field
                    appearance="outline"
                    subscriptSizing="dynamic"
                    ><mat-label>{{
                      'billingConfig.dgiiIndicator' | transloco
                    }}</mat-label
                    ><mat-select [(ngModel)]="tax.indicadorFacturacion"
                      ><mat-option value="1"
                        >1 ·
                        {{ 'billingConfig.taxable' | transloco }}</mat-option
                      ><mat-option value="2"
                        >2 ·
                        {{ 'billingConfig.zeroRated' | transloco }}</mat-option
                      ><mat-option value="4"
                        >4 ·
                        {{ 'billingConfig.exempt' | transloco }}</mat-option
                      ></mat-select
                    ></mat-form-field
                  >
                  <button
                    class="mb-1"
                    mat-stroked-button
                    type="button"
                    [disabled]="saving()"
                    (click)="saveTax(tax)"
                  >
                    {{ 'common.save' | transloco }}
                  </button>
                </div>
              }
            </div>
          </section>
          <section
            class="rounded-2xl border border-neutral-200 p-6 md:col-span-2 dark:border-neutral-700"
          >
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
              {{ 'billingConfig.paymentTerms' | transloco }}
            </h2>
            <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              @for (term of config.terminosPago; track term.id) {
                <div
                  class="grid gap-3 rounded-xl border border-neutral-200 p-4 sm:grid-cols-[1fr_120px_auto] sm:items-end dark:border-neutral-700"
                >
                  <mat-form-field
                    appearance="outline"
                    subscriptSizing="dynamic"
                    ><mat-label>{{
                      'billingConfig.termName' | transloco
                    }}</mat-label
                    ><input
                      matInput
                      [(ngModel)]="term.nombre"
                      placeholder="Crédito 30 días"
                  /></mat-form-field>
                  <mat-form-field
                    appearance="outline"
                    subscriptSizing="dynamic"
                    ><mat-label>{{
                      'billingConfig.days' | transloco
                    }}</mat-label
                    ><input
                      matInput
                      type="number"
                      min="0"
                      [(ngModel)]="term.diasCredito"
                      placeholder="30"
                  /></mat-form-field>
                  <button
                    class="mb-1"
                    mat-stroked-button
                    type="button"
                    [disabled]="saving()"
                    (click)="saveTerm(term)"
                  >
                    {{ 'common.save' | transloco }}
                  </button>
                </div>
              }
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class BillingSettingsComponent {
  private readonly http = inject(HttpClient);
  private readonly snack = inject(MatSnackBar);
  private readonly i18n = inject(TranslocoService);
  readonly data = signal<BillingData | null>(null);
  readonly saving = signal(false);
  private readonly api = `${environment.apiUrl}/billing-config`;

  constructor() {
    this.load();
  }
  private load() {
    this.http.get<BillingData>(this.api).subscribe({
      next: (value) => this.data.set(value),
      error: () => this.notice('billingConfig.loadError'),
    });
  }
  save(config: any) {
    this.saving.set(true);
    this.http.patch(`${this.api}`, config).subscribe({
      next: (value) => {
        const current = this.data();
        if (current) this.data.set({ ...current, configuracion: value });
        this.saving.set(false);
        this.notice('billingConfig.saved');
      },
      error: () => {
        this.saving.set(false);
        this.notice('billingConfig.saveError');
      },
    });
  }
  saveTax(tax: any) {
    this.saving.set(true);
    this.http.patch(`${this.api}/taxes/${tax.id}`, tax).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice('billingConfig.saved');
      },
      error: () => {
        this.saving.set(false);
        this.notice('billingConfig.saveError');
      },
    });
  }
  saveTerm(term: any) {
    this.saving.set(true);
    this.http.patch(`${this.api}/payment-terms/${term.id}`, term).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice('billingConfig.saved');
      },
      error: () => {
        this.saving.set(false);
        this.notice('billingConfig.saveError');
      },
    });
  }
  private notice(key: string) {
    this.snack.open(
      this.i18n.translate(key),
      this.i18n.translate('common.close'),
      { duration: 3000 }
    );
  }
}
