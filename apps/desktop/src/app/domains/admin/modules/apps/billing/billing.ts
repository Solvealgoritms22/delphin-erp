import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '@/environments/environment';
import { ConfirmDialogComponent, ConfirmDialogData } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { PaymentCardsService, PaymentCard } from './payment-cards.service';
import { CardDialogComponent } from './card-dialog.component';
import { ManageCardsDialogComponent } from './manage-cards-dialog.component';
import { AuthState } from '@/app/core/auth/auth.state';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, DatePipe, TranslocoPipe],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">
      <!-- Header (Pinned) -->
      <div class="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
        <div>
           <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{{ 'billingPage.title' | transloco }}</h1>
           <p class="mt-1 text-sm text-neutral-500">{{ 'billingPage.description' | transloco }}</p>
        </div>
        <div class="mt-4 sm:mt-0">
          <button mat-stroked-button class="rounded-lg border-neutral-300 dark:border-neutral-700" (click)="goToPlans()">
            <mat-icon svgIcon="arrow-up-right" class="!w-4 !h-4 !text-[16px] mr-2 text-neutral-500"></mat-icon>
             {{ 'billingPage.changePlan' | transloco }}
          </button>
        </div>
      </div>

      <!-- Central Scroll Container -->
      <div class="flex-auto min-h-0 overflow-y-auto p-6 sm:p-10 pb-16">

      @if (isLoading()) {
        <div class="flex items-center justify-center p-16">
           <div class="text-neutral-500 font-medium">{{ 'billingPage.loading' | transloco }}</div>
        </div>
      } @else {
        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Left Column: Current Plan -->
          <div class="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div class="p-6 flex-auto">
              <!-- Icon -->
              <div class="flex items-center mb-6">
                <div class="relative w-10 h-10">
                  <div class="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 mix-blend-multiply dark:mix-blend-lighten"></div>
                  <div class="absolute left-2 top-2 w-8 h-8 rounded-full bg-blue-400 dark:bg-blue-700/50 mix-blend-multiply dark:mix-blend-lighten"></div>
                </div>
              </div>

              <div class="flex justify-between items-start">
                <div>
                  <div class="flex items-center gap-3">
                    <h2 class="text-xl font-bold text-neutral-900 dark:text-white">{{ plan() }}</h2>
                    <span [class.bg-emerald-100]="estado() === 'ACTIVA'"
                          [class.dark:bg-emerald-500/10]="estado() === 'ACTIVA'"
                          [class.text-emerald-800]="estado() === 'ACTIVA'"
                          [class.dark:text-emerald-400]="estado() === 'ACTIVA'"
                          [class.bg-red-100]="estado() !== 'ACTIVA'"
                          [class.text-red-700]="estado() !== 'ACTIVA'"
                          class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-neutral-200 dark:border-neutral-700">
                      <span class="w-1.5 h-1.5 rounded-full"
                            [class.bg-emerald-600]="estado() === 'ACTIVA'"
                            [class.dark:bg-emerald-400]="estado() === 'ACTIVA'"
                            [class.bg-red-500]="estado() !== 'ACTIVA'"></span>
                       {{ estado() === 'ACTIVA' ? ('common.active' | transloco) : estado() }}
                    </span>
                  </div>
                  <div class="mt-2 flex flex-col gap-1">
                    @if (propietarioEmail()) {
                      <p class="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                        <mat-icon svgIcon="user" class="!w-3.5 !h-3.5 !text-[14px] text-neutral-400 dark:text-neutral-500"></mat-icon>
                        {{ propietarioEmail() }}
                      </p>
                    }
                    @if (tenantId()) {
                      <p class="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <span class="font-medium text-neutral-400 dark:text-neutral-500">Tenant ID:</span>
                        <span class="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700 select-all">{{ tenantId() }}</span>
                      </p>
                    }
                  </div>
                </div>
              </div>

              <div class="mt-8">
                <div class="flex justify-between text-sm mb-2">
                   <span class="font-medium text-neutral-900 dark:text-white">{{ 'billingPage.members' | transloco }}</span>
                   <span class="text-neutral-500">{{ memberCount() }} / {{ memberLimit() }}</span>
                </div>
                <div class="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                   <div class="h-full bg-neutral-900 dark:bg-white rounded-full transition-all" [style.width.%]="memberUsagePercent()"></div>
                </div>
                <div class="mt-4 flex justify-end">
                  <button (click)="manageMembers()"
                          class="h-9 px-4 rounded-lg text-sm border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <mat-icon svgIcon="users" class="!w-4 !h-4 !text-[16px] mr-2 text-neutral-500"></mat-icon>
                     {{ 'billingPage.manageMembers' | transloco }}
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
              <button (click)="cancelSubscription()"
                      class="py-4 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                 {{ 'billingPage.cancelSubscription' | transloco }}
              </button>
              @if (!isEnterprise()) {
                <button (click)="goToPlans()"
                        class="py-4 text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">
                   {{ 'billingPage.upgrade' | transloco }}
                  <mat-icon svgIcon="arrow-up-right" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                </button>
              } @else {
                <span class="py-4 text-sm font-medium text-neutral-400 dark:text-neutral-500 italic flex items-center justify-center gap-1.5">
                   {{ 'billingPage.maxPlan' | transloco }}
                </span>
              }
            </div>
          </div>

          <!-- Right Column: Payment Methods -->
          <div class="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div class="p-6 flex-auto">
               <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ 'billingPage.paymentMethods' | transloco }}</h2>
               <p class="mt-1 text-sm text-neutral-500 mb-6">{{ 'billingPage.paymentDescription' | transloco }}</p>

              @if (cards().length === 0) {
                <div class="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                  <img src="illustrations/credit_card_illustration.svg" alt="Sin métodos de pago" class="w-32 h-auto mb-2" />
                   <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ 'billingPage.noPaymentMethods' | transloco }}</p>
                </div>
              } @else {
                <div class="flex flex-col gap-3">
                  @for (card of cards(); track card.id) {
                    <div class="flex items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800"
                         [ngClass]="{'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50': card.isPrimary}">
                      <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center w-12 h-8 rounded shrink-0 overflow-hidden" 
                             [ngClass]="card.marca === 'Visa' || card.marca === 'Mastercard' ? 'bg-transparent' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'">
                          
                          <img *ngIf="card.marca === 'Visa'" src="brand-logos/visa.svg" class="h-6 w-auto object-contain dark:brightness-0 dark:invert" alt="Visa" />
                          
                          <div *ngIf="card.marca === 'Mastercard'" class="flex items-center justify-center">
                            <div class="w-6 h-6 rounded-full bg-[#EB001B] opacity-90 mix-blend-multiply dark:mix-blend-normal"></div>
                            <div class="w-6 h-6 rounded-full bg-[#F79E1B] opacity-90 mix-blend-multiply dark:mix-blend-normal -ml-2.5"></div>
                          </div>
                          
                          <mat-icon *ngIf="card.marca !== 'Visa' && card.marca !== 'Mastercard'" svgIcon="credit-card" class="!w-5 !h-5 !text-[20px]"></mat-icon>
                        </div>
                        <div class="flex flex-col">
                          <div class="flex items-center gap-2">
                            <p class="text-sm font-medium text-neutral-900 dark:text-white">{{ card.nombre }}</p>
                            <span *ngIf="card.isPrimary" class="text-[10px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wide">
                               {{ 'billingPage.primary' | transloco }}
                            </span>
                          </div>
                          <p class="text-xs text-neutral-500">{{ card.marca }} • {{ card.numeroEnmascarado }} • Exp. {{ card.expiracion }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        <button *ngIf="!card.isPrimary" (click)="setPrimary(card)"
                                mat-button class="text-xs text-neutral-500 hover:text-blue-600 hidden sm:inline-flex px-2 min-w-0 h-8">
                           {{ 'billingPage.makePrimary' | transloco }}
                        </button>
                        <button (click)="removeCard(card)"
                                mat-icon-button class="text-neutral-400 hover:text-red-600 !w-8 !h-8"
                                [attr.aria-label]="'Eliminar tarjeta ' + card.nombre">
                          <mat-icon svgIcon="trash" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
              <button (click)="manageCards()"
                      class="py-4 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                 {{ 'billingPage.manageCards' | transloco }}
              </button>
              <button (click)="openCardDialog()"
                      class="py-4 text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">
                <mat-icon svgIcon="plus" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                 {{ 'billingPage.newCard' | transloco }}
              </button>
            </div>
          </div>
        </div>

        <!-- Invoices Table -->
        <div class="mt-8 overflow-x-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <div class="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
             <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ 'billingPage.invoices' | transloco }}</h2>
          </div>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                 <th class="py-3.5 px-6">{{ 'billingPage.invoice' | transloco }}</th>
                 <th class="py-3.5 px-6">{{ 'billingPage.date' | transloco }}</th>
                 <th class="py-3.5 px-6">{{ 'billingPage.amount' | transloco }}</th>
                 <th class="py-3.5 px-6">{{ 'billingPage.plan' | transloco }}</th>
                 <th class="py-3.5 px-6 text-right">{{ 'common.actions' | transloco }}</th>
              </tr>
            </thead>
            <tbody class="text-sm divide-y divide-neutral-100 dark:divide-neutral-800/50">
              @if (invoices().length === 0) {
                <tr>
                  <td colspan="5" class="py-12 text-center">
                    <div class="flex flex-col items-center justify-center gap-3 py-6">
                      <div class="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 mb-1 shadow-xs">
                        <mat-icon svgIcon="file-text" class="!w-8 !h-8 !text-[32px] text-neutral-400 dark:text-neutral-500"></mat-icon>
                      </div>
                       <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ 'billingPage.noInvoices' | transloco }}</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (inv of invoices(); track inv.id) {
                  <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td class="py-4 px-6 whitespace-nowrap">
                      <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 shrink-0">
                          <mat-icon svgIcon="file-text" class="!w-5 !h-5 !text-[20px]"></mat-icon>
                        </div>
                        <span class="font-medium text-neutral-900 dark:text-white">{{ inv.numero }}</span>
                      </div>
                    </td>
                    <td class="py-4 px-6 text-neutral-500 whitespace-nowrap">{{ inv.fecha | date: 'mediumDate' }}</td>
                    <td class="py-4 px-6 text-neutral-900 dark:text-white whitespace-nowrap">$<ng-container>{{ inv.monto }}</ng-container></td>
                    <td class="py-4 px-6 text-neutral-500 whitespace-nowrap">{{ inv.plan }}</td>
                    <td class="py-4 px-6 whitespace-nowrap text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button (click)="viewInvoice(inv)"
                                class="h-8 px-3 min-w-0 rounded-lg text-xs border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Ver</button>
                        <button (click)="downloadInvoice(inv)"
                                class="h-8 w-8 rounded-lg border border-neutral-300 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400"
                                [attr.aria-label]="'Descargar factura ' + inv.numero">
                          <mat-icon svgIcon="download" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
      </div>
    </div>
  `,
})
export class BillingComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cardsService = inject(PaymentCardsService);
  private authState = inject(AuthState);
  router = inject(Router);

  isLoading = signal(true);
  plan = signal('Starter');
  estado = signal('ACTIVA');
  razonSocial = signal('');
  tenantId = signal('');
  propietarioEmail = signal('');
  invoices = signal<any[]>([]);
  cards = this.cardsService.cards;
  nextPaymentDate = signal(new Date(new Date().setMonth(new Date().getMonth() + 1)));
  memberCount = signal(0);
  memberLimit = signal(1);

  isEnterprise = computed(() => this.plan().toLowerCase() === 'enterprise');

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/empresas/current`).subscribe({
      next: (data) => {
        this.plan.set(this.authState.user()?.plan || 'Starter');
        this.estado.set(data?.estado || 'ACTIVA');
        this.razonSocial.set(data?.razonSocial || '');
        this.tenantId.set(data?.propietarioId || data?.id || '');
        this.propietarioEmail.set(data?.propietario?.email || '');
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
    this.cardsService.load();
    this.http.get<any>(`${environment.apiUrl}/payments/usage`).subscribe({
      next: (usage) => {
        this.memberCount.set(usage.members ?? 0);
        this.memberLimit.set(usage.limits?.members || 1);
        this.plan.set(usage.plan || this.plan());
      },
    });
  }

  memberUsagePercent(): number {
    return Math.min(100, Math.round((this.memberCount() / Math.max(this.memberLimit(), 1)) * 100));
  }

  goToPlans() {
    this.router.navigate(['/admin/plans']);
  }

  manageMembers() {
    this.router.navigate(['/admin/settings/roles']);
  }

  cancelSubscription() {
    this.dialog.open(ConfirmDialogComponent, {
      width: '100%',
      maxWidth: '28rem',
      panelClass: 'dialog-panel-no-padding',
      data: {
        title: 'Cancelar suscripción',
        message: 'Al cancelar perderás el acceso a tu plan actual al final del período de facturación. Esta acción no se puede deshacer.',
        confirmLabel: 'Cancelar suscripción',
        destructive: true,
      } satisfies ConfirmDialogData,
    }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.snackBar.open('Solicitud de cancelación enviada', 'Cerrar', { duration: 3000 });
      }
    });
  }

  openCardDialog() {
    this.dialog.open(CardDialogComponent, {
      width: '100%',
      maxWidth: '28rem',
      panelClass: 'dialog-panel-no-padding',
    }).afterClosed().subscribe((result) => {
      if (result) {
        this.cardsService.add(result);
        this.snackBar.open('Tarjeta agregada correctamente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  manageCards() {
    this.dialog.open(ManageCardsDialogComponent, {
      width: '100%',
      maxWidth: '32rem',
      panelClass: 'dialog-panel-no-padding'
    });
  }

  removeCard(card: PaymentCard) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '100%',
      maxWidth: '28rem',
      panelClass: 'dialog-panel-no-padding',
      data: {
        title: 'Eliminar tarjeta',
        message: `¿Seguro que deseas eliminar la tarjeta ${card.marca} ${card.numeroEnmascarado}?`,
        confirmLabel: 'Eliminar',
        icon: 'trash',
        destructive: true,
      } satisfies ConfirmDialogData,
    }).afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.cardsService.remove(card.id);
        this.snackBar.open('Tarjeta eliminada', 'Cerrar', { duration: 3000 });
      }
    });
  }

  setPrimary(card: PaymentCard) {
    this.cardsService.setDefault(card.id);
    this.snackBar.open('Tarjeta establecida como principal', 'Cerrar', { duration: 3000 });
  }

  viewInvoice(inv: any) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '100%',
      maxWidth: '28rem',
      panelClass: 'dialog-panel-no-padding',
      data: {
        title: `Factura ${inv.numero}`,
        message: `Plan ${inv.plan} • $${inv.monto} • ${inv.fecha ? new Date(inv.fecha).toLocaleDateString() : ''}`,
        confirmLabel: 'Entendido',
        icon: 'file-text',
      } satisfies ConfirmDialogData,
    });
  }

  downloadInvoice(inv: any) {
    this.snackBar.open(`Descargando factura ${inv.numero}...`, 'Cerrar', { duration: 2000 });
  }
}
