import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
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
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslocoPipe,
    SkeletonComponent,
  ],
  template: `
    <div
      class="flex h-full w-full min-w-0 flex-col overflow-hidden bg-neutral-50/50 dark:bg-neutral-950"
    >

      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-6 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 z-10"
      >
        <div>
          <h1
            class="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'billingConfig.title' | transloco }}
          </h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'billingConfig.description' | transloco }}
          </p>
        </div>
      </div>

      @if (loading()) {

        <div
          class="flex-auto overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 w-full"
        >
          <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div
              class="xl:col-span-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4"
            >
              <app-skeleton type="text" width="40%" height="1.5rem" />
              <app-skeleton type="text" width="70%" height="1rem" />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <app-skeleton type="rect" height="3.5rem" />
                <app-skeleton type="rect" height="3.5rem" />
                <app-skeleton type="rect" height="3.5rem" />
                <app-skeleton type="rect" height="3.5rem" />
              </div>
            </div>
            <div
              class="xl:col-span-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4"
            >
              <app-skeleton type="text" width="40%" height="1.5rem" />
              <app-skeleton type="text" width="70%" height="1rem" />
              <app-skeleton type="card" height="5.5rem" />
              <app-skeleton type="card" height="5.5rem" />
            </div>
          </div>
          <div
            class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4"
          >
            <app-skeleton type="text" width="30%" height="1.5rem" />
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4"
            >
              <app-skeleton type="card" height="8rem" />
              <app-skeleton type="card" height="8rem" />
              <app-skeleton type="card" height="8rem" />
              <app-skeleton type="card" height="8rem" />
            </div>
          </div>
        </div>
      } @else if (data(); as config) {
        <div
          class="flex-auto overflow-y-auto min-w-0 p-4 sm:p-6 md:p-8 space-y-6 w-full"
        >

          <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">

            <section
              class="xl:col-span-6 flex flex-col justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs p-5 sm:p-6"
            >
              <div>
                <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'billingConfig.general' | transloco }}
                </h2>
                <p class="mt-1 mb-6 text-sm text-neutral-500 dark:text-neutral-400">
                  {{ 'billingConfig.generalDescription' | transloco }}
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'billingConfig.baseCurrency' | transloco }}</mat-label>
                    <mat-select [(ngModel)]="config.configuracion.monedaBase">
                      <mat-option value="DOP">{{ 'billingConfig.currencyDop' | transloco }}</mat-option>
                      <mat-option value="USD">{{ 'billingConfig.currencyUsd' | transloco }}</mat-option>
                      <mat-option value="EUR">{{ 'billingConfig.currencyEur' | transloco }}</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'billingConfig.timezone' | transloco }}</mat-label>
                    <mat-select [(ngModel)]="config.configuracion.zonaHoraria">
                      <mat-option value="America/Santo_Domingo">{{
                        'billingConfig.timezoneSantoDomingo' | transloco
                      }}</mat-option>
                      <mat-option value="America/New_York">{{
                        'billingConfig.timezoneNewYork' | transloco
                      }}</mat-option>
                      <mat-option value="UTC">UTC</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'billingConfig.rounding' | transloco }}</mat-label>
                    <mat-select [(ngModel)]="config.configuracion.metodoRedondeo">
                      <mat-option value="HALF_UP">{{ 'billingConfig.halfUp' | transloco }}</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'billingConfig.roundingBy' | transloco }}</mat-label>
                    <mat-select [(ngModel)]="config.configuracion.redondeoPor">
                      <mat-option value="LINEA">{{ 'billingConfig.byLine' | transloco }}</mat-option>
                      <mat-option value="DOCUMENTO">{{
                        'billingConfig.byDocument' | transloco
                      }}</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'billingConfig.currencyPrecision' | transloco }}</mat-label>
                    <mat-select [(ngModel)]="config.configuracion.precisionMoneda">
                      <mat-option [value]="0">0</mat-option>
                      <mat-option [value]="2">2</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'billingConfig.quantityPrecision' | transloco }}</mat-label>
                    <mat-select [(ngModel)]="config.configuracion.precisionCantidad">
                      <mat-option [value]="2">2</mat-option>
                      <mat-option [value]="3">3</mat-option>
                      <mat-option [value]="4">4</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'billingConfig.includesTax' | transloco }}</mat-label>
                    <mat-select [(ngModel)]="config.configuracion.preciosIncluyenImpuesto">
                      <mat-option [value]="false">{{ 'billingConfig.no' | transloco }}</mat-option>
                      <mat-option [value]="true">{{ 'billingConfig.yes' | transloco }}</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'billingConfig.graceDays' | transloco }}</mat-label>
                    <input
                      matInput
                      type="number"
                      min="0"
                      max="365"
                      [(ngModel)]="config.configuracion.diasGracia"
                      placeholder="0"
                    />
                  </mat-form-field>
                </div>
              </div>
              <div
                class="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end"
              >
                <button
                  mat-flat-button
                  class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5"
                  type="button"
                  [disabled]="saving()"
                  (click)="save(config.configuracion)"
                >
                  <mat-icon svgIcon="check" class="icon-size-4 mr-2"></mat-icon>
                  {{ 'common.save' | transloco }}
                </button>
              </div>
            </section>

            <section
              class="xl:col-span-6 flex flex-col justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs p-5 sm:p-6"
            >
              <div>
                <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'billingConfig.taxes' | transloco }}
                </h2>
                <p class="mt-1 mb-6 text-sm text-neutral-500 dark:text-neutral-400">
                  {{ 'billingConfig.taxesDescription' | transloco }}
                </p>
                <div class="space-y-3">
                  @for (tax of config.impuestos; track tax.id) {
                    <div
                      class="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 transition-all"
                    >
                      <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div class="sm:col-span-5">
                          <mat-form-field
                            appearance="outline"
                            class="w-full"
                            subscriptSizing="dynamic"
                          >
                            <mat-label>{{
                              'billingConfig.taxName' | transloco
                            }}</mat-label>
                            <input
                              matInput
                              [(ngModel)]="tax.nombre"
                              placeholder="ITBIS 18%"
                            />
                          </mat-form-field>
                        </div>
                        <div class="sm:col-span-3">
                          <mat-form-field
                            appearance="outline"
                            class="w-full"
                            subscriptSizing="dynamic"
                          >
                            <mat-label>{{
                              'billingConfig.rate' | transloco
                            }}</mat-label>
                            <input
                              matInput
                              type="number"
                              min="0"
                              max="100"
                              [(ngModel)]="tax.tasa"
                              placeholder="18"
                            />
                          </mat-form-field>
                        </div>
                        <div class="sm:col-span-4">
                          <mat-form-field
                            appearance="outline"
                            class="w-full"
                            subscriptSizing="dynamic"
                          >
                            <mat-label>{{
                              'billingConfig.dgiiIndicator' | transloco
                            }}</mat-label>
                            <mat-select [(ngModel)]="tax.indicadorFacturacion">
                              <mat-option value="1"
                                >1 ·
                                {{ 'billingConfig.taxable' | transloco }}</mat-option
                              >
                              <mat-option value="2"
                                >2 ·
                                {{ 'billingConfig.zeroRated' | transloco }}</mat-option
                              >
                              <mat-option value="4"
                                >4 ·
                                {{ 'billingConfig.exempt' | transloco }}</mat-option
                              >
                            </mat-select>
                          </mat-form-field>
                        </div>
                      </div>
                      <div
                        class="mt-3 pt-2.5 border-t border-neutral-200/50 dark:border-neutral-700/50 flex justify-end"
                      >
                        <button
                          mat-stroked-button
                          type="button"
                          class="rounded-lg"
                          [disabled]="saving()"
                          (click)="saveTax(tax)"
                        >
                          <mat-icon
                            svgIcon="check"
                            class="icon-size-4 mr-1.5 text-blue-600 dark:text-blue-400"
                          ></mat-icon>
                          {{ 'common.save' | transloco }}
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </section>
          </div>

          <section
            class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs p-5 sm:p-6"
          >
            <div class="mb-5">
              <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
                {{ 'billingConfig.paymentTerms' | transloco }}
              </h2>
              <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {{ 'billingConfig.description' | transloco }}
              </p>
            </div>
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              @for (term of config.terminosPago; track term.id) {
                <div
                  class="flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 transition-all"
                >
                  <div class="space-y-3">
                    <mat-form-field
                      appearance="outline"
                      class="w-full"
                      subscriptSizing="dynamic"
                    >
                      <mat-label>{{
                        'billingConfig.termName' | transloco
                      }}</mat-label>
                      <input
                        matInput
                        [(ngModel)]="term.nombre"
                        placeholder="Crédito 30 días"
                      />
                    </mat-form-field>
                    <mat-form-field
                      appearance="outline"
                      class="w-full"
                      subscriptSizing="dynamic"
                    >
                      <mat-label>{{
                        'billingConfig.days' | transloco
                      }}</mat-label>
                      <input
                        matInput
                        type="number"
                        min="0"
                        [(ngModel)]="term.diasCredito"
                        placeholder="30"
                      />
                    </mat-form-field>
                  </div>
                  <div
                    class="mt-4 pt-3 border-t border-neutral-200/50 dark:border-neutral-700/50 flex justify-end"
                  >
                    <button
                      mat-stroked-button
                      type="button"
                      class="w-full rounded-lg"
                      [disabled]="saving()"
                      (click)="saveTerm(term)"
                    >
                      <mat-icon
                        svgIcon="check"
                        class="icon-size-4 mr-1.5 text-blue-600 dark:text-blue-400"
                      ></mat-icon>
                      {{ 'common.save' | transloco }}
                    </button>
                  </div>
                </div>
              }
            </div>
          </section>
        </div>
      } @else {

        <div
          class="flex flex-auto flex-col items-center justify-center p-8 text-center sm:p-16 min-h-[420px]"
        >
          <img
            class="dark:hidden max-h-[180px] sm:max-h-[220px] mb-6 object-contain"
            alt="Sin configuración"
            src="illustrations/24.svg"
          />
          <img
            class="hidden dark:block max-h-[180px] sm:max-h-[220px] mb-6 object-contain"
            alt="Sin configuración"
            src="illustrations/28-dark.svg"
          />
          <h2
            class="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'billingConfig.emptyTitle' | transloco }}
          </h2>
          <p
            class="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400"
          >
            {{ 'billingConfig.emptyDescription' | transloco }}
          </p>
          <button
            mat-flat-button
            class="mt-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 inline-flex items-center gap-2 cursor-pointer"
            type="button"
            (click)="load()"
          >
            <mat-icon svgIcon="refresh-cw" class="icon-size-4"></mat-icon>
            <span>{{ 'common.retry' | transloco }}</span>
          </button>
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
  readonly loading = signal(true);
  readonly error = signal(false);
  private readonly api = `${environment.apiUrl}/billing-config`;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.http.get<BillingData>(this.api).subscribe({
      next: (value) => {
        this.data.set(value);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
        this.notice('billingConfig.loadError');
      },
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
