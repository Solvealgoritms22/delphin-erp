import {
  Component,
  inject,
  OnInit,
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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import {
  InvoicesService,
  CreateInvoiceDto,
} from '../../data/invoices.service';
import { SequencesService } from '../../data/sequences.service';
import { ProductsService } from '../../../catalogs/data/products.service';
import { InventoryService } from '../../../catalogs/data/inventory.service';
import { ClientsService } from '../../data/clients';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';

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
    TranslocoPipe,
    EmptyStateComponent,
  ],
  template: `
    <div
      class="flex h-full min-w-0 flex-auto flex-col overflow-hidden bg-neutral-50/50 dark:bg-neutral-950"
    >
      <!-- Header -->
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

        <!-- Actions -->
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

      <!-- Main Scrollable Content -->
      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">
        <!-- Filters Toolbar -->
        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 pb-4 md:px-8 dark:border-neutral-800 dark:bg-neutral-900"
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
            <!-- NCF Type Filter Menu -->
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

        <!-- Invoices Table Grid -->
        <div class="grid">
          <!-- Sticky Table Header -->
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
                class="grid grid-cols-12 items-center gap-4 border-b border-neutral-100 px-6 py-4 text-sm transition-colors hover:bg-neutral-50/50 md:px-8 dark:border-neutral-800/80 dark:hover:bg-neutral-800/30"
              >
                <!-- Factura / Fecha -->
                <div class="col-span-2 flex flex-col">
                  <span class="font-bold text-neutral-900 dark:text-white">{{
                    inv.numeroFactura
                  }}</span>
                  <span class="text-xs text-neutral-400">{{
                    inv.fecha | date: 'dd/MM/yyyy HH:mm'
                  }}</span>
                </div>

                <!-- Comprobante NCF -->
                <div class="col-span-2 flex flex-col">
                  <span
                    class="font-mono font-bold text-blue-600 dark:text-blue-400"
                    >{{
                      inv.ncf || ('commercial.invoices.noNcf' | transloco)
                    }}</span
                  >
                  <span class="text-[11px] text-neutral-400">{{
                    getNcfDescription(inv.tipoNcf)
                  }}</span>
                </div>

                <!-- Cliente / RNC -->
                <div class="col-span-3 flex flex-col">
                  <span
                    class="truncate font-bold text-neutral-900 dark:text-white"
                    >{{
                      inv.cliente?.nombreRazonSocial ||
                        ('commercial.invoices.cashClient' | transloco)
                    }}</span
                  >
                  <span class="font-mono text-xs text-neutral-400">{{
                    inv.cliente?.numeroDocumento ||
                      ('commercial.invoices.finalConsumer' | transloco)
                  }}</span>
                </div>

                <!-- Total Facturado -->
                <div class="col-span-2 flex flex-col text-right">
                  <span
                    class="font-mono font-bold text-neutral-900 dark:text-white"
                    >{{ getCurrencySymbol(inv.moneda) }}
                    {{ inv.total | number: '1.2-2' }}</span
                  >
                  <span class="text-[11px] text-neutral-400"
                    >{{ 'commercial.invoices.modal.itbis' | transloco }}
                    {{ getCurrencySymbol(inv.moneda) }}
                    {{ inv.itbis | number: '1.2-2' }}</span
                  >
                </div>

                <!-- Estado Fiscal DGII -->
                <div
                  class="col-span-2 flex flex-col items-center justify-center"
                >
                  @if (inv.fiscalbridgeDocId) {
                    <span
                      class="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
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
                      class="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400"
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
                      class="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                    >
                      {{ 'commercial.invoices.status.ecfPending' | transloco }}
                    </span>
                  } @else {
                    <span
                      class="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      {{
                        'commercial.invoices.status.ncfTraditional' | transloco
                      }}
                    </span>
                  }
                </div>

                <!-- Acciones -->
                <div class="col-span-1 flex justify-center">
                  <button
                    [matMenuTriggerFor]="actionMenu"
                    class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
                    @if (inv.fiscalbridgeDocId) {
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
                    } @else if (inv.tipoNcf.startsWith('E')) {
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
                    <button
                      mat-menu-item
                      (click)="cancelInvoice(inv)"
                      class="!text-red-600"
                    >
                      <mat-icon
                        svgIcon="x-circle"
                        class="icon-size-4 !text-red-600"
                      ></mat-icon>
                      <span>{{
                        'commercial.invoices.actions.cancelInvoice' | transloco
                      }}</span>
                    </button>
                  </mat-menu>
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- ================= MODAL: NUEVA FACTURA ================= -->
      <ng-template #createInvoiceModalTemplate>
        <div
          class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          <!-- Modal Header -->
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
              {{ 'commercial.invoices.modal.title' | transloco }}
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

          <!-- Modal Body -->
          <div class="flex flex-col gap-5 overflow-y-auto p-6">
            <!-- Row 1: Cliente & NCF Type -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <!-- Cliente -->
              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>{{
                  'commercial.invoices.modal.client' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="newInvoice.clienteId">
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

              <!-- Tipo de Comprobante NCF -->
              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>{{
                  'commercial.invoices.modal.ncfType' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="newInvoice.tipoNcf">
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
                  <mat-option value="B01">{{
                    'commercial.invoices.types.B01' | transloco
                  }}</mat-option>
                  <mat-option value="B02">{{
                    'commercial.invoices.types.B02' | transloco
                  }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Row 2: Almacén Despacho & Término de Pago -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <!-- Almacén -->
              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>{{
                  'commercial.invoices.modal.warehouse' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="newInvoice.almacenId">
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

              <!-- Tipo de Pago -->
              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>{{
                  'commercial.invoices.modal.paymentCondition' | transloco
                }}</mat-label>
                <mat-select [(ngModel)]="newInvoice.tipoPago">
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

            <!-- Items Section -->
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

              <!-- Product Rows -->
              <div class="flex flex-col gap-3">
                @for (item of invoiceRows; track $index) {
                  <div
                    class="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/40"
                  >
                    <!-- Producto -->
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

                    <!-- Cantidad -->
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

                    <!-- Precio Unitario -->
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

                    <!-- Subtotal Preview -->
                    <div
                      class="w-28 text-right font-mono text-sm font-bold text-neutral-900 dark:text-white"
                    >
                      {{ currencySymbol }}
                      {{
                        item.cantidad * item.precioUnitario | number: '1.2-2'
                      }}
                    </div>

                    <!-- Remove row -->
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

            <!-- Totals Summary Card -->
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

          <!-- Modal Footer -->
          <div
            class="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <button
              mat-button
              (click)="closeDialog()"
              class="rounded-xl"
            >
              {{ 'common.cancel' | transloco }}
            </button>
            <button
              mat-flat-button
              color="primary"
              (click)="submitInvoice()"
              class="rounded-xl bg-blue-600 text-white"
            >
              {{ 'commercial.invoices.modal.submit' | transloco }}
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
  private dialogRef?: MatDialogRef<any>;

  searchQuery = '';
  selectedNcfFilter = 'ALL';

  // Invoice creation form state
  newInvoice: CreateInvoiceDto = {
    clienteId: '',
    almacenId: '',
    tipoNcf: 'E31',
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

  ngOnInit() {
    this.invoicesService.findAll().subscribe();
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
  }

  setNcfFilter(type: string) {
    this.selectedNcfFilter = type;
    this.filterInvoices();
  }

  filterInvoices() {
    this.invoicesService
      .findAll({
        search: this.searchQuery,
        tipoNcf:
          this.selectedNcfFilter !== 'ALL' ? this.selectedNcfFilter : undefined,
      })
      .subscribe();
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
      tipoNcf: 'E31',
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

    this.newInvoice.items = validItems.map((r) => ({
      productoId: r.productoId,
      cantidad: Number(r.cantidad),
      precioUnitario: Number(r.precioUnitario),
      tasaItbis: Number(r.tasaItbis),
      impuestoId: r.impuestoId || undefined,
    }));

    this.invoicesService.create(this.newInvoice).subscribe({
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

  getCurrencySymbol(code?: string | null): string {
    return code === 'USD' ? '$' : code === 'EUR' ? '€' : 'RD$';
  }

  sendFiscalBridge(id: string) {
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
}
export default InvoicesComponent;
