import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
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
import { CurrencyConfigService } from '@core/currency/currency-config.service';
import { AuthState } from '@core/auth/auth.state';

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
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">
      <!-- Standard Clean Page Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div>
          <div
            class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'commercial.quotes.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'commercial.quotes.subtitle' | transloco }}
          </p>
        </div>

        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4 gap-3">
          <button
            mat-flat-button
            (click)="openCreateModal()"
            class="!rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
            {{ 'commercial.quotes.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Body -->
      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 md:px-8 lg:grid-cols-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <app-stat-card
            [title]="'commercial.quotes.stats.total' | transloco"
            [subtitle]="metrics().totalCotizaciones + ' ' + ('commercial.quotes.stats.totalSub' | transloco)"
            [value]="metrics().totalCotizaciones"
            icon="file-text"
            curvePreset="asc-sigmoid"
            color="blue"
            (refresh)="loadData()"
          />

          <app-stat-card
            [title]="'commercial.quotes.stats.sent' | transloco"
            [subtitle]="metrics().totalEnviadas + ' ' + ('commercial.quotes.stats.sentSub' | transloco)"
            [value]="metrics().totalEnviadas"
            icon="send"
            curvePreset="peak-wave"
            color="amber"
            (refresh)="loadData()"
          />

          <app-stat-card
            [title]="'commercial.quotes.stats.invoiced' | transloco"
            [subtitle]="metrics().totalFacturadas + ' ' + ('commercial.quotes.stats.invoicedSub' | transloco)"
            [value]="metrics().totalFacturadas"
            icon="check-circle"
            curvePreset="s-curve"
            color="emerald"
            (refresh)="loadData()"
          />

          <app-stat-card
            [title]="'commercial.quotes.stats.totalAmount' | transloco"
            [prefix]="currencyConfig.currencySymbol() + ' '"
            [value]="(metrics().montoTotalCotizado | number: '1.2-2') || '0.00'"
            [subtitle]="'commercial.quotes.stats.totalAmountSub' | transloco"
            icon="dollar-sign"
            curvePreset="trough-wave"
            color="blue"
            (refresh)="loadData()"
          />
        </div>

        <!-- Filter Bar -->
        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div class="flex min-w-[260px] flex-1 items-center gap-3">
            <div class="relative w-full max-w-md">
              <mat-icon
                svgIcon="search"
                class="icon-size-4 absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
              ></mat-icon>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange()"
                [placeholder]="'commercial.quotes.searchPlaceholder' | transloco"
                class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              [matMenuTriggerFor]="statusFilterMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              <mat-icon svgIcon="sliders-horizontal" class="icon-size-4 text-neutral-500"></mat-icon>
              <span>{{ getStatusFilterLabel() | transloco }}</span>
            </button>
            <mat-menu #statusFilterMenu="matMenu">
              @for (tab of statusTabs; track tab.value) {
                <button mat-menu-item (click)="onStatusTabChange(tab.value)">
                  {{ tab.label | transloco }}
                </button>
              }
            </mat-menu>
          </div>
        </div>

        <!-- Quotes Table -->
        <div class="grid">
          <!-- Header sticky -->
          <div
            class="quotes-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div>{{ 'commercial.quotes.table.number' | transloco }}</div>
            <div>{{ 'commercial.quotes.table.client' | transloco }}</div>
            <div class="hidden md:block">{{ 'commercial.quotes.table.issueDate' | transloco }}</div>
            <div class="hidden md:block">{{ 'commercial.quotes.table.dueDate' | transloco }}</div>
            <div class="text-right">{{ 'commercial.quotes.table.total' | transloco }}</div>
            <div class="text-center">{{ 'commercial.quotes.table.status' | transloco }}</div>
            <div class="hidden lg:block text-center">{{ 'commercial.quotes.table.email' | transloco }}</div>
            <div class="text-right">{{ 'commercial.quotes.table.actions' | transloco }}</div>
          </div>

          @if (loading()) {
            <app-table-skeleton [gridClass]="'quotes-grid'" [rows]="6" />
          } @else if (quotes().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                [title]="'commercial.quotes.emptyTitle' | transloco"
                [description]="'commercial.quotes.emptyDescription' | transloco"
                icon="file-text"
                [actionLabel]="'commercial.quotes.new' | transloco"
                (action)="openCreateModal()"
              />
            </div>
          } @else {
            @for (q of quotes(); track q.id) {
              <div
                class="quotes-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
              >
                <!-- # Cotización -->
                <div class="font-mono font-bold text-blue-600 dark:text-blue-400 cursor-pointer" (click)="openPreviewModal(q)">
                  {{ q.numeroCotizacion }}
                </div>

                <!-- Cliente -->
                <div>
                  @if (q.cliente; as cli) {
                    <div class="flex items-center gap-1.5">
                      <span class="font-medium text-neutral-900 dark:text-white line-clamp-1">
                        {{ cli.nombreRazonSocial }}
                      </span>
                      @if (cli.email) {
                        <mat-icon svgIcon="mail" class="icon-size-3.5 text-emerald-500 shrink-0" matTooltip="Correo: {{ cli.email }}"></mat-icon>
                      } @else {
                        <mat-icon svgIcon="alert-circle" class="icon-size-3.5 text-amber-400 shrink-0" matTooltip="Sin correo registrado"></mat-icon>
                      }
                    </div>
                    @if (cli.numeroDocumento) {
                      <div class="text-[11px] font-mono text-neutral-400">{{ cli.numeroDocumento }}</div>
                    }
                  } @else {
                    <span class="font-medium text-neutral-500">Consumidor Final</span>
                  }
                </div>

                <!-- Fecha Emisión -->
                <div class="hidden md:block text-neutral-500 font-mono text-xs">
                  {{ q.fecha | date: 'dd/MM/yyyy' }}
                </div>

                <!-- Vencimiento -->
                <div class="hidden md:block text-neutral-500 font-mono text-xs">
                  {{ q.fechaVencimiento ? (q.fechaVencimiento | date: 'dd/MM/yyyy') : '30 días' }}
                </div>

                <!-- Total -->
                <div class="text-right font-mono font-bold text-neutral-900 dark:text-white">
                  {{ getQuoteCurrencySymbol(q) }} {{ q.total | number: '1.2-2' }}
                </div>

                <!-- Estado -->
                <div class="text-center">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                    [ngClass]="getStatusBadgeClass(q)"
                  >
                    {{ q.estado }}
                  </span>
                </div>

                <!-- Canal Correo -->
                <div class="hidden lg:flex justify-center">
                  @if (q.enviadaPorEmail) {
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20"
                      matTooltip="Enviada a: {{ q.emailDestino }}"
                    >
                      <mat-icon svgIcon="check" class="icon-size-3"></mat-icon>
                      <span>Enviada</span>
                    </span>
                  } @else {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/50">Pendiente</span>
                  }
                </div>

                <!-- Acciones -->
                <div class="flex items-center justify-end gap-1">
                  <button mat-icon-button (click)="openPreviewModal(q)" matTooltip="Vista Previa"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    <mat-icon svgIcon="eye" class="icon-size-4.5"></mat-icon>
                  </button>
                  <button mat-icon-button (click)="openSendEmailModal(q)" matTooltip="Enviar por Correo"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                    <mat-icon svgIcon="mail" class="icon-size-4.5"></mat-icon>
                  </button>
                  <button mat-icon-button [matMenuTriggerFor]="rowMenu"
                    class="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer">
                    <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4.5"></mat-icon>
                  </button>
                  <mat-menu #rowMenu="matMenu" xPosition="before">
                    <button mat-menu-item (click)="openPreviewModal(q)">
                      <mat-icon svgIcon="eye" class="icon-size-4"></mat-icon>
                      <span>{{ 'commercial.quotes.actions.viewDetail' | transloco }}</span>
                    </button>
                    <button mat-menu-item (click)="openSendEmailModal(q)">
                      <mat-icon svgIcon="send" class="icon-size-4"></mat-icon>
                      <span>{{ 'commercial.quotes.actions.sendEmail' | transloco }}</span>
                    </button>
                    @if (q.estado !== 'FACTURADA') {
                      <button mat-menu-item (click)="confirmConvertToInvoice(q)">
                        <mat-icon svgIcon="file-text" class="icon-size-4 text-emerald-600"></mat-icon>
                        <span class="font-bold text-emerald-600">{{ 'commercial.quotes.actions.convertToInvoice' | transloco }}</span>
                      </button>
                      <button mat-menu-item (click)="openEditModal(q)">
                        <mat-icon svgIcon="pencil" class="icon-size-4"></mat-icon>
                        <span>{{ 'commercial.quotes.actions.editQuote' | transloco }}</span>
                      </button>
                      <button mat-menu-item (click)="confirmDelete(q)" class="!text-rose-600">
                        <mat-icon svgIcon="trash" class="icon-size-4 text-rose-600"></mat-icon>
                        <span>Anular / Eliminar</span>
                      </button>
                    }
                  </mat-menu>
                </div>
              </div>
            }

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
  styles: [`
    .quotes-grid {
      grid-template-columns: minmax(130px, 1.2fr) minmax(180px, 2fr) minmax(110px, 1fr) minmax(110px, 1fr) minmax(120px, 1.2fr) minmax(100px, 0.9fr) minmax(90px, 0.8fr) minmax(110px, 1fr);
    }
    @media (max-width: 1024px) {
      .quotes-grid {
        grid-template-columns: minmax(120px, 1.2fr) minmax(160px, 2fr) minmax(110px, 1.2fr) minmax(90px, 0.9fr) minmax(100px, 1fr);
      }
    }
    @media (max-width: 640px) {
      .quotes-grid {
        grid-template-columns: minmax(110px, 1.2fr) minmax(140px, 2fr) minmax(100px, 1fr) minmax(80px, 0.8fr);
      }
    }
  `],
})
export class QuotesComponent implements OnInit {
  quotesService = inject(QuotesService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  router = inject(Router);
  currencyConfig = inject(CurrencyConfigService);
  authState = inject(AuthState);

  quotes = this.quotesService.quotes;
  loading = this.quotesService.loading;
  total = this.quotesService.total;
  page = this.quotesService.page;
  limit = this.quotesService.limit;
  metrics = this.quotesService.metrics;

  searchQuery = '';
  selectedStatus = '';

  getQuoteCurrencySymbol(quote?: Cotizacion): string {
    const c = quote?.moneda || this.currencyConfig.currency();
    return c === 'USD' ? 'USD $' : c === 'EUR' ? '€' : 'RD$';
  }

  statusTabs = [
    { label: 'commercial.quotes.filters.all', value: '' },
    { label: 'commercial.quotes.filters.drafts', value: 'BORRADOR' },
    { label: 'commercial.quotes.filters.sent', value: 'ENVIADA' },
    { label: 'commercial.quotes.filters.accepted', value: 'ACEPTADA' },
    { label: 'commercial.quotes.filters.invoiced', value: 'FACTURADA' },
    { label: 'commercial.quotes.filters.rejected', value: 'RECHAZADA' },
  ];

  getStatusFilterLabel(): string {
    const tab = this.statusTabs.find((t) => t.value === this.selectedStatus);
    return tab ? tab.label : 'commercial.quotes.filters.all';
  }

  getStatusBadgeClass(q: Cotizacion): string {
    switch (q.estado) {
      case 'ENVIADA':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20';
      case 'ACEPTADA':
      case 'FACTURADA':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20';
      case 'RECHAZADA':
      case 'VENCIDA':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20';
      case 'BORRADOR':
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200/60 dark:border-neutral-700/50';
    }
  }

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
    let empresa: any = (quote as any)?.empresa || null;
    if (!empresa) {
      const user = this.authState.user();
      const empId = quote.empresaId || this.authState.empresaId();
      empresa = user?.empresas?.find((e: any) => e.id === empId) || user?.empresas?.[0];
      if (!empresa) {
        try {
          const cached = localStorage.getItem('cached_my_empresas');
          if (cached) {
            const list = JSON.parse(cached);
            empresa = list.find((e: any) => e.id === empId) || list[0];
          }
        } catch {}
      }
    }

    this.dialog.open(QuotePreviewComponent, {
      width: '780px',
      maxWidth: '100vw',
      height: '100vh',
      maxHeight: '100vh',
      position: { top: '0', right: '0' },
      panelClass: ['quote-preview-panel'],
      data: {
        quote,
        empresaNombre: empresa?.razonSocial || empresa?.nombre || '',
        empresaLogo: empresa?.logo || null,
        empresaRnc: empresa?.rnc || null,
        empresaTelefono: empresa?.telefono || null,
        empresaDireccion: empresa?.direccion || null,
      },
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
        message: `¿Deseas convertir la cotización ${quote.numeroCotizacion} por un total de ${this.getQuoteCurrencySymbol(quote)} ${quote.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })} en una Factura de Venta formal?`,
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
