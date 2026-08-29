import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { PaginatorComponent, PageChangeEvent } from '@shared/components/paginator/paginator.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  QuotesService,
  Cotizacion,
  FilterQuotesDto,
} from '../../data/quotes.service';
import { QuoteDialogComponent } from './quote-dialog.component';
import { SendQuoteEmailDialogComponent } from './send-quote-email-dialog.component';
import { QuotePreviewComponent } from './quote-preview.component';

@Component({
  selector: 'app-quotes',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule,
    DecimalPipe,
    DatePipe,
    TranslocoPipe,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatCardComponent,
    PaginatorComponent,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <!-- Standard Clean Fuse Page Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div class="min-w-0 flex-1">
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ 'commercial.quotes.title' | transloco }}
          </h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {{ 'commercial.quotes.subtitle' | transloco }}
          </p>
        </div>

        <div class="flex items-center gap-3 mt-4 sm:mt-0 shrink-0">
          <button
            (click)="openCreateModal()"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-4 text-white"></mat-icon>
            {{ 'commercial.quotes.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Scrollable Content -->
      <div class="flex-auto overflow-y-auto px-6 md:px-8 py-6 space-y-6">
        <!-- Stat Cards KPI Grid -->
        <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <app-stat-card
            title="Total Cotizaciones"
            [subtitle]="metrics().totalCotizaciones + ' propuestas emitidas'"
            [value]="metrics().totalCotizaciones"
            icon="file-text"
            curvePreset="asc-sigmoid"
            color="blue"
            (refresh)="loadData()"
          />

          <app-stat-card
            title="Enviadas / Activas"
            [subtitle]="metrics().totalEnviadas + ' entregadas a clientes'"
            [value]="metrics().totalEnviadas"
            icon="send"
            curvePreset="peak-wave"
            color="amber"
            (refresh)="loadData()"
          />

          <app-stat-card
            title="Facturadas / Aceptadas"
            [subtitle]="metrics().totalFacturadas + ' convertidas en ventas'"
            [value]="metrics().totalFacturadas"
            icon="check-circle"
            curvePreset="s-curve"
            color="emerald"
            (refresh)="loadData()"
          />

          <app-stat-card
            title="Monto Total Cotizado"
            prefix="RD$ "
            [value]="(metrics().montoTotalCotizado | number: '1.2-2') || '0.00'"
            subtitle="Volumen en propuestas comerciales"
            icon="dollar-sign"
            curvePreset="trough-wave"
            color="blue"
            (refresh)="loadData()"
          />
        </section>

        <!-- Search and Filter Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <!-- Search input -->
          <div class="relative flex-1 max-w-md">
            <mat-icon
              svgIcon="search"
              class="icon-size-4 absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
            ></mat-icon>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              placeholder="Buscar por # cotización, cliente o RNC..."
              class="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <!-- State Filter Tabs -->
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar">
            @for (tab of statusTabs; track tab.value) {
              <button
                type="button"
                (click)="onStatusTabChange(tab.value)"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                [ngClass]="
                  selectedStatus === tab.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                "
              >
                {{ tab.label }}
              </button>
            }
          </div>
        </div>

        <!-- Table Container -->
        <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
          <div class="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
            <div class="flex items-center gap-3">
              <h3 class="text-base font-bold text-neutral-900 dark:text-white">
                Listado de Cotizaciones
              </h3>
              <span class="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {{ total() }} registros
              </span>
            </div>

            <button
              type="button"
              (click)="loadData()"
              matTooltip="Recargar listado"
              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors cursor-pointer"
            >
              <mat-icon svgIcon="refresh" class="icon-size-4"></mat-icon>
            </button>
          </div>

          @if (loading()) {
            <app-table-skeleton [rows]="6" />
          } @else if (quotes().length === 0) {
            <app-empty-state
              title="No hay cotizaciones registradas"
              description="Crea tu primera cotización comercial para enviarla directamente a tus clientes por correo."
              icon="file-text"
              actionLabel="Nueva Cotización"
              (action)="openCreateModal()"
            />
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th class="py-3.5 px-4"># Cotización</th>
                    <th class="py-3.5 px-4">Cliente</th>
                    <th class="py-3.5 px-4">Fecha Emisión</th>
                    <th class="py-3.5 px-4">Vencimiento</th>
                    <th class="py-3.5 px-4 text-right">Monto Total</th>
                    <th class="py-3.5 px-4 text-center">Estado</th>
                    <th class="py-3.5 px-4 text-center">Canal Correo</th>
                    <th class="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  @for (q of quotes(); track q.id) {
                    <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <!-- # Cotización -->
                      <td class="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 cursor-pointer" (click)="openPreviewModal(q)">
                        {{ q.numeroCotizacion }}
                      </td>

                      <!-- Cliente -->
                      <td class="py-3.5 px-4">
                        @if (q.cliente; as cli) {
                          <div class="flex items-center gap-1.5">
                            <span class="font-medium text-neutral-900 dark:text-white line-clamp-1">
                              {{ cli.nombreRazonSocial }}
                            </span>
                            @if (cli.email) {
                              <mat-icon
                                svgIcon="mail"
                                class="icon-size-3.5 text-emerald-500 shrink-0"
                                matTooltip="Correo: {{ cli.email }}"
                              ></mat-icon>
                            } @else {
                              <mat-icon
                                svgIcon="alert-circle"
                                class="icon-size-3.5 text-amber-400 shrink-0"
                                matTooltip="Sin correo registrado"
                              ></mat-icon>
                            }
                          </div>
                          @if (cli.numeroDocumento) {
                            <div class="text-[11px] font-mono text-neutral-400">
                              {{ cli.numeroDocumento }}
                            </div>
                          }
                        } @else {
                          <span class="font-medium text-neutral-500">Consumidor Final</span>
                        }
                      </td>

                      <!-- Fecha Emisión -->
                      <td class="py-3.5 px-4 text-neutral-500">
                        {{ q.fecha | date: 'dd/MM/yyyy' }}
                      </td>

                      <!-- Fecha Vencimiento -->
                      <td class="py-3.5 px-4 text-neutral-500">
                        {{ q.fechaVencimiento ? (q.fechaVencimiento | date: 'dd/MM/yyyy') : '30 días' }}
                      </td>

                      <!-- Total -->
                      <td class="py-3.5 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white">
                        RD$ {{ q.total | number: '1.2-2' }}
                      </td>

                      <!-- Estado -->
                      <td class="py-3.5 px-4 text-center">
                        <span
                          class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                          [ngClass]="{
                            'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300': q.estado === 'BORRADOR',
                            'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': q.estado === 'ENVIADA',
                            'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400': q.estado === 'ACEPTADA' || q.estado === 'FACTURADA',
                            'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400': q.estado === 'RECHAZADA' || q.estado === 'VENCIDA'
                          }"
                        >
                          {{ q.estado }}
                        </span>
                      </td>

                      <!-- Canal Correo -->
                      <td class="py-3.5 px-4 text-center">
                        @if (q.enviadaPorEmail) {
                          <span
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50"
                            matTooltip="Enviada a: {{ q.emailDestino }} el {{ q.fechaEnvioEmail | date: 'dd/MM/yyyy HH:mm' }}"
                          >
                            <mat-icon svgIcon="check" class="icon-size-3"></mat-icon>
                            <span>Enviada</span>
                          </span>
                        } @else {
                          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                            Pendiente
                          </span>
                        }
                      </td>

                      <!-- Acciones -->
                      <td class="py-3.5 px-4 text-center">
                        <div class="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            (click)="openPreviewModal(q)"
                            matTooltip="Vista Previa / Imprimir"
                            class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                          >
                            <mat-icon svgIcon="printer" class="icon-size-4"></mat-icon>
                          </button>

                          <button
                            type="button"
                            (click)="openSendEmailModal(q)"
                            matTooltip="Enviar por Correo"
                            class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                          >
                            <mat-icon svgIcon="mail" class="icon-size-4"></mat-icon>
                          </button>

                          <button
                            type="button"
                            [matMenuTriggerFor]="rowMenu"
                            class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors cursor-pointer"
                          >
                            <mat-icon svgIcon="more-vertical" class="icon-size-4"></mat-icon>
                          </button>

                          <mat-menu #rowMenu="matMenu" xPosition="before" class="fuse-mat-menu">
                            <button mat-menu-item (click)="openPreviewModal(q)">
                              <mat-icon svgIcon="eye" class="icon-size-4"></mat-icon>
                              <span>Ver Detalle Completo</span>
                            </button>
                            <button mat-menu-item (click)="openSendEmailModal(q)">
                              <mat-icon svgIcon="send" class="icon-size-4"></mat-icon>
                              <span>Enviar por Correo Electrónico</span>
                            </button>
                            @if (q.estado !== 'FACTURADA') {
                              <button mat-menu-item (click)="confirmConvertToInvoice(q)">
                                <mat-icon svgIcon="file-text" class="icon-size-4 text-emerald-600"></mat-icon>
                                <span class="font-bold text-emerald-600">Convertir a Factura Fiscal</span>
                              </button>
                              <button mat-menu-item (click)="openEditModal(q)">
                                <mat-icon svgIcon="edit" class="icon-size-4"></mat-icon>
                                <span>Editar Cotización</span>
                              </button>
                              <button mat-menu-item (click)="confirmDelete(q)">
                                <mat-icon svgIcon="trash-2" class="icon-size-4 text-rose-600"></mat-icon>
                                <span class="text-rose-600">Anular / Eliminar</span>
                              </button>
                            }
                          </mat-menu>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Paginator -->
            <div class="p-4 border-t border-neutral-100 dark:border-neutral-800">
              <app-paginator
                [total]="total()"
                [limit]="limit()"
                [currentPage]="page()"
                (pageChange)="onPageChange($event)"
              />
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class QuotesComponent implements OnInit {
  quotesService = inject(QuotesService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  router = inject(Router);

  quotes = this.quotesService.quotes;
  loading = this.quotesService.loading;
  total = this.quotesService.total;
  page = this.quotesService.page;
  limit = this.quotesService.limit;
  metrics = this.quotesService.metrics;

  searchQuery = '';
  selectedStatus = '';

  statusTabs = [
    { label: 'Todas', value: '' },
    { label: 'Borradores', value: 'BORRADOR' },
    { label: 'Enviadas', value: 'ENVIADA' },
    { label: 'Aceptadas', value: 'ACEPTADA' },
    { label: 'Facturadas', value: 'FACTURADA' },
    { label: 'Rechazadas', value: 'RECHAZADA' },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const filter: FilterQuotesDto = {
      page: this.page(),
      limit: this.limit(),
      search: this.searchQuery?.trim() || undefined,
      estado: this.selectedStatus || undefined,
    };

    this.quotesService.getQuotes(filter).subscribe();
    this.quotesService.getMetrics().subscribe();
  }

  onSearchChange(): void {
    this.page.set(1);
    this.loadData();
  }

  onStatusTabChange(status: string): void {
    this.selectedStatus = status;
    this.page.set(1);
    this.loadData();
  }

  onPageChange(event: PageChangeEvent): void {
    this.page.set(event.page);
    this.limit.set(event.limit);
    this.loadData();
  }

  openCreateModal(): void {
    const dialogRef = this.dialog.open(QuoteDialogComponent, {
      width: '1200px',
      maxWidth: '96vw',
      panelClass: 'fuse-mat-dialog-rounded',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadData();
      }
    });
  }

  openEditModal(quote: Cotizacion): void {
    const dialogRef = this.dialog.open(QuoteDialogComponent, {
      width: '1200px',
      maxWidth: '96vw',
      panelClass: 'fuse-mat-dialog-rounded',
      disableClose: true,
      data: { quote },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.loadData();
      }
    });
  }

  openPreviewModal(quote: Cotizacion): void {
    this.dialog.open(QuotePreviewComponent, {
      width: '950px',
      maxWidth: '96vw',
      panelClass: 'fuse-mat-dialog-rounded',
      data: { quote },
    });
  }

  openSendEmailModal(quote: Cotizacion): void {
    const dialogRef = this.dialog.open(SendQuoteEmailDialogComponent, {
      width: '520px',
      panelClass: 'fuse-mat-dialog-rounded',
      disableClose: true,
      data: { quote },
    });

    dialogRef.afterClosed().subscribe((sent) => {
      if (sent) {
        this.loadData();
      }
    });
  }

  confirmConvertToInvoice(quote: Cotizacion): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Convertir Cotización a Factura',
        message: `¿Deseas convertir la cotización ${quote.numeroCotizacion} por un total de RD$ ${quote.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })} en una Factura de Venta formal?`,
        confirmText: 'Convertir a Factura',
        confirmColor: 'primary',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.quotesService.convertToInvoice(quote.id).subscribe({
          next: (res) => {
            this.snackBar.open(res.message || 'Cotización convertida exitosamente a Factura.', 'Cerrar', {
              duration: 4000,
            });
            this.loadData();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Error al convertir la cotización a factura.', 'Cerrar', {
              duration: 5000,
            });
          },
        });
      }
    });
  }

  confirmDelete(quote: Cotizacion): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Anular Cotización',
        message: `¿Estás seguro de que deseas anular la cotización ${quote.numeroCotizacion}?`,
        confirmText: 'Anular Cotización',
        confirmColor: 'warn',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.quotesService.deleteQuote(quote.id).subscribe({
          next: () => {
            this.snackBar.open('Cotización anulada exitosamente.', 'Cerrar', { duration: 3500 });
            this.loadData();
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Error al anular la cotización.', 'Cerrar', { duration: 4500 });
          },
        });
      }
    });
  }
}
