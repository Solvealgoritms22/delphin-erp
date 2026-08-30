import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ApiAccessService,
  TenantApiAppItem,
} from './api-access.service';

@Component({
  selector: 'app-api-access',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">

      <!-- Header -->
      <div
        class="relative flex flex-0 shrink-0 flex-col border-b border-neutral-200 bg-white px-6 py-8 sm:flex-row sm:items-center sm:justify-between md:px-8 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
              {{ 'settings.apiAccess.title' | transloco }}
            </h1>
            <span
              *ngIf="isEnterprise()"
              class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50"
            >
              <mat-icon svgIcon="award" class="icon-size-3.5"></mat-icon>
              Enterprise
            </span>
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'settings.apiAccess.subtitle' | transloco }}
          </p>
        </div>

        <!-- Action button -->
        <div *ngIf="isEnterprise()" class="mt-6 flex items-center gap-3 sm:mt-0">
          <button
            (click)="openCreateModal()"
            [disabled]="appsCount() >= 2"
            class="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <mat-icon svgIcon="plus" class="icon-size-4"></mat-icon>
            {{ 'settings.apiAccess.newApp' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-auto min-h-0 overflow-y-auto p-6 md:p-8">

        <!-- Loading Skeleton -->
        <div *ngIf="apiService.loading()" class="flex flex-col gap-6 animate-pulse select-none" aria-hidden="true">
          <div class="h-20 rounded-2xl bg-neutral-200 dark:bg-neutral-800"></div>
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            @for (i of [1, 2]; track i) {
              <div class="rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 flex flex-col gap-4">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-xl bg-neutral-200 dark:bg-neutral-800"></div>
                  <div class="flex flex-col gap-1.5 flex-1">
                    <div class="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                    <div class="h-3 w-24 rounded bg-neutral-100 dark:bg-neutral-800"></div>
                  </div>
                </div>
                <div class="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 mt-2"></div>
                <div class="h-4 w-40 rounded bg-neutral-100 dark:bg-neutral-800 mt-4"></div>
              </div>
            }
          </div>
        </div>

        <div *ngIf="!apiService.loading()">

          <!-- ================= NON-ENTERPRISE SHOWCASE CARD ================= -->
          <div *ngIf="!isEnterprise()" class="mx-auto max-w-3xl flex flex-col items-center justify-center py-10">
            <div class="w-full rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-center flex flex-col items-center">
              
              <!-- Plan Icon (3 Overlapping Circles) -->
              <div class="relative w-12 h-12 mb-6">
                <div class="w-8 h-8 rounded-full absolute top-0 left-0 bg-blue-200 dark:bg-blue-800/40"></div>
                <div class="w-8 h-8 rounded-full absolute top-0 left-4 bg-blue-500 dark:bg-blue-600/60 mix-blend-multiply dark:mix-blend-lighten"></div>
                <div class="w-8 h-8 rounded-full absolute top-3.5 left-2 bg-blue-400 dark:bg-blue-700/50 mix-blend-multiply dark:mix-blend-lighten"></div>
              </div>

              <span class="rounded-full bg-amber-100 dark:bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 mb-3">
                {{ 'settings.apiAccess.enterpriseOnly' | transloco }}
              </span>

              <h2 class="text-2xl font-extrabold text-neutral-900 dark:text-white max-w-lg">
                {{ 'settings.apiAccess.unlockTitle' | transloco }}
              </h2>

              <p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
                {{ 'settings.apiAccess.unlockDescription' | transloco }}
              </p>

              <!-- Feature bullet grid -->
              <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
                <div class="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 p-4">
                  <div class="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-white mb-1">
                    <mat-icon svgIcon="shield-check" class="icon-size-4 text-neutral-500 dark:text-neutral-400"></mat-icon>
                    Seguridad por API Key
                  </div>
                  <p class="text-[11px] text-neutral-500 leading-normal">Claves cifradas en SHA-256 con revocación y rotación instantánea.</p>
                </div>

                <div class="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 p-4">
                  <div class="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-white mb-1">
                    <mat-icon svgIcon="globe" class="icon-size-4 text-neutral-500 dark:text-neutral-400"></mat-icon>
                    Máx. 2 Orígenes
                  </div>
                  <p class="text-[11px] text-neutral-500 leading-normal">Conecta hasta 2 aplicaciones o sistemas externos simultáneos.</p>
                </div>

                <div class="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 p-4">
                  <div class="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-white mb-1">
                    <mat-icon svgIcon="database" class="icon-size-4 text-neutral-500 dark:text-neutral-400"></mat-icon>
                    Acceso a Datos en Vivo
                  </div>
                  <p class="text-[11px] text-neutral-500 leading-normal">Catálogo de productos, facturas emitidas, clientes e inventario.</p>
                </div>
              </div>

              <!-- Upgrade CTA -->
              <button
                (click)="goToPlans()"
                class="mt-8 flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all cursor-pointer"
              >
                <mat-icon svgIcon="rocket" class="icon-size-4"></mat-icon>
                {{ 'settings.apiAccess.upgradeCta' | transloco }}
              </button>
            </div>
          </div>

          <!-- ================= ENTERPRISE ACTIVE VIEW ================= -->
          <div *ngIf="isEnterprise()" class="flex flex-col gap-8 max-w-6xl">

            <!-- Usage Info Card -->
            <div class="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 dark:border-blue-900/40 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-3.5">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <mat-icon svgIcon="info" class="icon-size-5"></mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-neutral-900 dark:text-white">
                    {{ 'settings.apiAccess.connectedApps' | transloco }}: {{ appsCount() }} / 2
                  </h3>
                  <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                    {{ 'settings.apiAccess.originsLimitNotice' | transloco }}
                  </p>
                </div>
              </div>

              <button
                (click)="openCreateModal()"
                [disabled]="appsCount() >= 2"
                class="shrink-0 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
              >
                <mat-icon svgIcon="plus" class="icon-size-3.5"></mat-icon>
                {{ 'settings.apiAccess.addApplication' | transloco }}
              </button>
            </div>

            <!-- Apps List -->
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div
                *ngFor="let app of appsList()"
                class="flex flex-col justify-between rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div>
                  <!-- Top Row: Name and Menu -->
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        <mat-icon svgIcon="box" class="icon-size-5"></mat-icon>
                      </div>
                      <div>
                        <h3 class="text-base font-bold text-neutral-900 dark:text-white">{{ app.nombre }}</h3>
                        <span class="text-xs text-neutral-400">Creada el {{ app.creadoEn | date:'dd/MM/yyyy' }}</span>
                      </div>
                    </div>

                    <!-- Status badge -->
                    <span
                      class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      [class]="app.estado === 'ACTIVO'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'"
                    >
                      {{ app.estado }}
                    </span>
                  </div>

                  <!-- Description -->
                  <p *ngIf="app.descripcion" class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                    {{ app.descripcion }}
                  </p>

                  <!-- API Key Preview Box -->
                  <div class="mt-4 flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/60">
                    <div class="flex items-center gap-2">
                      <mat-icon svgIcon="key" class="icon-size-3.5 text-neutral-400"></mat-icon>
                      <span class="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {{ app.apiKeyPrefix }}
                      </span>
                    </div>
                    <button
                      (click)="rotateKey(app)"
                      class="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                    >
                      Rotar
                    </button>
                  </div>

                  <!-- Allowed Origins -->
                  <div class="mt-4 flex flex-col gap-1.5">
                    <span class="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Orígenes autorizados:</span>
                    <div *ngIf="app.allowedOrigins.length === 0" class="text-xs text-neutral-400 italic">
                      Todos los orígenes permitidos (*)
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        *ngFor="let origin of app.allowedOrigins"
                        class="rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {{ origin }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Footer: Usage & Actions -->
                <div class="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <div class="flex items-center gap-4 text-xs text-neutral-400">
                    <span>{{ app.requestCount }} peticiones</span>
                    <span>·</span>
                    <span>Último uso: {{ app.lastUsedAt ? (app.lastUsedAt | date:'dd/MM HH:mm') : 'Nunca' }}</span>
                  </div>

                  <div class="flex items-center gap-1">
                    <button
                      *ngIf="app.estado === 'ACTIVO'"
                      (click)="revokeKey(app)"
                      class="rounded-lg px-2.5 py-1 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
                    >
                      Revocar
                    </button>
                    <button
                      (click)="deleteApp(app)"
                      class="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State if no apps created -->
            <div *ngIf="appsList().length === 0" class="rounded-3xl border border-dashed border-neutral-200 p-12 text-center dark:border-neutral-800 flex flex-col items-center">
              <img
                src="illustrations/18.svg"
                alt="Sin aplicaciones registradas"
                class="max-h-[120px] w-auto select-none pointer-events-none drop-shadow-2xs mb-4"
              />
              <h3 class="text-base font-bold text-neutral-900 dark:text-white">Aún no tienes aplicaciones registradas</h3>
              <p class="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">Crea tu primera integración API para conectar tu tienda virtual o app externa.</p>
              <button
                (click)="openCreateModal()"
                class="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
              >
                <mat-icon svgIcon="plus" class="icon-size-4"></mat-icon>
                Crear Integración
              </button>
            </div>

            <!-- Developer Quick Start / API Reference Card -->
            <div class="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
              <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                <mat-icon svgIcon="terminal" class="icon-size-5 text-blue-600"></mat-icon>
                Guía Rápida de Integración API REST
              </h3>
              <p class="text-xs text-neutral-500 mb-4">
                Envía el header <code class="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-blue-600 font-mono">X-API-Key: tu_clave_secreta</code> en cada petición HTTP.
              </p>

              <div class="flex flex-col gap-3 font-mono text-xs">
                <div class="rounded-xl bg-neutral-900 text-neutral-100 p-4 overflow-x-auto">
                  <span class="text-neutral-500"># 1. Consultar Catálogo de Productos</span><br />
                  <span class="text-emerald-400">curl</span> -X GET "http://localhost:3000/public/v1/tenant/products?limit=10" &#92;<br />
                  &nbsp;&nbsp;-H <span class="text-amber-300">"X-API-Key: dlph_live_..."</span>
                </div>

                <div class="rounded-xl bg-neutral-900 text-neutral-100 p-4 overflow-x-auto">
                  <span class="text-neutral-500"># 2. Consultar Facturas Emitidas</span><br />
                  <span class="text-emerald-400">curl</span> -X GET "http://localhost:3000/public/v1/tenant/invoices?estado=EMITIDA" &#92;<br />
                  &nbsp;&nbsp;-H <span class="text-amber-300">"X-API-Key: dlph_live_..."</span>
                </div>

                <div class="rounded-xl bg-neutral-900 text-neutral-100 p-4 overflow-x-auto">
                  <span class="text-neutral-500"># 3. Consultar Directorio de Clientes</span><br />
                  <span class="text-emerald-400">curl</span> -X GET "http://localhost:3000/public/v1/tenant/clients" &#92;<br />
                  &nbsp;&nbsp;-H <span class="text-amber-300">"X-API-Key: dlph_live_..."</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      <!-- ================= MODAL: CREATE APPLICATION ================= -->
      <ng-template #createModalTemplate>
        <div class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
          
          <div class="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
            <h3 class="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="plus-circle" class="icon-size-5 text-blue-600"></mat-icon>
              Nueva Aplicación API
            </h3>
            <button
              (click)="closeModal()"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="flex flex-col gap-4 overflow-y-auto p-6">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-neutral-700 dark:text-neutral-300">Nombre de la Aplicación *</label>
              <input
                type="text"
                [(ngModel)]="newAppNombre"
                placeholder="ej: Tienda Shopify, App Móvil B2B"
                class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-neutral-700 dark:text-neutral-300">Descripción (Opcional)</label>
              <textarea
                [(ngModel)]="newAppDesc"
                rows="2"
                placeholder="Breve detalle del propósito de esta integración..."
                class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2.5 text-sm font-medium text-neutral-900 dark:text-white focus:border-blue-500 focus:outline-none resize-none"
              ></textarea>
            </div>

            <!-- Origins limit (Max 2) -->
            <div class="flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-neutral-700 dark:text-neutral-300">Orígenes / Dominios Autorizados (Máx. 2)</label>
                <span class="text-[10px] text-neutral-400 font-semibold">Opcional para restringir CORS</span>
              </div>

              <input
                type="text"
                [(ngModel)]="origin1"
                placeholder="https://mitienda.com"
                class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2 text-xs font-mono text-neutral-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />

              <input
                type="text"
                [(ngModel)]="origin2"
                placeholder="https://admin.mitienda.com"
                class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-2 text-xs font-mono text-neutral-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <button
              (click)="closeModal()"
              class="rounded-xl px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              (click)="submitCreateApp()"
              [disabled]="!newAppNombre.trim()"
              class="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              Generar Clave API
            </button>
          </div>
        </div>
      </ng-template>

      <!-- ================= MODAL: SHOW GENERATED KEY (ONE TIME) ================= -->
      <ng-template #secretKeyModalTemplate>
        <div class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
          
          <div class="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
            <h3 class="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="key" class="icon-size-5 text-emerald-600"></mat-icon>
              Clave API Generada
            </h3>
            <button
              (click)="closeModal()"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="flex flex-col gap-4 p-6">
            <!-- Warning Alert -->
            <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
              <mat-icon svgIcon="alert-triangle" class="icon-size-4 shrink-0 text-amber-600"></mat-icon>
              <span>
                <strong>¡Importante!</strong> Guarda esta clave secreta ahora en tu servidor o bóveda segura. <strong>Por motivos de seguridad, no podrás volver a consultarla después de cerrar esta ventana.</strong>
              </span>
            </div>

            <!-- Secret Key Display Box -->
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-neutral-500">Tu Clave API Secreta:</label>
              <div class="flex items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-neutral-100 p-3.5 dark:border-neutral-700 dark:bg-neutral-800">
                <span class="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 break-all select-all">
                  {{ generatedRawKey }}
                </span>
                <button
                  (click)="copyRawKey()"
                  class="flex shrink-0 items-center gap-1.5 rounded-xl bg-white dark:bg-neutral-700 px-3 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 shadow-xs hover:bg-neutral-50 cursor-pointer"
                >
                  <mat-icon svgIcon="copy" class="icon-size-3.5"></mat-icon>
                  Copiar
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <button
              (click)="closeModal()"
              class="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
            >
              Entendido y Guardado
            </button>
          </div>
        </div>
      </ng-template>

    </div>
  `,
})
export default class ApiAccessComponent implements OnInit {
  apiService = inject(ApiAccessService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  @ViewChild('createModalTemplate') createModalTemplate!: TemplateRef<any>;
  @ViewChild('secretKeyModalTemplate') secretKeyModalTemplate!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  newAppNombre = '';
  newAppDesc = '';
  origin1 = '';
  origin2 = '';
  generatedRawKey = '';

  isEnterprise = computed(() => !!this.apiService.data()?.isEnterprise);
  appsList = computed(() => this.apiService.data()?.apps || []);
  appsCount = computed(() => this.appsList().length);

  ngOnInit(): void {
    this.apiService.loadApps().subscribe();
  }

  goToPlans(): void {
    this.router.navigate(['/admin/plans']);
  }

  openCreateModal(): void {
    this.newAppNombre = '';
    this.newAppDesc = '';
    this.origin1 = '';
    this.origin2 = '';

    this.dialogRef = this.dialog.open(this.createModalTemplate, {
      width: '540px',
      maxWidth: '95vw',
      panelClass: ['custom-dialog-container'],
      autoFocus: false,
    });
  }

  submitCreateApp(): void {
    const origins: string[] = [];
    if (this.origin1.trim()) origins.push(this.origin1.trim());
    if (this.origin2.trim()) origins.push(this.origin2.trim());

    this.apiService
      .createApp({
        nombre: this.newAppNombre.trim(),
        descripcion: this.newAppDesc.trim() || undefined,
        allowedOrigins: origins.length > 0 ? origins : undefined,
      })
      .subscribe({
        next: (res) => {
          this.dialogRef?.close();
          this.generatedRawKey = res.rawApiKey;
          this.openSecretKeyModal();
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Error al registrar aplicación API.',
            'Cerrar',
            { duration: 4000 },
          );
        },
      });
  }

  openSecretKeyModal(): void {
    this.dialogRef = this.dialog.open(this.secretKeyModalTemplate, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: ['custom-dialog-container'],
      disableClose: true,
    });
  }

  copyRawKey(): void {
    if (navigator?.clipboard && this.generatedRawKey) {
      navigator.clipboard.writeText(this.generatedRawKey);
      this.snackBar.open('Clave API copiada al portapapeles', 'Cerrar', { duration: 2500 });
    }
  }

  rotateKey(app: TenantApiAppItem): void {
    if (confirm(`¿Estás seguro de rotar la clave para '${app.nombre}'? La clave actual dejará de funcionar inmediatamente.`)) {
      this.apiService.rotateKey(app.id).subscribe({
        next: (res) => {
          this.generatedRawKey = res.rawApiKey;
          this.openSecretKeyModal();
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Error al rotar clave API.',
            'Cerrar',
            { duration: 4000 },
          );
        },
      });
    }
  }

  revokeKey(app: TenantApiAppItem): void {
    if (confirm(`¿Estás seguro de revocar el acceso de '${app.nombre}'?`)) {
      this.apiService.revokeApp(app.id).subscribe({
        next: () => {
          this.snackBar.open('Clave API revocada con éxito', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Error al revocar clave API.',
            'Cerrar',
            { duration: 4000 },
          );
        },
      });
    }
  }

  deleteApp(app: TenantApiAppItem): void {
    if (confirm(`¿Estás seguro de eliminar la integración '${app.nombre}'?`)) {
      this.apiService.deleteApp(app.id).subscribe({
        next: () => {
          this.snackBar.open('Integración eliminada correctamente', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || 'Error al eliminar integración.',
            'Cerrar',
            { duration: 4000 },
          );
        },
      });
    }
  }

  closeModal(): void {
    this.dialogRef?.close();
  }
}
