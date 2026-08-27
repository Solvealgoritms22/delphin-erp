import {
  Component,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  InvoicesService,
  CreateInvoiceDto,
  FacturaVenta,
} from '../../data/invoices.service';
import { SequencesService } from '../../data/sequences.service';
import { ProductsService } from '../../../catalogs/data/products.service';
import { InventoryService } from '../../../catalogs/data/inventory.service';
import { ClientsService } from '../../data/clients';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { PaginatorComponent, PageChangeEvent } from '@shared/components/paginator/paginator.component';
import { InvoicePreviewComponent } from './invoice-preview.component';

@Component({
  selector: 'app-invoices',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatMenuModule,
    MatCheckboxModule,
    TranslocoPipe,
    EmptyStateComponent,
    PaginatorComponent,
  ],
  template: `
    <div
      class="flex flex-col flex-auto min-w-0 h-full overflow-hidden"
    >

      <div
        class="relative flex flex-0 shrink-0 flex-col border-b border-neutral-200 bg-white px-6 py-8 sm:flex-row sm:items-center sm:justify-between md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div>
          <div
            class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'commercial.invoices.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'commercial.invoices.description' | transloco }}
          </p>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3 sm:mt-0 sm:ml-4">
          <button
            (click)="openCreateModal()"
            class="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <mat-icon
              svgIcon="plus"
              class="icon-size-4"
            ></mat-icon>
            {{ 'commercial.invoices.newInvoice' | transloco }}
          </button>
        </div>
      </div>

      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">

        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 pb-4 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
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
                (ngModelChange)="filterInvoices()"
                [placeholder]="
                  'commercial.invoices.searchPlaceholder' | transloco
                "
                class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
              />
            </div>
          </div>

          <div class="flex items-center gap-3">

            <!-- Advanced filters toggle -->
            <button
              (click)="showAdvancedFilters = !showAdvancedFilters"
              type="button"
              class="relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-bold whitespace-nowrap transition-colors"
              [class]="showAdvancedFilters
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50'"
            >
              <mat-icon svgIcon="sliders-horizontal" class="icon-size-4" />
              Filtros
              @if (activeFiltersCount > 0) {
                <span class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">{{ activeFiltersCount }}</span>
              }
            </button>
            <button
              [matMenuTriggerFor]="ncfFilterMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              <mat-icon
                svgIcon="hash"
                class="icon-size-4 text-neutral-500"
              ></mat-icon>
              <span>{{
                selectedNcfFilter === 'ALL'
                  ? ('commercial.invoices.allNcf' | transloco)
                  : selectedNcfFilter
              }}</span>
              <mat-icon
                svgIcon="chevron-down"
                class="icon-size-3.5 text-neutral-400"
              ></mat-icon>
            </button>
            <mat-menu
              #ncfFilterMenu="matMenu"
              class="!rounded-xl !p-1"
            >
              <button
                mat-menu-item
                (click)="setNcfFilter('ALL')"
              >
                <span>{{ 'commercial.invoices.allNcf' | transloco }}</span>
              </button>
              @if (fiscalbridgeEnabled) {
                <button
                  mat-menu-item
                  (click)="setNcfFilter('E31')"
                >
                  <span>{{ 'commercial.invoices.types.E31' | transloco }}</span>
                </button>
                <button
                  mat-menu-item
                  (click)="setNcfFilter('E32')"
                >
                  <span>{{ 'commercial.invoices.types.E32' | transloco }}</span>
                </button>
                <button
                  mat-menu-item
                  (click)="setNcfFilter('E34')"
                >
                  <span>{{ 'commercial.invoices.types.E34' | transloco }}</span>
                </button>
              }
              <button
                mat-menu-item
                (click)="setNcfFilter('B01')"
              >
                <span>{{ 'commercial.invoices.types.B01' | transloco }}</span>
              </button>
              <button
                mat-menu-item
                (click)="setNcfFilter('B02')"
              >
                <span>{{ 'commercial.invoices.types.B02' | transloco }}</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Advanced Filters Panel -->
        @if (showAdvancedFilters) {
          <div class="flex shrink-0 flex-col border-b border-neutral-200 bg-neutral-50 px-6 pb-4 md:px-8 dark:border-neutral-700 dark:bg-neutral-800/50">
            <div class="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-4">

              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Estado</label>
                <button
                  type="button"
                  [matMenuTriggerFor]="estadoFilterMenu"
                  class="flex h-10 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 shadow-2xs transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <span>{{ getEstadoFilterLabel(advancedFilters.estado) }}</span>
                  <mat-icon svgIcon="chevron-down" class="!h-3.5 !w-3.5 !text-[14px] text-neutral-400"></mat-icon>
                </button>
                <mat-menu #estadoFilterMenu="matMenu">
                  <button mat-menu-item (click)="advancedFilters.estado = ''" [class.font-bold]="!advancedFilters.estado">Todos</button>
                  <button mat-menu-item (click)="advancedFilters.estado = 'EMITIDA'" [class.font-bold]="advancedFilters.estado === 'EMITIDA'">Emitida</button>
                  <button mat-menu-item (click)="advancedFilters.estado = 'BORRADOR'" [class.font-bold]="advancedFilters.estado === 'BORRADOR'">Borrador</button>
                  <button mat-menu-item (click)="advancedFilters.estado = 'PAGADA'" [class.font-bold]="advancedFilters.estado === 'PAGADA'">Pagada</button>
                  <button mat-menu-item (click)="advancedFilters.estado = 'ANULADA'" [class.font-bold]="advancedFilters.estado === 'ANULADA'">Anulada</button>
                </mat-menu>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Tipo de Pago</label>
                <button
                  type="button"
                  [matMenuTriggerFor]="tipoPagoFilterMenu"
                  class="flex h-10 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 shadow-2xs transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <span>{{ getTipoPagoFilterLabel(advancedFilters.tipoPago) }}</span>
                  <mat-icon svgIcon="chevron-down" class="!h-3.5 !w-3.5 !text-[14px] text-neutral-400"></mat-icon>
                </button>
                <mat-menu #tipoPagoFilterMenu="matMenu">
                  <button mat-menu-item (click)="advancedFilters.tipoPago = ''" [class.font-bold]="!advancedFilters.tipoPago">Todos</button>
                  <button mat-menu-item (click)="advancedFilters.tipoPago = 'CONTADO'" [class.font-bold]="advancedFilters.tipoPago === 'CONTADO'">Contado</button>
                  <button mat-menu-item (click)="advancedFilters.tipoPago = 'CREDITO'" [class.font-bold]="advancedFilters.tipoPago === 'CREDITO'">Crédito</button>
                </mat-menu>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Método de Pago</label>
                <button
                  type="button"
                  [matMenuTriggerFor]="metodoPagoFilterMenu"
                  class="flex h-10 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 shadow-2xs transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <span>{{ getMetodoPagoFilterLabel(advancedFilters.metodoPago) }}</span>
                  <mat-icon svgIcon="chevron-down" class="!h-3.5 !w-3.5 !text-[14px] text-neutral-400"></mat-icon>
                </button>
                <mat-menu #metodoPagoFilterMenu="matMenu">
                  <button mat-menu-item (click)="advancedFilters.metodoPago = ''" [class.font-bold]="!advancedFilters.metodoPago">Todos</button>
                  <button mat-menu-item (click)="advancedFilters.metodoPago = 'EFECTIVO'" [class.font-bold]="advancedFilters.metodoPago === 'EFECTIVO'">Efectivo</button>
                  <button mat-menu-item (click)="advancedFilters.metodoPago = 'TARJETA'" [class.font-bold]="advancedFilters.metodoPago === 'TARJETA'">Tarjeta</button>
                  <button mat-menu-item (click)="advancedFilters.metodoPago = 'TRANSFERENCIA'" [class.font-bold]="advancedFilters.metodoPago === 'TRANSFERENCIA'">Transferencia</button>
                  <button mat-menu-item (click)="advancedFilters.metodoPago = 'CHEQUE'" [class.font-bold]="advancedFilters.metodoPago === 'CHEQUE'">Cheque</button>
                </mat-menu>
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Desde</label>
                <input type="date" [(ngModel)]="advancedFilters.desde" class="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Hasta</label>
                <input type="date" [(ngModel)]="advancedFilters.hasta" class="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Monto Mín.</label>
                <input type="number" min="0" [(ngModel)]="advancedFilters.minTotal" placeholder="0.00" class="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Monto Máx.</label>
                <input type="number" min="0" [(ngModel)]="advancedFilters.maxTotal" placeholder="0.00" class="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
              </div>

            </div>

            <div class="mt-3 flex items-center gap-3">
              <button (click)="applyAdvancedFilters()" class="cursor-pointer rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700">
                Aplicar filtros
              </button>
              <button (click)="resetFilters()" class="cursor-pointer rounded-xl border border-neutral-200 px-5 py-2 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700">
                Limpiar
              </button>
            </div>
          </div>
        }

        <div class="grid">

          <div
            class="sticky top-0 z-10 grid grid-cols-12 gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-4 text-[11px] font-bold tracking-wider text-neutral-500 uppercase shadow-xs md:px-8 dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div class="col-span-2">
              {{ 'commercial.invoices.columns.invoiceDate' | transloco }}
            </div>
            <div class="col-span-2">
              {{ 'commercial.invoices.columns.ncf' | transloco }}
            </div>
            <div class="col-span-3">
              {{ 'commercial.invoices.columns.clientRnc' | transloco }}
            </div>
            <div class="col-span-2 text-right">
              {{ 'commercial.invoices.columns.total' | transloco }}
            </div>
            <div class="col-span-2 text-center">
              {{ 'commercial.invoices.columns.status' | transloco }}
            </div>
            <div class="col-span-1 text-center">
              {{ 'commercial.invoices.columns.actions' | transloco }}
            </div>
          </div>

          @if (invoicesService.invoices().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                icon="file-text"
                [title]="'commercial.invoices.emptyTitle' | transloco"
                [description]="
                  'commercial.invoices.emptyDescription' | transloco
                "
                [actionLabel]="'commercial.invoices.newInvoice' | transloco"
                actionIcon="plus"
                (action)="openCreateModal()"
              />
            </div>
          } @else {
            @for (inv of invoicesService.invoices(); track inv.id) {
              <div
                (click)="openPreview(inv)"
                class="grid grid-cols-12 items-center gap-4 border-b border-neutral-100 px-6 py-4 text-sm transition-colors hover:bg-neutral-50/60 md:px-8 dark:border-neutral-800/80 dark:hover:bg-neutral-800/40 cursor-pointer"
              >

                <div class="col-span-2 flex flex-col">
                  <span
                    class="font-bold"
                    [class.line-through]="inv.estado === 'ANULADA'"
                    [class.text-neutral-400]="inv.estado === 'ANULADA'"
                    [class.dark:text-neutral-500]="inv.estado === 'ANULADA'"
                    [class.text-neutral-900]="inv.estado !== 'ANULADA'"
                    [class.dark:text-white]="inv.estado !== 'ANULADA'"
                  >{{
                    inv.numeroFactura
                  }}</span>
                  <span class="text-xs text-neutral-400 dark:text-neutral-500">{{
                    inv.fecha | date: 'dd/MM/yyyy HH:mm'
                  }}</span>
                </div>

                <div class="col-span-2 flex flex-col">
                  <span
                    class="font-mono font-bold"
                    [class.text-blue-600]="inv.estado !== 'ANULADA'"
                    [class.dark:text-blue-400]="inv.estado !== 'ANULADA'"
                    [class.text-neutral-400]="inv.estado === 'ANULADA'"
                    [class.dark:text-neutral-500]="inv.estado === 'ANULADA'"
                    [class.line-through]="inv.estado === 'ANULADA'"
                    >{{
                      inv.ncf || ('commercial.invoices.noNcf' | transloco)
                    }}</span
                  >
                  <span class="text-[11px] text-neutral-400 dark:text-neutral-500">{{
                    getNcfDescription(inv.tipoNcf)
                  }}</span>
                </div>

                <div class="col-span-3 flex flex-col">
                  <span
                    class="truncate font-bold"
                    [class.text-neutral-500]="inv.estado === 'ANULADA'"
                    [class.dark:text-neutral-400]="inv.estado === 'ANULADA'"
                    [class.text-neutral-900]="inv.estado !== 'ANULADA'"
                    [class.dark:text-white]="inv.estado !== 'ANULADA'"
                    >{{
                      inv.cliente?.nombreRazonSocial ||
                        ('commercial.invoices.cashClient' | transloco)
                    }}</span
                  >
                  <span class="font-mono text-xs text-neutral-400 dark:text-neutral-500">{{
                    inv.cliente?.numeroDocumento ||
                      ('commercial.invoices.finalConsumer' | transloco)
                  }}</span>
                </div>

                <div class="col-span-2 flex flex-col text-right">
                  <span
                    class="font-mono font-bold"
                    [class.line-through]="inv.estado === 'ANULADA'"
                    [class.text-neutral-400]="inv.estado === 'ANULADA'"
                    [class.dark:text-neutral-500]="inv.estado === 'ANULADA'"
                    [class.text-neutral-900]="inv.estado !== 'ANULADA'"
                    [class.dark:text-white]="inv.estado !== 'ANULADA'"
                    >{{ getCurrencySymbol(inv.moneda) }}
                    {{ inv.total | number: '1.2-2' }}</span
                  >
                  <span class="text-[11px] text-neutral-400 dark:text-neutral-500"
                    >{{ 'commercial.invoices.modal.itbis' | transloco }}
                    {{ getCurrencySymbol(inv.moneda) }}
                    {{ inv.itbis | number: '1.2-2' }}</span
                  >
                </div>

                <div
                  class="col-span-2 flex flex-col items-center justify-center"
                >
                  @if (inv.estado === 'ANULADA') {
                    <span
                      class="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20"
                    >
                      <mat-icon
                        svgIcon="ban"
                        class="icon-size-3.5"
                      ></mat-icon>
                      {{ 'commercial.invoices.status.cancelled' | transloco }}
                    </span>
                  } @else if (inv.estado === 'BORRADOR') {
                    <span
                      class="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20"
                    >
                      <mat-icon
                        svgIcon="file-text"
                        class="icon-size-3.5"
                      ></mat-icon>
                      {{ 'commercial.invoices.status.draft' | transloco }}
                    </span>
                  } @else if (inv.fiscalbridgeDocId) {
                    <span
                      class="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20"
                    >
                      <mat-icon
                        svgIcon="check-circle"
                        class="icon-size-3.5"
                      ></mat-icon>
                      {{
                        'commercial.invoices.status.ecfValidated' | transloco
                      }}
                    </span>
                  } @else if (
                    inv.tipoNcf.startsWith('E') &&
                    inv.fiscalbridgeStatus === 'FAILED'
                  ) {
                    <span
                      class="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/60 dark:border-red-500/20"
                    >
                      <mat-icon
                        svgIcon="alert-triangle"
                        class="icon-size-3.5"
                      ></mat-icon>
                      {{
                        'commercial.invoices.status.transmissionFailed'
                          | transloco
                      }}
                    </span>
                  } @else if (inv.tipoNcf.startsWith('E')) {
                    <span
                      class="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20"
                    >
                      {{ 'commercial.invoices.status.ecfPending' | transloco }}
                    </span>
                  } @else {
                    <span
                      class="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50"
                    >
                      {{
                        'commercial.invoices.status.ncfTraditional' | transloco
                      }}
                    </span>
                  }
                </div>

                <div class="col-span-1 flex justify-center">
                  <button
                    [matMenuTriggerFor]="actionMenu"
                    (click)="$event.stopPropagation()"
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <mat-icon
                      svgIcon="ellipsis-vertical"
                      class="icon-size-4"
                    ></mat-icon>
                  </button>
                  <mat-menu
                    #actionMenu="matMenu"
                    class="!rounded-xl !p-1"
                  >
                    <!-- Ver / Imprimir factura - siempre disponible -->
                    <button
                      mat-menu-item
                      (click)="openPreview(inv)"
                    >
                      <mat-icon
                        svgIcon="file-text"
                        class="icon-size-4 text-neutral-600"
                      ></mat-icon>
                      <span>{{
                        'commercial.invoices.actions.viewInvoice' | transloco
                      }}</span>
                    </button>

                    @if (inv.estado === 'BORRADOR') {
                      <button
                        mat-menu-item
                        (click)="emitDraftInvoice(inv)"
                        class="!text-blue-600 font-medium"
                      >
                        <mat-icon
                          svgIcon="send"
                          class="icon-size-4 !text-blue-600"
                        ></mat-icon>
                        <span>{{
                          'commercial.invoices.actions.emitDraft' | transloco
                        }}</span>
                      </button>
                    } @else if (inv.fiscalbridgeDocId) {
                      <button
                        mat-menu-item
                        (click)="
                          invoicesService.downloadPdf(
                            inv.id,
                            inv.numeroFactura + '.pdf'
                          )
                        "
                      >
                        <mat-icon
                          svgIcon="file-text"
                          class="icon-size-4 text-blue-600"
                        ></mat-icon>
                        <span>{{
                          'commercial.invoices.actions.downloadPdf' | transloco
                        }}</span>
                      </button>
                      <button
                        mat-menu-item
                        (click)="
                          invoicesService.downloadXml(inv.id, inv.ncf + '.xml')
                        "
                      >
                        <mat-icon
                          svgIcon="code"
                          class="icon-size-4 text-emerald-600"
                        ></mat-icon>
                        <span>{{
                          'commercial.invoices.actions.downloadXml' | transloco
                        }}</span>
                      </button>
                    } @else if (fiscalbridgeEnabled && inv.tipoNcf.startsWith('E')) {
                      <button
                        mat-menu-item
                        (click)="sendFiscalBridge(inv.id)"
                      >
                        <mat-icon
                          svgIcon="send"
                          class="icon-size-4 text-blue-600"
                        ></mat-icon>
                        <span>{{
                          'commercial.invoices.actions.transmitFiscalBridge'
                            | transloco
                        }}</span>
                      </button>
                    }
                    @if (
                      inv.estado !== 'ANULADA' &&
                      inv.estado !== 'BORRADOR' &&
                      !inv.tipoNcf.startsWith('E34') &&
                      !inv.tipoNcf.startsWith('B04')
                    ) {
                      <button
                        mat-menu-item
                        (click)="openCreditNoteModal(inv)"
                      >
                        <mat-icon
                          svgIcon="rotate-ccw"
                          class="icon-size-4 text-amber-600"
                        ></mat-icon>
                        <span>{{
                          'commercial.invoices.actions.creditNote' | transloco
                        }}</span>
                      </button>
                    }
                    @if (inv.estado !== 'ANULADA') {
                      <button
                        mat-menu-item
                        (click)="cancelInvoice(inv)"
                        class="!text-red-600"
                      >
                        <mat-icon
                          [svgIcon]="inv.estado === 'BORRADOR' ? 'trash' : 'ban'"
                          class="icon-size-4 !text-red-600"
                        ></mat-icon>
                        <span>{{
                          (inv.estado === 'BORRADOR'
                            ? 'commercial.invoices.actions.deleteDraft'
                            : 'commercial.invoices.actions.cancelInvoice') | transloco
                        }}</span>
                      </button>
                    }
                  </mat-menu>
                </div>
              </div>
            }
          }
        </div>

        <!-- Paginator -->
        @if (invoicesService.invoices().length > 0 || invoicesService.pagination().total > 0) {
          <app-paginator
            [total]="invoicesService.pagination().total"
            [currentPage]="currentPage"
            [limit]="pageLimit"
            (pageChange)="onPageChange($event)"
          />
        }
      </div>

      <ng-template #createInvoiceModalTemplate>
        <div
          class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        >

          <div
            class="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800"
          >
            <h3
              class="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white"
            >
              <mat-icon
                svgIcon="receipt"
                class="icon-size-5 text-blue-600"
              ></mat-icon>
              {{
                (fiscalbridgeEnabled
                  ? 'commercial.invoices.modal.titleElectronic'
                  : 'commercial.invoices.modal.titleTraditional') | transloco
              }}
            </h3>
            <button
              (click)="closeDialog()"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <mat-icon
                svgIcon="x"
                class="icon-size-4"
              ></mat-icon>
            </button>
          </div>

          <div class="flex flex-col gap-5 overflow-y-auto p-6">

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>{{
                  'commercial.invoices.modal.client' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="newInvoice.clienteId" placeholder="Seleccionar cliente">
                  <mat-option value="">{{
                    'commercial.invoices.finalConsumerNoRnc' | transloco
                  }}</mat-option>
                  @for (c of clientsService.clients(); track c.id) {
                    <mat-option [value]="c.id"
                      >{{ c.nombreRazonSocial }} ({{
                        c.numeroDocumento
                      }})</mat-option
                    >
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>{{
                  'commercial.invoices.modal.ncfType' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="newInvoice.tipoNcf" placeholder="Seleccionar tipo de NCF">
                  @if (fiscalbridgeEnabled) {
                    <mat-option value="E31">{{
                      'commercial.invoices.types.E31' | transloco
                    }}</mat-option>
                    <mat-option value="E32">{{
                      'commercial.invoices.types.E32' | transloco
                    }}</mat-option>
                    <mat-option value="E34">{{
                      'commercial.invoices.types.E34' | transloco
                    }}</mat-option>
                    <mat-option value="E44">{{
                      'commercial.invoices.types.E44' | transloco
                    }}</mat-option>
                    <mat-option value="E45">{{
                      'commercial.invoices.types.E45' | transloco
                    }}</mat-option>
                  } @else {
                    <mat-option value="B01">{{
                      'commercial.invoices.types.B01' | transloco
                    }}</mat-option>
                    <mat-option value="B02">{{
                      'commercial.invoices.types.B02' | transloco
                    }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>{{
                  'commercial.invoices.modal.warehouse' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="newInvoice.almacenId" placeholder="Seleccionar almacén">
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <mat-option [value]="w.id"
                      >{{ w.nombre }} ({{
                        w.sucursal?.nombre ||
                          ('commercial.invoices.centralWarehouse' | transloco)
                      }})</mat-option
                    >
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>{{
                  'commercial.invoices.modal.paymentCondition' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="newInvoice.tipoPago" placeholder="Seleccionar condición de pago">
                  <mat-option value="CONTADO">{{
                    'commercial.invoices.modal.paymentConditions.cash'
                      | transloco
                  }}</mat-option>
                  <mat-option value="CREDITO">{{
                    'commercial.invoices.modal.paymentConditions.credit'
                      | transloco
                  }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="mt-2 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <h4
                  class="text-sm text-[11px] font-bold tracking-wider text-neutral-900 uppercase dark:text-white"
                >
                  {{ 'commercial.invoices.modal.itemsSection' | transloco }}
                </h4>
                <button
                  type="button"
                  (click)="addItemRow()"
                  class="flex cursor-pointer items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <mat-icon
                    svgIcon="plus"
                    class="icon-size-3.5"
                  ></mat-icon>
                  {{ 'commercial.invoices.modal.addLine' | transloco }}
                </button>
              </div>

              <div class="flex flex-col gap-3">
                @for (item of invoiceRows; track $index) {
                  <div
                    class="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/40"
                  >

                    <div class="min-w-[200px] flex-1">
                      <mat-form-field
                        appearance="outline"
                        class="!mb-0 w-full"
                      >
                        <mat-label>{{
                          'commercial.invoices.modal.product' | transloco
                        }}</mat-label>
                        <mat-select
                          [(ngModel)]="item.productoId"
                          placeholder="Seleccionar producto"
                          (selectionChange)="
                            onProductSelected($index, item.productoId)
                          "
                        >
                          @for (p of productsService.products(); track p.id) {
                            <mat-option [value]="p.id"
                              >{{ p.codigo }} - {{ p.nombre }} ({{
                                currencySymbol
                              }}
                              {{ p.precioVenta }})</mat-option
                            >
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>

                    <div class="w-24">
                      <mat-form-field
                        appearance="outline"
                        class="!mb-0 w-full"
                      >
                        <mat-label>{{
                          'commercial.invoices.modal.quantity' | transloco
                        }}</mat-label>
                        <input
                          matInput
                          type="number"
                          [(ngModel)]="item.cantidad"
                          min="1"
                          (ngModelChange)="recalculateTotals()"
                        />
                      </mat-form-field>
                    </div>

                    <div class="w-32">
                      <mat-form-field
                        appearance="outline"
                        class="!mb-0 w-full"
                      >
                        <mat-label>{{
                          'commercial.invoices.modal.price' | transloco
                        }}</mat-label>
                        <input
                          matInput
                          type="number"
                          [(ngModel)]="item.precioUnitario"
                          (ngModelChange)="recalculateTotals()"
                        />
                      </mat-form-field>
                    </div>

                    <div
                      class="w-28 text-right font-mono text-sm font-bold text-neutral-900 dark:text-white"
                    >
                      {{ currencySymbol }}
                      {{
                        item.cantidad * item.precioUnitario | number: '1.2-2'
                      }}
                    </div>

                    @if (invoiceRows.length > 1) {
                      <button
                        type="button"
                        (click)="removeItemRow($index)"
                        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <mat-icon
                          svgIcon="trash"
                          class="icon-size-4"
                        ></mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="mt-2 flex justify-end">
              <div
                class="flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/60"
              >
                <div
                  class="flex justify-between text-sm text-neutral-600 dark:text-neutral-400"
                >
                  <span>{{
                    'commercial.invoices.modal.subtotalTaxed' | transloco
                  }}</span>
                  <span
                    class="font-mono font-bold text-neutral-900 dark:text-white"
                    >{{ currencySymbol }}
                    {{ calculatedSubtotal | number: '1.2-2' }}</span
                  >
                </div>
                <div
                  class="flex justify-between text-sm text-neutral-600 dark:text-neutral-400"
                >
                  <span>{{
                    'commercial.invoices.modal.itbis' | transloco
                  }}</span>
                  <span
                    class="font-mono font-bold text-neutral-900 dark:text-white"
                    >{{ currencySymbol }}
                    {{ calculatedItbis | number: '1.2-2' }}</span
                  >
                </div>
                <div
                  class="flex justify-between border-t border-neutral-200 pt-2 text-base font-extrabold text-neutral-900 dark:border-neutral-700 dark:text-white"
                >
                  <span>{{
                    'commercial.invoices.modal.totalToInvoice' | transloco
                  }}</span>
                  <span
                    class="font-mono text-lg text-blue-600 dark:text-blue-400"
                    >{{ currencySymbol }}
                    {{ calculatedTotal | number: '1.2-2' }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div
            class="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <button
              mat-button
              (click)="closeDialog()"
              class="rounded-xl"
            >
              {{ 'common.cancel' | transloco }}
            </button>
            <div class="flex items-center gap-2">

              @if (!fiscalbridgeEnabled) {
                <button
                  mat-stroked-button
                  (click)="saveDraft()"
                  class="rounded-xl"
                >
                  {{ 'commercial.invoices.modal.saveDraft' | transloco }}
                </button>
              }
              <button
                mat-flat-button
                color="primary"
                (click)="submitInvoice()"
                class="rounded-xl bg-blue-600 text-white"
              >
                {{
                  (fiscalbridgeEnabled
                    ? 'commercial.invoices.modal.submitElectronic'
                    : 'commercial.invoices.modal.submitTraditional') | transloco
                }}
              </button>
            </div>
          </div>
        </div>
      </ng-template>

      <ng-template #creditNoteModalTemplate>
        <div
          class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div
            class="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800"
          >
            <h3
              class="flex items-center gap-2 text-lg font-bold text-neutral-900 dark:text-white"
            >
              <mat-icon
                svgIcon="rotate-ccw"
                class="icon-size-5 text-amber-600"
              ></mat-icon>
              {{ 'commercial.creditNotes.title' | transloco }}
            </h3>
            <button
              (click)="closeDialog()"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <div class="flex flex-col gap-5 overflow-y-auto p-6">
            @if (creditNoteInvoice(); as original) {
              <div
                class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-800/60"
              >
                <div class="font-bold text-neutral-900 dark:text-white">
                  {{ original.numeroFactura }}
                  <span class="font-mono text-blue-600 dark:text-blue-400">{{
                    original.ncf
                  }}</span>
                </div>
                <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {{ original.cliente?.nombreRazonSocial || ('commercial.invoices.cashClient' | transloco) }}
                  · {{ getCurrencySymbol(original.moneda) }}
                  {{ original.total | number: '1.2-2' }}
                </div>
              </div>

              <div class="flex flex-col gap-3">
                <h4
                  class="text-[11px] font-bold uppercase tracking-wider text-neutral-900 dark:text-white"
                >
                  {{ 'commercial.creditNotes.lines' | transloco }}
                </h4>
                @for (row of creditNoteRows(); track row.detalleOriginalId) {
                  <div
                    class="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/40"
                  >
                    <div class="min-w-[180px] flex-1">
                      <div
                        class="text-sm font-semibold text-neutral-900 dark:text-white"
                      >
                        {{ row.nombre }}
                      </div>
                      <div class="text-xs text-neutral-500 dark:text-neutral-400">
                        {{
                          'commercial.creditNotes.invoiced' | transloco
                        }}: {{ row.cantidadOriginal }}
                        · {{ getCurrencySymbol(creditNoteInvoice()?.moneda) }}
                        {{ row.precioUnitario | number: '1.2-2' }}
                      </div>
                    </div>
                    <div class="w-36">
                      <mat-form-field
                        appearance="outline"
                        class="w-full !mb-0"
                      >
                        <mat-label>{{
                          'commercial.creditNotes.quantityToCredit' | transloco
                        }}</mat-label>
                        <input
                          matInput
                          type="number"
                          min="0"
                          [max]="row.cantidadOriginal"
                          [(ngModel)]="row.cantidad"
                        />
                      </mat-form-field>
                    </div>
                    <div
                      class="w-28 text-right font-mono text-sm font-bold text-neutral-900 dark:text-white"
                    >
                      {{ getCurrencySymbol(creditNoteInvoice()?.moneda) }}
                      {{
                        (row.cantidad || 0) * row.precioUnitario
                          | number: '1.2-2'
                      }}
                    </div>
                  </div>
                }
              </div>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{
                  'commercial.creditNotes.reason' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="creditNoteReason" placeholder="Seleccionar motivo">
                  <mat-option value="1">{{
                    'commercial.creditNotes.reasons.1' | transloco
                  }}</mat-option>
                  <mat-option value="2">{{
                    'commercial.creditNotes.reasons.2' | transloco
                  }}</mat-option>
                  <mat-option value="3">{{
                    'commercial.creditNotes.reasons.3' | transloco
                  }}</mat-option>
                  <mat-option value="4">{{
                    'commercial.creditNotes.reasons.4' | transloco
                  }}</mat-option>
                  <mat-option value="5">{{
                    'commercial.creditNotes.reasons.5' | transloco
                  }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>{{
                  'commercial.creditNotes.notes' | transloco
                }}</mat-label>
                <textarea
                  matInput
                  rows="2"
                  [(ngModel)]="creditNoteNotas"
                  [placeholder]="'commercial.creditNotes.notesPlaceholder' | transloco"
                ></textarea>
              </mat-form-field>

              <label
                class="flex cursor-pointer items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300"
              >
                <mat-checkbox
                  [(ngModel)]="creditNoteReturnToInventory"
                  color="primary"
                ></mat-checkbox>
                {{ 'commercial.creditNotes.returnToInventory' | transloco }}
              </label>
            }
          </div>

          <div
            class="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <button mat-button (click)="closeDialog()" class="rounded-xl">
              {{ 'common.cancel' | transloco }}
            </button>
            <button
              mat-flat-button
              color="primary"
              [disabled]="submittingCreditNote()"
              (click)="submitCreditNote()"
              class="rounded-xl bg-amber-600 text-white"
            >
              {{ 'commercial.creditNotes.submit' | transloco }}
            </button>
          </div>
        </div>
      </ng-template>
    </div>
  `,
})
export class InvoicesComponent implements OnInit {
  invoicesService = inject(InvoicesService);
  sequencesService = inject(SequencesService);
  productsService = inject(ProductsService);
  inventoryService = inject(InventoryService);
  clientsService = inject(ClientsService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  i18n = inject(TranslocoService);
  private readonly http = inject(HttpClient);

  @ViewChild('createInvoiceModalTemplate')
  createInvoiceModalTemplate!: TemplateRef<any>;
  @ViewChild('creditNoteModalTemplate')
  creditNoteModalTemplate!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  readonly creditNoteInvoice = signal<FacturaVenta | null>(null);
  readonly creditNoteRows = signal<
    {
      detalleOriginalId: string;
      nombre: string;
      cantidadOriginal: number;
      precioUnitario: number;
      cantidad: number;
    }[]
  >([]);
  creditNoteReason = '1';
  creditNoteNotas = '';
  creditNoteReturnToInventory = false;
  readonly submittingCreditNote = signal(false);

  searchQuery = '';
  selectedNcfFilter = 'ALL';
  showAdvancedFilters = false;
  currentPage = 1;
  pageLimit = 25;

  advancedFilters: {
    estado: string;
    tipoPago: string;
    metodoPago: string;
    desde: string;
    hasta: string;
    minTotal: number | null;
    maxTotal: number | null;
  } = {
    estado: '',
    tipoPago: '',
    metodoPago: '',
    desde: '',
    hasta: '',
    minTotal: null,
    maxTotal: null,
  };

  get activeFiltersCount(): number {
    let count = 0;
    if (this.advancedFilters.estado) count++;
    if (this.advancedFilters.tipoPago) count++;
    if (this.advancedFilters.metodoPago) count++;
    if (this.advancedFilters.desde) count++;
    if (this.advancedFilters.hasta) count++;
    if (this.advancedFilters.minTotal !== null) count++;
    if (this.advancedFilters.maxTotal !== null) count++;
    return count;
  }

  newInvoice: CreateInvoiceDto = {
    clienteId: '',
    almacenId: '',
    tipoNcf: 'B02',
    tipoPago: 'CONTADO',
    metodoPago: 'EFECTIVO',
    items: [],
  };

  invoiceRows: {
    productoId: string;
    cantidad: number;
    precioUnitario: number;
    tasaItbis: number;
    impuestoId?: string | null;
  }[] = [];

  calculatedSubtotal = 0;
  calculatedItbis = 0;
  calculatedTotal = 0;
  currencyCode = 'DOP';
  currencySymbol = 'RD$';
  defaultTaxRate = 18;
  fiscalbridgeEnabled = false;

  ngOnInit() {
    this.invoicesService.findAll({ page: 1, limit: this.pageLimit }).subscribe();
    this.sequencesService.findAll().subscribe();
    this.productsService.findAll().subscribe();
    this.inventoryService.getWarehouses().subscribe();
    this.clientsService.findAll().subscribe();
    this.http.get<any>(`${environment.apiUrl}/billing-config`).subscribe({
      next: (config) => {
        this.currencyCode = config.configuracion?.monedaBase || 'DOP';
        this.currencySymbol = this.getCurrencySymbol(this.currencyCode);
        this.defaultTaxRate = Number(
          config.impuestos?.find((tax: any) => tax.codigo === 'ITBIS18')
            ?.tasa ?? 18
        );
      },
    });
    this.http.get<any>(`${environment.apiUrl}/empresas/current`).subscribe({
      next: (empresa) => {
        this.fiscalbridgeEnabled = !!empresa?.fiscalbridgeEnabled;
      },
    });
  }

  setNcfFilter(type: string) {
    this.selectedNcfFilter = type;
    this.currentPage = 1;
    this.filterInvoices();
  }

  filterInvoices() {
    this.invoicesService
      .findAll({
        search: this.searchQuery || undefined,
        tipoNcf: this.selectedNcfFilter !== 'ALL' ? this.selectedNcfFilter : undefined,
        page: this.currentPage,
        limit: this.pageLimit,
      })
      .subscribe();
  }

  applyAdvancedFilters() {
    this.currentPage = 1;
    this.invoicesService.findAll({
      search: this.searchQuery || undefined,
      tipoNcf: this.selectedNcfFilter !== 'ALL' ? this.selectedNcfFilter : undefined,
      estado: this.advancedFilters.estado || undefined,
      tipoPago: this.advancedFilters.tipoPago || undefined,
      metodoPago: this.advancedFilters.metodoPago || undefined,
      desde: this.advancedFilters.desde || undefined,
      hasta: this.advancedFilters.hasta || undefined,
      minTotal: this.advancedFilters.minTotal ?? undefined,
      maxTotal: this.advancedFilters.maxTotal ?? undefined,
      page: 1,
      limit: this.pageLimit,
    }).subscribe();
  }

  resetFilters() {
    this.advancedFilters = {
      estado: '',
      tipoPago: '',
      metodoPago: '',
      desde: '',
      hasta: '',
      minTotal: null,
      maxTotal: null,
    };
    this.searchQuery = '';
    this.selectedNcfFilter = 'ALL';
    this.currentPage = 1;
    this.invoicesService.findAll({ page: 1, limit: this.pageLimit }).subscribe();
  }

  onPageChange(event: PageChangeEvent) {
    this.currentPage = event.page;
    this.pageLimit = event.limit;
    this.applyAdvancedFilters();
  }

  getEstadoFilterLabel(estado: string): string {
    const map: Record<string, string> = {
      EMITIDA: 'Emitida',
      BORRADOR: 'Borrador',
      PAGADA: 'Pagada',
      ANULADA: 'Anulada',
    };
    return estado ? (map[estado] || estado) : 'Todos';
  }

  getTipoPagoFilterLabel(tipo: string): string {
    const map: Record<string, string> = {
      CONTADO: 'Contado',
      CREDITO: 'Crédito',
    };
    return tipo ? (map[tipo] || tipo) : 'Todos';
  }

  getMetodoPagoFilterLabel(metodo: string): string {
    const map: Record<string, string> = {
      EFECTIVO: 'Efectivo',
      TARJETA: 'Tarjeta',
      TRANSFERENCIA: 'Transferencia',
      CHEQUE: 'Cheque',
    };
    return metodo ? (map[metodo] || metodo) : 'Todos';
  }

  getNcfDescription(tipo: string): string {
    const key = `commercial.invoices.types.${tipo}`;
    const translated = this.i18n.translate(key);
    return translated !== key ? translated : tipo;
  }

  openCreateModal() {
    const defaultWarehouse =
      this.inventoryService.warehouses().find((w) => w.esPrincipal) ||
      this.inventoryService.warehouses()[0];

    this.newInvoice = {
      clienteId: '',
      almacenId: defaultWarehouse ? defaultWarehouse.id : '',
      tipoNcf: this.fiscalbridgeEnabled ? 'E31' : 'B02',
      tipoPago: 'CONTADO',
      metodoPago: 'EFECTIVO',
      items: [],
    };

    this.invoiceRows = [
      {
        productoId: '',
        cantidad: 1,
        precioUnitario: 0,
        tasaItbis: this.defaultTaxRate,
      },
    ];

    this.recalculateTotals();

    this.dialogRef = this.dialog.open(this.createInvoiceModalTemplate, {
      width: '780px',
      maxWidth: '95vw',
      panelClass: ['custom-dialog-container'],
    });
  }

  addItemRow() {
    this.invoiceRows.push({
      productoId: '',
      cantidad: 1,
      precioUnitario: 0,
      tasaItbis: this.defaultTaxRate,
    });
  }

  removeItemRow(index: number) {
    this.invoiceRows.splice(index, 1);
    this.recalculateTotals();
  }

  onProductSelected(index: number, productId: string) {
    const product = this.productsService
      .products()
      .find((p) => p.id === productId);
    if (product) {
      this.invoiceRows[index].precioUnitario = Number(product.precioVenta) || 0;
      this.invoiceRows[index].tasaItbis = Number(
        product.impuesto?.tasa ?? product.taxRate ?? this.defaultTaxRate
      );
      (this.invoiceRows[index] as any).impuestoId =
        product.impuestoId || product.impuesto?.id;
      this.recalculateTotals();
    }
  }

  recalculateTotals() {
    let subtotal = 0;
    let itbis = 0;

    for (const row of this.invoiceRows) {
      const lineSubtotal = (row.cantidad || 0) * (row.precioUnitario || 0);
      const lineItbis =
        (lineSubtotal * (row.tasaItbis ?? this.defaultTaxRate)) / 100;
      subtotal += lineSubtotal;
      itbis += lineItbis;
    }

    this.calculatedSubtotal = subtotal;
    this.calculatedItbis = itbis;
    this.calculatedTotal = subtotal + itbis;
  }

  closeDialog() {
    this.dialogRef?.close();
  }

  openCreditNoteModal(inv: FacturaVenta) {
    this.invoicesService.findOne(inv.id).subscribe({
      next: (invoice) => {
        this.creditNoteInvoice.set(invoice);
        this.creditNoteRows.set(
          (invoice.detalles || []).map((det) => ({
            detalleOriginalId: det.id,
            nombre: det.producto?.nombre || det.productoId,
            cantidadOriginal: Number(det.cantidad),
            precioUnitario: Number(det.precioUnitario),
            cantidad: 0,
          }))
        );
        this.creditNoteReason = '1';
        this.creditNoteNotas = '';
        this.creditNoteReturnToInventory = false;
        this.dialogRef = this.dialog.open(this.creditNoteModalTemplate, {
          width: '720px',
          maxWidth: '95vw',
          panelClass: ['custom-dialog-container'],
        });
      },
      error: () =>
        this.snackBar.open(
          this.i18n.translate('commercial.creditNotes.loadError'),
          this.i18n.translate('common.close'),
          { duration: 3500 }
        ),
    });
  }

  submitCreditNote() {
    const original = this.creditNoteInvoice();
    if (!original) return;
    const lines = this.creditNoteRows()
      .filter((row) => row.cantidad > 0)
      .map((row) => ({
        detalleOriginalId: row.detalleOriginalId,
        cantidad: Number(row.cantidad),
      }));
    if (lines.length === 0) {
      this.snackBar.open(
        this.i18n.translate('commercial.creditNotes.minOneLine'),
        this.i18n.translate('common.close'),
        { duration: 3000 }
      );
      return;
    }

    this.submittingCreditNote.set(true);
    this.invoicesService
      .createCreditNote({
        facturaOriginalId: original.id,
        motivoModificacion: this.creditNoteReason,
        returnToInventory: this.creditNoteReturnToInventory,
        notas: this.creditNoteNotas || undefined,
        lines,
      })
      .subscribe({
        next: (created) => {
          this.submittingCreditNote.set(false);
          this.snackBar.open(
            this.i18n.translate('commercial.creditNotes.success', {
              ncf: created.ncf || created.numeroFactura,
            }),
            this.i18n.translate('common.close'),
            { duration: 3500 }
          );
          this.closeDialog();
          this.invoicesService.findAll().subscribe();
        },
        error: (err) => {
          this.submittingCreditNote.set(false);
          this.snackBar.open(
            err.error?.message ||
              this.i18n.translate('commercial.creditNotes.error'),
            this.i18n.translate('common.close'),
            { duration: 4500 }
          );
        },
      });
  }

  submitInvoice() {
    const validItems = this.invoiceRows.filter(
      (r) => r.productoId && r.cantidad > 0
    );
    if (validItems.length === 0) {
      this.snackBar.open(
        this.i18n.translate('commercial.invoices.messages.minOneProduct'),
        this.i18n.translate('common.close'),
        { duration: 3000 }
      );
      return;
    }

    const invoicePayload = {
      ...this.newInvoice,
      clienteId: this.newInvoice.clienteId?.trim() || undefined,
      almacenId: this.newInvoice.almacenId?.trim() || undefined,
      sucursalId: this.newInvoice.sucursalId?.trim() || undefined,
      tipoNcf: this.newInvoice.tipoNcf || 'B02',
      items: validItems.map((r) => ({
        productoId: r.productoId,
        cantidad: Number(r.cantidad),
        precioUnitario: Number(r.precioUnitario),
        tasaItbis: Number(r.tasaItbis),
        impuestoId: r.impuestoId || undefined,
      })),
    };

    this.invoicesService.create(invoicePayload).subscribe({
      next: (created) => {
        this.snackBar.open(
          this.i18n.translate('commercial.invoices.messages.issuedSuccess', {
            invoiceNumber: created.numeroFactura,
            ncf: created.ncf,
          }),
          this.i18n.translate('common.close'),
          { duration: 3500 }
        );
        this.closeDialog();
        this.invoicesService.findAll().subscribe();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message ||
            this.i18n.translate('commercial.invoices.messages.issueError'),
          this.i18n.translate('common.close'),
          { duration: 4500 }
        );
      },
    });
  }

  saveDraft() {
    const validItems = this.invoiceRows.filter(
      (r) => r.productoId && r.cantidad > 0
    );
    if (validItems.length === 0) {
      this.snackBar.open(
        this.i18n.translate('commercial.invoices.messages.minOneProduct'),
        this.i18n.translate('common.close'),
        { duration: 3000 }
      );
      return;
    }

    const draftPayload = {
      ...this.newInvoice,
      clienteId: this.newInvoice.clienteId?.trim() || undefined,
      almacenId: this.newInvoice.almacenId?.trim() || undefined,
      sucursalId: this.newInvoice.sucursalId?.trim() || undefined,
      esBorrador: true,
      estado: 'BORRADOR',
      tipoNcf: this.newInvoice.tipoNcf || 'B02',
      items: validItems.map((r) => ({
        productoId: r.productoId,
        cantidad: Number(r.cantidad),
        precioUnitario: Number(r.precioUnitario),
        tasaItbis: Number(r.tasaItbis),
        impuestoId: r.impuestoId || undefined,
      })),
    };

    this.invoicesService.create(draftPayload).subscribe({
      next: () => {
        this.snackBar.open(
          this.i18n.translate('commercial.invoices.messages.draftSuccess'),
          this.i18n.translate('common.close'),
          { duration: 3500 }
        );
        this.closeDialog();
        this.invoicesService.findAll().subscribe();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message ||
            this.i18n.translate('commercial.invoices.messages.issueError'),
          this.i18n.translate('common.close'),
          { duration: 4500 }
        );
      },
    });
  }

  emitDraftInvoice(inv: any) {
    if (inv.tipoNcf?.startsWith('E') && !this.fiscalbridgeEnabled) {
      this.snackBar.open(
        this.i18n.translate('commercial.invoices.messages.electronicDisabled'),
        this.i18n.translate('common.close'),
        { duration: 4000 }
      );
      return;
    }

    this.invoicesService.emitDraft(inv.id).subscribe({
      next: (emitted) => {
        this.snackBar.open(
          this.i18n.translate('commercial.invoices.messages.draftEmitSuccess', {
            ncf: emitted.ncf,
          }),
          this.i18n.translate('common.close'),
          { duration: 3500 }
        );
        this.invoicesService.findAll().subscribe();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message ||
            this.i18n.translate('commercial.invoices.messages.draftEmitError'),
          this.i18n.translate('common.close'),
          { duration: 4500 }
        );
      },
    });
  }

  getCurrencySymbol(code?: string | null): string {
    return code === 'USD' ? '$' : code === 'EUR' ? '€' : 'RD$';
  }

  sendFiscalBridge(id: string) {
    if (!this.fiscalbridgeEnabled) {
      this.snackBar.open(
        this.i18n.translate('commercial.invoices.messages.electronicDisabled'),
        this.i18n.translate('common.close'),
        { duration: 4000 }
      );
      return;
    }

    this.invoicesService.sendToFiscalBridge(id).subscribe({
      next: () => {
        this.snackBar.open(
          this.i18n.translate('commercial.invoices.messages.transmitSuccess'),
          this.i18n.translate('common.close'),
          { duration: 3000 }
        );
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message ||
            this.i18n.translate('commercial.invoices.messages.transmitError'),
          this.i18n.translate('common.close'),
          { duration: 4000 }
        );
      },
    });
  }

  cancelInvoice(inv: any) {
    const ncf = inv?.ncf ? ` (NCF: ${inv.ncf})` : '';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.i18n.translate('commercial.invoices.messages.cancelTitle'),
        message: this.i18n.translate(
          'commercial.invoices.messages.cancelConfirm',
          { ncf }
        ),
        confirmLabel: this.i18n.translate(
          'commercial.invoices.actions.cancelInvoice'
        ),
        cancelLabel: this.i18n.translate('common.cancel'),
        destructive: true,
        icon: 'trash',
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.invoicesService.cancel(inv.id || inv).subscribe({
          next: () => {
            this.snackBar.open(
              this.i18n.translate('commercial.invoices.messages.cancelSuccess'),
              this.i18n.translate('common.close'),
              { duration: 3000 }
            );
          },
          error: (err) => {
            this.snackBar.open(
              err.error?.message ||
                this.i18n.translate('commercial.invoices.messages.cancelError'),
              this.i18n.translate('common.close'),
              { duration: 4000 }
            );
          },
        });
      }
    });
  }

  openPreview(inv: FacturaVenta) {
    this.dialog.open(InvoicePreviewComponent, {
      data: inv,
      width: '100%',
      maxWidth: '820px',
      maxHeight: '95vh',
      panelClass: 'dialog-panel-no-padding',
    });
  }
}
export default InvoicesComponent;
