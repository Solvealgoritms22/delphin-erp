import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { AuthState } from '@/app/core/auth/auth.state';
import { CheckoutDialogComponent, CheckoutDialogData, CheckoutResult } from './checkout-dialog.component';
import { TranslocoPipe } from '@jsverse/transloco';

interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  precioMensual: number;
  precioAnual: number;
  destacado?: boolean;
  caracteristicas: string[];
}

interface ComparisonRow {
  name: string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

interface ComparisonCategory {
  category: string;
  rows: ComparisonRow[];
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'starter',
    nombre: 'Starter',
    descripcion: 'Para pequeñas empresas que inician su gestión comercial.',
    precioMensual: 19,
    precioAnual: 17,
    caracteristicas: [
      '1 empresa incluida',
      'Hasta 5 usuarios incluidos',
      'Roles y permisos avanzados',
      'Catálogo de productos ilimitado',
      'Directorio de clientes y proveedores',
      'Asistente IA integrado',
      'Soporte por correo',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    descripcion: 'Para empresas en crecimiento con múltiples sucursales y negocios.',
    precioMensual: 49,
    precioAnual: 44,
    destacado: true,
    caracteristicas: [
      'Hasta 3 empresas incluidas',
      'Hasta 50 usuarios incluidos',
      'Hasta 5 sucursales por empresa',
      'Roles y permisos avanzados',
      'Catálogo de productos ilimitado',
      'Asistente IA con streaming',
      'Logs de auditoría y reportes',
      'Soporte prioritario',
    ],
  },
  {
    id: 'enterprise',
    nombre: 'Enterprise',
    descripcion: 'Para corporaciones con gestión multi-empresa ilimitada.',
    precioMensual: 119,
    precioAnual: 107,
    caracteristicas: [
      'Empresas ilimitadas (Multi-empresa)',
      'Usuarios y miembros ilimitados',
      'Sucursales ilimitadas',
      'Roles y permisos avanzados',
      'Catálogo de productos ilimitado',
      'Agente IA completo',
      'Soporte dedicado 24/7',
    ],
  },
];

const COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    category: 'Estructura Empresarial y Sucursales',
    rows: [
      { name: 'Empresas incluidas por cuenta', starter: '1 empresa', pro: 'Hasta 3 empresas', enterprise: 'Empresas ilimitadas' },
      { name: 'Sucursales y almacenes', starter: '1 sucursal', pro: 'Hasta 5 por empresa', enterprise: 'Ilimitadas' },
      { name: 'Gestión multi-empresa centralizada', starter: false, pro: true, enterprise: true },
      { name: 'Perfil y configuración fiscal (RNC / Cédula)', starter: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Equipo y Accesos',
    rows: [
      { name: 'Usuarios y miembros incluidos', starter: 'Hasta 5', pro: 'Hasta 50', enterprise: 'Ilimitados' },
      { name: 'Roles y permisos avanzados', starter: true, pro: true, enterprise: true },
      { name: 'Control de sesiones y accesos', starter: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Catálogos e Inventario',
    rows: [
      { name: 'Catálogo de productos y servicios', starter: 'Ilimitado', pro: 'Ilimitado', enterprise: 'Ilimitado' },
      { name: 'Gestión de categorías y marcas', starter: true, pro: true, enterprise: true },
      { name: 'Unidades de medida y códigos', starter: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Módulo Comercial',
    rows: [
      { name: 'Directorio de clientes y contactos', starter: true, pro: true, enterprise: true },
      { name: 'Directorio de proveedores y suplidores', starter: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Inteligencia Artificial (Dolphin AI)',
    rows: [
      { name: 'Asistente IA con chat y widget flotante', starter: true, pro: true, enterprise: true },
      { name: 'Streaming token a token en tiempo real', starter: true, pro: true, enterprise: true },
      { name: 'Consultas seguras de base de datos (solo lectura)', starter: true, pro: true, enterprise: true },
      { name: 'Resúmenes ejecutivos y análisis de negocio', starter: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Seguridad y Auditoría',
    rows: [
      { name: 'Registro de auditoría (Activity Logs)', starter: '7 días', pro: '90 días', enterprise: 'Historial completo' },
      { name: 'Exportación de reportes de auditoría', starter: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Soporte y Plataforma',
    rows: [
      { name: 'Soporte técnico', starter: 'Por correo', pro: 'Prioritario', enterprise: 'Dedicado 24/7' },
      { name: 'Actualizaciones continuas del sistema', starter: true, pro: true, enterprise: true },
      { name: 'Tema claro / oscuro y multi-idioma (ES/EN)', starter: true, pro: true, enterprise: true },
    ],
  },
];

@Component({
  selector: 'app-plans',
  standalone: true,
  host: {
    class: 'flex h-full w-full flex-col min-h-0 overflow-hidden',
  },
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, TranslocoPipe],
  template: `
    <div class="flex h-full w-full flex-col min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">

      <!-- Header with Back button (Pinned) -->
      <div class="shrink-0 flex items-center justify-start p-6 pb-4 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
        <button (click)="goBack()"
                class="h-9 px-4 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-xs cursor-pointer">
          <mat-icon svgIcon="arrow-left" class="!w-4 !h-4 !text-[16px] text-neutral-500 dark:text-neutral-400"></mat-icon>
           {{ 'plans.back' | transloco }}
        </button>
      </div>

      <!-- Central Scroll Container -->
      <div class="flex-auto min-h-0 overflow-y-auto p-6 sm:p-10 pb-16">

      <!-- Trial Banner -->
      @if (trialDaysLeft() !== null) {
        @if (trialExpired()) {
          <div class="mb-8 flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-5 py-4">
            <mat-icon svgIcon="alert-triangle" class="!w-5 !h-5 !text-[20px] text-red-500 shrink-0"></mat-icon>
            <div>
              <p class="text-sm font-semibold text-red-700 dark:text-red-400">{{ 'plans.trialExpired' | transloco }}</p>
              <p class="text-xs text-red-600 dark:text-red-500">{{ 'plans.trialExpiredDescription' | transloco }}</p>
            </div>
          </div>
        } @else {
          <div class="mb-8 flex items-center gap-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-5 py-4">
            <mat-icon svgIcon="clock" class="!w-5 !h-5 !text-[20px] text-blue-500 shrink-0"></mat-icon>
            <div>
              <p class="text-sm font-semibold text-blue-700 dark:text-blue-400">{{ 'plans.trialActive' | transloco }} <strong>{{ trialDaysLeft() }} {{ 'plans.days' | transloco }}</strong></p>
              <p class="text-xs text-blue-600 dark:text-blue-500">{{ 'plans.trialActiveDescription' | transloco }}</p>
            </div>
          </div>
        }
      }

      <!-- Top Section -->
      <div class="text-center mb-16">
        <h1 class="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-3">{{ 'plans.title' | transloco }}</h1>
        <p class="text-neutral-500 text-sm max-w-xl mx-auto leading-relaxed">{{ 'plans.description' | transloco }}</p>

        <!-- Toggle -->
        <div class="relative inline-flex items-center justify-center p-1 rounded-full bg-neutral-100 dark:bg-neutral-800 mt-16">
          
          <!-- Discount Badge & Arrow -->
          <div class="absolute -top-12 -right-4 flex flex-col items-center pointer-events-none">
            <span class="bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm tracking-wide">
              {{ 'plans.saveUpTo' | transloco }}
            </span>
            <svg class="w-6 h-6 text-neutral-400 -mt-0.5 ml-3 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2c0 5 6 7 10 12" />
              <path d="M12 14h4v-4" />
            </svg>
          </div>

          <button (click)="billingCycle = 'monthly'"
                  [class.bg-white]="billingCycle === 'monthly'"
                  [class.shadow-sm]="billingCycle === 'monthly'"
                  [class.text-neutral-900]="billingCycle === 'monthly'"
                  [class.dark:bg-neutral-900]="billingCycle === 'monthly'"
                  [class.dark:text-white]="billingCycle === 'monthly'"
                  [class.text-neutral-500]="billingCycle !== 'monthly'"
                   class="px-6 py-2 rounded-full text-sm font-medium transition-all z-10 cursor-pointer">{{ 'plans.monthly' | transloco }}</button>
          <button (click)="billingCycle = 'annual'"
                  [class.bg-white]="billingCycle === 'annual'"
                  [class.shadow-sm]="billingCycle === 'annual'"
                  [class.text-neutral-900]="billingCycle === 'annual'"
                  [class.dark:bg-neutral-900]="billingCycle === 'annual'"
                  [class.dark:text-white]="billingCycle === 'annual'"
                  [class.text-neutral-500]="billingCycle !== 'annual'"
                   class="px-6 py-2 rounded-full text-sm font-medium transition-all z-10 cursor-pointer">{{ 'plans.annual' | transloco }}</button>
        </div>
      </div>

      @if (isLoading()) {
        <!-- Skeleton Plan Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          @for (i of [1, 2, 3]; track i) {
            <div class="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 animate-pulse">
              <div class="relative w-10 h-10 mb-6">
                <div class="w-7 h-7 rounded-full absolute top-0 left-0 bg-neutral-200 dark:bg-neutral-700"></div>
                <div class="w-7 h-7 rounded-full absolute top-0 left-3.5 bg-neutral-300 dark:bg-neutral-600"></div>
              </div>
              <div class="h-5 w-24 rounded-lg bg-neutral-200 dark:bg-neutral-700 mb-2"></div>
              <div class="h-3 w-40 rounded-lg bg-neutral-100 dark:bg-neutral-800 mb-4"></div>
              <div class="h-10 w-20 rounded-lg bg-neutral-200 dark:bg-neutral-700 mb-1"></div>
              <div class="h-3 w-32 rounded-lg bg-neutral-100 dark:bg-neutral-800 mb-8"></div>
              <div class="h-10 w-full rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-8"></div>
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0"></div>
                  <div class="h-3 w-36 rounded-lg bg-neutral-100 dark:bg-neutral-800"></div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0"></div>
                  <div class="h-3 w-28 rounded-lg bg-neutral-100 dark:bg-neutral-800"></div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0"></div>
                  <div class="h-3 w-32 rounded-lg bg-neutral-100 dark:bg-neutral-800"></div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- Plans Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          @for (plan of plans(); track plan.id; let i = $index) {
            <div [class.border-blue-300]="plan.destacado"
                 [class.dark:border-blue-800]="plan.destacado"
                 class="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 hover:shadow-lg transition-shadow relative">

              @if (plan.destacado) {
                <div class="absolute top-8 right-8">
                  <span class="bg-blue-600 text-white text-xs font-medium px-2.5 py-1 rounded-lg">Popular</span>
                </div>
              }

              <!-- Icon -->
              <div class="relative w-10 h-10 mb-6">
                <div class="w-7 h-7 rounded-full absolute top-0 left-0 bg-blue-200 dark:bg-blue-800/40"></div>
                @if (i % 3 === 1) {
                  <div class="w-7 h-7 rounded-full absolute top-0 left-3.5 bg-blue-400 dark:bg-blue-700/50 mix-blend-multiply dark:mix-blend-lighten"></div>
                }
                @if (i % 3 === 2) {
                  <div class="w-7 h-7 rounded-full absolute top-0 left-3.5 bg-blue-400 dark:bg-blue-700/50 mix-blend-multiply dark:mix-blend-lighten"></div>
                  <div class="w-7 h-7 rounded-full absolute top-3 left-1.5 bg-blue-300 dark:bg-blue-900/30 mix-blend-multiply dark:mix-blend-lighten"></div>
                }
              </div>

              <h2 class="text-xl font-bold text-neutral-900 dark:text-white mb-2">{{ plan.nombre }}</h2>
              <p class="text-xs text-neutral-500 mb-4 min-h-[32px]">{{ plan.descripcion }}</p>
              <div class="flex items-baseline gap-1 mb-1">
                <span class="text-4xl font-extrabold text-neutral-900 dark:text-white">
                  $<ng-container>{{ billingCycle === 'monthly' ? plan.precioMensual : plan.precioAnual }}</ng-container>
                </span>
              </div>
              <p class="text-xs text-neutral-500 mb-8">por mes, facturado {{ billingCycle === 'monthly' ? 'mensualmente' : 'anualmente' }}</p>

              @if (currentPlan().toLowerCase() === plan.nombre.toLowerCase()) {
                <button class="w-full py-3 mb-8 rounded-xl font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs">
                  Plan actual
                </button>
              } @else {
                <button (click)="selectPlan(plan)"
                        class="w-full py-3 mb-8 rounded-xl font-medium text-sm border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                  Seleccionar
                </button>
              }

              <ul class="flex flex-col gap-y-3 flex-auto">
                @for (feature of plan.caracteristicas; track feature) {
                  <li class="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                    <mat-icon svgIcon="check" class="!w-4 !h-4 !text-[16px] text-blue-600 shrink-0 mt-0.5"></mat-icon>
                    {{ feature }}
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      }

      <!-- Contact Link -->
      <div class="text-center mb-20 flex items-center justify-center gap-4">
        <span class="text-neutral-500 text-sm">¿Necesitas un plan personalizado o mayor capacidad?</span>
        <a href="mailto:admin@dolphin-erp.com?subject=Consulta%20sobre%20plan%20personalizado&body=Hola%2C%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20un%20plan%20personalizado%20para%20mi%20empresa."
           class="px-4 py-1.5 rounded-lg text-sm font-medium border border-neutral-200 text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800 transition-colors">
           Contáctanos
        </a>
      </div>

      <!-- Real Features Comparator Matrix -->
      @if (!isLoading()) {
        <div class="mt-8">
          <h2 class="text-2xl font-bold text-center text-neutral-900 dark:text-white mb-2">Comparar capacidades reales del sistema</h2>
          <p class="text-center text-xs text-neutral-500 dark:text-neutral-400 mb-12">Detalle exacto de las funcionalidades incluidas en cada nivel de suscripción</p>
          
          <div class="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table class="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr class="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
                  <th class="w-2/5 p-5 text-sm font-semibold text-neutral-900 dark:text-white">Módulos y Funcionalidades</th>
                  <th class="w-1/5 p-5 text-center text-sm font-semibold text-neutral-900 dark:text-white">Starter ($19)</th>
                  <th class="w-1/5 p-5 text-center text-sm font-semibold text-blue-600 dark:text-blue-400">Pro ($49)</th>
                  <th class="w-1/5 p-5 text-center text-sm font-semibold text-neutral-900 dark:text-white">Enterprise ($119)</th>
                </tr>
              </thead>
              <tbody class="text-sm divide-y divide-neutral-100 dark:divide-neutral-800">
                @for (cat of comparisonCategories; track cat.category) {
                  <!-- Category Header Row -->
                  <tr class="bg-neutral-100/70 dark:bg-neutral-800/30">
                    <td colspan="4" class="py-3 px-5 font-bold text-xs uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      {{ cat.category }}
                    </td>
                  </tr>

                  <!-- Category Feature Rows -->
                  @for (row of cat.rows; track row.name) {
                    <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                      <td class="py-3.5 px-5 text-neutral-700 dark:text-neutral-300 font-medium">
                        {{ row.name }}
                      </td>
                      
                      <!-- Starter -->
                      <td class="py-3.5 px-5 text-center">
                        @if (isBoolean(row.starter)) {
                          @if (row.starter) {
                            <mat-icon svgIcon="check" class="!w-5 !h-5 !text-[20px] text-blue-600 mx-auto"></mat-icon>
                          } @else {
                            <span class="text-neutral-300 dark:text-neutral-600 font-bold">&ndash;</span>
                          }
                        } @else {
                          <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ row.starter }}</span>
                        }
                      </td>

                      <!-- Pro -->
                      <td class="py-3.5 px-5 text-center bg-blue-50/30 dark:bg-blue-950/10">
                        @if (isBoolean(row.pro)) {
                          @if (row.pro) {
                            <mat-icon svgIcon="check" class="!w-5 !h-5 !text-[20px] text-blue-600 mx-auto"></mat-icon>
                          } @else {
                            <span class="text-neutral-300 dark:text-neutral-600 font-bold">&ndash;</span>
                          }
                        } @else {
                          <span class="text-xs font-semibold text-blue-700 dark:text-blue-300">{{ row.pro }}</span>
                        }
                      </td>

                      <!-- Enterprise -->
                      <td class="py-3.5 px-5 text-center">
                        @if (isBoolean(row.enterprise)) {
                          @if (row.enterprise) {
                            <mat-icon svgIcon="check" class="!w-5 !h-5 !text-[20px] text-blue-600 mx-auto"></mat-icon>
                          } @else {
                            <span class="text-neutral-300 dark:text-neutral-600 font-bold">&ndash;</span>
                          }
                        } @else {
                          <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ row.enterprise }}</span>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }
      </div>
    </div>
  `,
})
export class PlansComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private location = inject(Location);
  private router = inject(Router);
  private authState = inject(AuthState);

  billingCycle: 'monthly' | 'annual' = 'monthly';
  isLoading = signal(true);
  plans = signal<Plan[]>([]);
  currentPlan = signal<string>('');
  simulatedMode = signal(false);
  trialDaysLeft = signal<number | null>(null);
  trialExpired = signal(false);

  comparisonCategories = COMPARISON_CATEGORIES;

  isBoolean(val: any): boolean {
    return typeof val === 'boolean';
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/admin/billing']);
    }
  }

  ngOnInit() {
    // Load subscription status (trial info)
    this.http.get<any>(`${environment.apiUrl}/empresas/subscription`).subscribe({
      next: (sub) => {
        if (sub?.estado === 'TRIAL' && sub?.fechaRenovacion) {
          const expiry = new Date(sub.fechaRenovacion);
          const now = new Date();
          const diffMs = expiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            this.trialDaysLeft.set(diffDays);
            this.trialExpired.set(false);
          } else {
            this.trialDaysLeft.set(0);
            this.trialExpired.set(true);
          }
        }
      },
      error: () => {} // No trial info, silently ignore
    });

    this.http.get<any>(`${environment.apiUrl}/empresas/plans`).subscribe({
      next: (data) => {
        let loadedPlans: Plan[] = [];
        if (Array.isArray(data)) {
          loadedPlans = data;
        } else if (Array.isArray(data?.value)) {
          loadedPlans = data.value;
        }
        // Filter out the 'trial' plan from the UI (it's internal)
        loadedPlans = loadedPlans.filter(p => p.id !== 'trial');
        this.plans.set(loadedPlans.length > 0 ? loadedPlans : DEFAULT_PLANS);
        this.isLoading.set(false);
      },
      error: () => {
        this.plans.set(DEFAULT_PLANS);
        this.isLoading.set(false);
      }
    });

    this.currentPlan.set(this.authState.user()?.plan || '');

    this.http.get<any>(`${environment.apiUrl}/payments/config`).subscribe({
      next: (config) => this.simulatedMode.set(config?.simulated ?? true),
      error: () => this.simulatedMode.set(true),
    });
  }

  selectPlan(plan: Plan) {
    const dialogRef = this.dialog.open(CheckoutDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        planId: plan.id,
        planNombre: plan.nombre,
        amount: this.billingCycle === 'monthly' ? plan.precioMensual : plan.precioAnual,
        billingCycle: this.billingCycle,
        simulated: this.simulatedMode(),
      } as CheckoutDialogData,
    });

    dialogRef.afterClosed().subscribe((result: CheckoutResult | null) => {
      if (result?.ok) {
        this.currentPlan.set(plan.nombre);
        this.router.navigate(['/admin/billing']);
      }
    });
  }
}
