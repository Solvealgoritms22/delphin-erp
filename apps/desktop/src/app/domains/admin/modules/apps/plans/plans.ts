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

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'starter',
    nombre: 'Starter',
    descripcion: 'Para empezar a gestionar tu negocio.',
    precioMensual: 19,
    precioAnual: 17,
    caracteristicas: ['Hasta 5 miembros', 'Productos ilimitados', 'Soporte por correo'],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    descripcion: 'Para negocios en crecimiento.',
    precioMensual: 49,
    precioAnual: 44,
    destacado: true,
    caracteristicas: ['Hasta 50 miembros', 'Cuentas con sucursales', 'Reportes de actividad', 'Soporte prioritario'],
  },
  {
    id: 'enterprise',
    nombre: 'Enterprise',
    descripcion: 'Para empresas con necesidades avanzadas.',
    precioMensual: 119,
    precioAnual: 107,
    caracteristicas: ['Miembros ilimitados', 'Todo lo de Pro', 'Soporte dedicado', 'API avanzada'],
  },
];

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, TranslocoPipe],
  template: `
    <div class="flex h-full w-full flex-col flex-auto min-w-0 p-6 sm:p-10 overflow-y-auto overflow-x-hidden">

      <!-- Header with Back button -->
      <div class="flex items-center justify-start mb-6">
        <button (click)="goBack()"
                class="h-9 px-4 rounded-xl text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-xs">
          <mat-icon svgIcon="arrow-left" class="!w-4 !h-4 !text-[16px] text-neutral-500 dark:text-neutral-400"></mat-icon>
           {{ 'plans.back' | transloco }}
        </button>
      </div>

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
                   class="px-6 py-2 rounded-full text-sm font-medium transition-all z-10">{{ 'plans.monthly' | transloco }}</button>
          <button (click)="billingCycle = 'annual'"
                  [class.bg-white]="billingCycle === 'annual'"
                  [class.shadow-sm]="billingCycle === 'annual'"
                  [class.text-neutral-900]="billingCycle === 'annual'"
                  [class.dark:bg-neutral-900]="billingCycle === 'annual'"
                  [class.dark:text-white]="billingCycle === 'annual'"
                  [class.text-neutral-500]="billingCycle !== 'annual'"
                   class="px-6 py-2 rounded-full text-sm font-medium transition-all z-10">{{ 'plans.annual' | transloco }}</button>
        </div>
      </div>

      @if (isLoading()) {
        <!-- Skeleton Plan Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          @for (i of [1, 2, 3]; track i) {
            <div class="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 animate-pulse">
              <!-- Icon skeleton -->
              <div class="relative w-10 h-10 mb-6">
                <div class="w-7 h-7 rounded-full absolute top-0 left-0 bg-neutral-200 dark:bg-neutral-700"></div>
                <div class="w-7 h-7 rounded-full absolute top-0 left-3.5 bg-neutral-300 dark:bg-neutral-600"></div>
              </div>
              <!-- Title skeleton -->
              <div class="h-5 w-24 rounded-lg bg-neutral-200 dark:bg-neutral-700 mb-2"></div>
              <!-- Description skeleton -->
              <div class="h-3 w-40 rounded-lg bg-neutral-100 dark:bg-neutral-800 mb-4"></div>
              <!-- Price skeleton -->
              <div class="h-10 w-20 rounded-lg bg-neutral-200 dark:bg-neutral-700 mb-1"></div>
              <div class="h-3 w-32 rounded-lg bg-neutral-100 dark:bg-neutral-800 mb-8"></div>
              <!-- Button skeleton -->
              <div class="h-10 w-full rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-8"></div>
              <!-- Features skeleton -->
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
              <p class="text-xs text-neutral-500 mb-4">{{ plan.descripcion }}</p>
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
                        class="w-full py-3 mb-8 rounded-xl font-medium text-sm border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">
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
      <div class="text-center mb-24 flex items-center justify-center gap-4">
        <span class="text-neutral-500 text-sm">¿Necesitas un plan personalizado?</span>
        <a href="mailto:admin@dolphin-erp.com?subject=Consulta%20sobre%20plan%20personalizado&body=Hola%2C%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20un%20plan%20personalizado%20para%20mi%20empresa."
           class="px-4 py-1.5 rounded-lg text-sm font-medium border border-neutral-200 text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800 transition-colors">
           Contáctanos
        </a>
      </div>

      <!-- Compare Plans -->
      @if (!isLoading()) {
        <div class="mt-8">
          <h2 class="text-xl font-bold text-center text-neutral-900 dark:text-white mb-12">Comparar planes</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th class="w-1/4 pb-8 align-bottom"></th>
                  @for (plan of plans(); track plan.id) {
                    <th class="w-[18.75%] pb-8 px-4 align-bottom text-center">
                      <div class="flex flex-col items-center">
                        <span class="font-bold text-neutral-900 dark:text-white text-base">{{ plan.nombre }}</span>
                        <span class="text-neutral-500 text-xs font-normal mt-1 mb-4">$<ng-container>{{ billingCycle === 'monthly' ? plan.precioMensual : plan.precioAnual }}</ng-container> por mes</span>
                        @if (currentPlan().toLowerCase() === plan.nombre.toLowerCase()) {
                          <button class="w-full py-2 rounded-lg font-medium text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs">Plan actual</button>
                        } @else {
                          <button (click)="selectPlan(plan)"
                                  class="w-full py-2 rounded-lg font-medium text-xs border border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors">Seleccionar</button>
                        }
                      </div>
                    </th>
                  }
                </tr>
              </thead>
              <tbody class="text-sm divide-y divide-neutral-100 dark:divide-neutral-800/50">
                <tr>
                  <td class="py-6 font-bold text-base text-neutral-900 dark:text-white">Características</td>
                </tr>
                @for (feature of planFeatures(); track feature) {
                  <tr class="group">
                    <td class="py-4 text-neutral-600 dark:text-neutral-400">{{ feature }}</td>
                    @for (plan of plans(); track plan.id) {
                      <td class="py-4 px-4 text-center">
                        @if (plan.caracteristicas.includes(feature)) {
                          <mat-icon svgIcon="check" class="!w-5 !h-5 !text-[20px] text-blue-600 mx-auto"></mat-icon>
                        } @else {
                          <span class="text-neutral-300 dark:text-neutral-600">&ndash;</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
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

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/admin/billing']);
    }
  }

  planFeatures(): string[] {
    const set = new Set<string>();
    for (const p of this.plans()) {
      for (const f of p.caracteristicas) set.add(f);
    }
    return [...set];
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
    this.dialog.open(CheckoutDialogComponent, {
      width: '100%',
      maxWidth: '28rem',
      panelClass: 'dialog-panel-no-padding',
      data: {
        planId: plan.id,
        planNombre: plan.nombre,
        amount: this.billingCycle === 'monthly' ? plan.precioMensual : plan.precioAnual,
        billingCycle: this.billingCycle,
        simulated: this.simulatedMode(),
      } satisfies CheckoutDialogData,
    }).afterClosed().subscribe((result: CheckoutResult | null) => {
      if (result?.ok) {
        this.currentPlan.set(result.plan);
        window.alert(`Plan "${result.plan}" activado correctamente${result.simulated ? ' (pago simulado)' : ''}`);
      }
    });
  }
}
