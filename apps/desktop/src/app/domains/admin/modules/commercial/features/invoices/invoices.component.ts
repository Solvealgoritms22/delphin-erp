import { Component, inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { InvoicesService, FacturaVenta, CreateInvoiceDto, InvoiceItemDto } from '../../data/invoices.service';
import { SequencesService } from '../../data/sequences.service';
import { ProductsService } from '../../../catalogs/data/products.service';
import { InventoryService } from '../../../catalogs/data/inventory.service';
import { ClientsService } from '../../data/clients';

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
    EmptyStateComponent,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">
      
      <!-- Header -->
      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div>
          <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Facturación y Ventas
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Emisión de facturas fiscales, notas de crédito e integración con e-CF FiscalBridge (DGII).
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap items-center gap-3 mt-6 sm:mt-0 sm:ml-4">
          <button (click)="openCreateModal()" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
            <mat-icon svgIcon="plus" class="icon-size-4"></mat-icon>
            Nueva Factura / Venta
          </button>
        </div>
      </div>

      <!-- Main Scrollable Content -->
      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        
        <!-- Filters Toolbar (Inside scroll body or sticky) -->
        <div class="p-6 md:px-8 pb-4 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
          <div class="flex items-center gap-3 flex-1 min-w-[260px]">
            <div class="relative w-full max-w-md">
              <mat-icon svgIcon="search" class="icon-size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"></mat-icon>
              <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="filterInvoices()" placeholder="Buscar por cliente, NCF o número de factura..." class="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-10 pr-4 py-2 text-sm font-medium text-neutral-900 dark:text-white outline-none focus:border-blue-500">
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- NCF Type Filter Menu -->
            <button [matMenuTriggerFor]="ncfFilterMenu" type="button"
              class="flex items-center gap-2 h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors text-sm font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap shrink-0 cursor-pointer">
              <mat-icon svgIcon="hash" class="icon-size-4 text-neutral-500"></mat-icon>
              <span>{{ selectedNcfFilter === 'ALL' ? 'Todos los NCF' : selectedNcfFilter }}</span>
              <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
            </button>
            <mat-menu #ncfFilterMenu="matMenu" class="!rounded-xl !p-1">
              <button mat-menu-item (click)="setNcfFilter('ALL')"><span>Todos los NCF</span></button>
              <button mat-menu-item (click)="setNcfFilter('E31')"><span>E31 - Crédito Fiscal Electrónico</span></button>
              <button mat-menu-item (click)="setNcfFilter('E32')"><span>E32 - Consumo Electrónico</span></button>
              <button mat-menu-item (click)="setNcfFilter('E34')"><span>E34 - Nota de Crédito Electrónica</span></button>
              <button mat-menu-item (click)="setNcfFilter('B01')"><span>B01 - Crédito Fiscal Tradicional</span></button>
              <button mat-menu-item (click)="setNcfFilter('B02')"><span>B02 - Consumo Tradicional</span></button>
            </mat-menu>
          </div>
        </div>

        <!-- Invoices Table Grid -->
        <div class="grid">
          <!-- Sticky Table Header -->
          <div class="z-10 sticky top-0 grid grid-cols-12 gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div class="col-span-2">Factura / Fecha</div>
            <div class="col-span-2">Comprobante NCF</div>
            <div class="col-span-3">Cliente / RNC</div>
            <div class="col-span-2 text-right">Total Facturado</div>
            <div class="col-span-2 text-center">Estado Fiscal DGII</div>
            <div class="col-span-1 text-center">Acciones</div>
          </div>

          @if (invoicesService.invoices().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                icon="file-text"
                title="Sin facturas emitidas"
                description="Empieza emitiendo tu primera factura con comprobante fiscal o e-CF."
                actionLabel="Nueva Factura"
                actionIcon="plus"
                (action)="openCreateModal()"
              />
            </div>
          } @else {
            @for (inv of invoicesService.invoices(); track inv.id) {
              <div class="grid grid-cols-12 gap-4 py-4 px-6 md:px-8 items-center text-sm border-b border-neutral-100 dark:border-neutral-800/80 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                
                <!-- Factura / Fecha -->
                <div class="col-span-2 flex flex-col">
                  <span class="font-bold text-neutral-900 dark:text-white">{{ inv.numeroFactura }}</span>
                  <span class="text-xs text-neutral-400">{{ inv.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
                </div>

                <!-- Comprobante NCF -->
                <div class="col-span-2 flex flex-col">
                  <span class="font-mono font-bold text-blue-600 dark:text-blue-400">{{ inv.ncf || 'Sin NCF' }}</span>
                  <span class="text-[11px] text-neutral-400">{{ getNcfDescription(inv.tipoNcf) }}</span>
                </div>

                <!-- Cliente / RNC -->
                <div class="col-span-3 flex flex-col">
                  <span class="font-bold text-neutral-900 dark:text-white truncate">{{ inv.cliente?.nombreRazonSocial || 'Cliente Contado' }}</span>
                  <span class="text-xs text-neutral-400 font-mono">{{ inv.cliente?.numeroDocumento || 'Consumidor Final' }}</span>
                </div>

                <!-- Total Facturado -->
                <div class="col-span-2 text-right flex flex-col">
                  <span class="font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ inv.total | number:'1.2-2' }}</span>
                  <span class="text-[11px] text-neutral-400">ITBIS: RD$ {{ inv.itbis | number:'1.2-2' }}</span>
                </div>

                <!-- Estado Fiscal DGII -->
                <div class="col-span-2 flex flex-col items-center justify-center">
                  @if (inv.fiscalbridgeDocId) {
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center gap-1">
                      <mat-icon svgIcon="check-circle" class="icon-size-3.5"></mat-icon>
                      e-CF Validado DGII
                    </span>
                  } @else if (inv.tipoNcf.startsWith('E') && inv.fiscalbridgeStatus === 'FAILED') {
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 flex items-center gap-1">
                      <mat-icon svgIcon="alert-triangle" class="icon-size-3.5"></mat-icon>
                      Fallo Transmisión
                    </span>
                  } @else if (inv.tipoNcf.startsWith('E')) {
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      e-CF Pendiente
                    </span>
                  } @else {
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      NCF Tradicional
                    </span>
                  }
                </div>

                <!-- Acciones -->
                <div class="col-span-1 flex justify-center">
                  <button [matMenuTriggerFor]="actionMenu" class="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 cursor-pointer">
                    <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4"></mat-icon>
                  </button>
                  <mat-menu #actionMenu="matMenu" class="!rounded-xl !p-1">
                    @if (inv.fiscalbridgeDocId) {
                      <button mat-menu-item (click)="invoicesService.downloadPdf(inv.id, inv.numeroFactura + '.pdf')">
                        <mat-icon svgIcon="file-text" class="icon-size-4 text-blue-600"></mat-icon>
                        <span>Descargar PDF Oficial (RI)</span>
                      </button>
                      <button mat-menu-item (click)="invoicesService.downloadXml(inv.id, inv.ncf + '.xml')">
                        <mat-icon svgIcon="code" class="icon-size-4 text-emerald-600"></mat-icon>
                        <span>Descargar XML Firmado DGII</span>
                      </button>
                    } @else if (inv.tipoNcf.startsWith('E')) {
                      <button mat-menu-item (click)="sendFiscalBridge(inv.id)">
                        <mat-icon svgIcon="send" class="icon-size-4 text-blue-600"></mat-icon>
                        <span>Transmitir a FiscalBridge</span>
                      </button>
                    }
                    <button mat-menu-item (click)="cancelInvoice(inv)" class="!text-red-600">
                      <mat-icon svgIcon="x-circle" class="icon-size-4 !text-red-600"></mat-icon>
                      <span>Anular Factura</span>
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
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden max-h-[90vh]">
          
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="receipt" class="icon-size-5 text-blue-600"></mat-icon>
              Emisión de Factura Fiscal / e-CF
            </h3>
            <button (click)="closeDialog()" class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 flex flex-col gap-5 overflow-y-auto">
            
            <!-- Row 1: Cliente & NCF Type -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Cliente -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Cliente / RNC</mat-label>
                <mat-select [(ngModel)]="newInvoice.clienteId">
                  <mat-option value="">Consumidor Final (Sin RNC)</mat-option>
                  @for (c of clientsService.clients(); track c.id) {
                    <mat-option [value]="c.id">{{ c.nombreRazonSocial }} ({{ c.numeroDocumento }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Tipo de Comprobante NCF -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Tipo de Comprobante Fiscal</mat-label>
                <mat-select [(ngModel)]="newInvoice.tipoNcf">
                  <mat-option value="E31">E31 - Factura de Crédito Fiscal Electrónica</mat-option>
                  <mat-option value="E32">E32 - Factura de Consumo Electrónica</mat-option>
                  <mat-option value="E34">E34 - Nota de Crédito Electrónica</mat-option>
                  <mat-option value="E44">E44 - Régimen Especial Electrónico</mat-option>
                  <mat-option value="E45">E45 - Gubernamental Electrónico</mat-option>
                  <mat-option value="B01">B01 - Crédito Fiscal Tradicional</mat-option>
                  <mat-option value="B02">B02 - Consumo Tradicional</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Row 2: Almacén Despacho & Término de Pago -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Almacén -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Almacén de Despacho</mat-label>
                <mat-select [(ngModel)]="newInvoice.almacenId">
                  @for (w of inventoryService.warehouses(); track w.id) {
                    <mat-option [value]="w.id">{{ w.nombre }} ({{ w.sucursal?.nombre || 'Central' }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Tipo de Pago -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Condición de Pago</mat-label>
                <mat-select [(ngModel)]="newInvoice.tipoPago">
                  <mat-option value="CONTADO">Contado (Pago Inmediato)</mat-option>
                  <mat-option value="CREDITO">Crédito (Cuenta por Cobrar)</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Items Section -->
            <div class="flex flex-col gap-3 mt-2">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Productos y Servicios a Facturar
                </h4>
                <button type="button" (click)="addItemRow()" class="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                  <mat-icon svgIcon="plus" class="icon-size-3.5"></mat-icon> Agregar Línea
                </button>
              </div>

              <!-- Product Rows -->
              <div class="flex flex-col gap-3">
                @for (item of invoiceRows; track $index) {
                  <div class="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700">
                    
                    <!-- Producto -->
                    <div class="flex-1 min-w-[200px]">
                      <mat-form-field appearance="outline" class="w-full !mb-0">
                        <mat-label>Producto</mat-label>
                        <mat-select [(ngModel)]="item.productoId" (selectionChange)="onProductSelected($index, item.productoId)">
                          @for (p of productsService.products(); track p.id) {
                            <mat-option [value]="p.id">{{ p.codigo }} - {{ p.nombre }} (RD$ {{ p.precioVenta }})</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>

                    <!-- Cantidad -->
                    <div class="w-24">
                      <mat-form-field appearance="outline" class="w-full !mb-0">
                        <mat-label>Cant.</mat-label>
                        <input matInput type="number" [(ngModel)]="item.cantidad" min="1" (ngModelChange)="recalculateTotals()">
                      </mat-form-field>
                    </div>

                    <!-- Precio Unitario -->
                    <div class="w-32">
                      <mat-form-field appearance="outline" class="w-full !mb-0">
                        <mat-label>Precio (RD$)</mat-label>
                        <input matInput type="number" [(ngModel)]="item.precioUnitario" (ngModelChange)="recalculateTotals()">
                      </mat-form-field>
                    </div>

                    <!-- Subtotal Preview -->
                    <div class="w-28 text-right font-mono font-bold text-neutral-900 dark:text-white text-sm">
                      RD$ {{ (item.cantidad * item.precioUnitario) | number:'1.2-2' }}
                    </div>

                    <!-- Remove row -->
                    @if (invoiceRows.length > 1) {
                      <button type="button" (click)="removeItemRow($index)" class="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center cursor-pointer">
                        <mat-icon svgIcon="trash" class="icon-size-4"></mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Totals Summary Card -->
            <div class="flex justify-end mt-2">
              <div class="w-full max-w-sm rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 p-4 border border-neutral-200 dark:border-neutral-700 flex flex-col gap-2">
                <div class="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                  <span>Subtotal Gravado:</span>
                  <span class="font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ calculatedSubtotal | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                  <span>ITBIS (18%):</span>
                  <span class="font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ calculatedItbis | number:'1.2-2' }}</span>
                </div>
                <div class="border-t border-neutral-200 dark:border-neutral-700 pt-2 flex justify-between text-base font-extrabold text-neutral-900 dark:text-white">
                  <span>Total a Facturar:</span>
                  <span class="font-mono text-blue-600 dark:text-blue-400 text-lg">RD$ {{ calculatedTotal | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 shrink-0">
            <button mat-button (click)="closeDialog()" class="rounded-xl">Cancelar</button>
            <button mat-flat-button color="primary" (click)="submitInvoice()" class="rounded-xl bg-blue-600 text-white">
              Emitir y Transmitir Factura
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

  @ViewChild('createInvoiceModalTemplate') createInvoiceModalTemplate!: TemplateRef<any>;
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

  invoiceRows: { productoId: string; cantidad: number; precioUnitario: number; tasaItbis: number }[] = [];

  calculatedSubtotal = 0;
  calculatedItbis = 0;
  calculatedTotal = 0;

  ngOnInit() {
    this.invoicesService.findAll().subscribe();
    this.sequencesService.findAll().subscribe();
    this.productsService.findAll().subscribe();
    this.inventoryService.getWarehouses().subscribe();
    this.clientsService.findAll().subscribe();
  }

  setNcfFilter(type: string) {
    this.selectedNcfFilter = type;
    this.filterInvoices();
  }

  filterInvoices() {
    this.invoicesService.findAll({
      search: this.searchQuery,
      tipoNcf: this.selectedNcfFilter !== 'ALL' ? this.selectedNcfFilter : undefined,
    }).subscribe();
  }

  getNcfDescription(tipo: string): string {
    switch (tipo) {
      case 'E31': return 'Factura de Crédito Fiscal Electrónica';
      case 'E32': return 'Factura de Consumo Electrónica';
      case 'E34': return 'Nota de Crédito Electrónica';
      case 'E44': return 'Régimen Especial Electrónico';
      case 'E45': return 'Gubernamental Electrónico';
      case 'B01': return 'Crédito Fiscal Tradicional';
      case 'B02': return 'Consumo Tradicional';
      default: return tipo;
    }
  }

  openCreateModal() {
    const defaultWarehouse = this.inventoryService.warehouses().find(w => w.esPrincipal) || this.inventoryService.warehouses()[0];
    
    this.newInvoice = {
      clienteId: '',
      almacenId: defaultWarehouse ? defaultWarehouse.id : '',
      tipoNcf: 'E31',
      tipoPago: 'CONTADO',
      metodoPago: 'EFECTIVO',
      items: [],
    };

    this.invoiceRows = [
      { productoId: '', cantidad: 1, precioUnitario: 0, tasaItbis: 18 },
    ];

    this.recalculateTotals();

    this.dialogRef = this.dialog.open(this.createInvoiceModalTemplate, {
      width: '780px',
      maxWidth: '95vw',
      panelClass: ['custom-dialog-container'],
    });
  }

  addItemRow() {
    this.invoiceRows.push({ productoId: '', cantidad: 1, precioUnitario: 0, tasaItbis: 18 });
  }

  removeItemRow(index: number) {
    this.invoiceRows.splice(index, 1);
    this.recalculateTotals();
  }

  onProductSelected(index: number, productId: string) {
    const product = this.productsService.products().find(p => p.id === productId);
    if (product) {
      this.invoiceRows[index].precioUnitario = Number(product.precioVenta) || 0;
      this.invoiceRows[index].tasaItbis = Number((product as any).taxRate) || 18;
      this.recalculateTotals();
    }
  }

  recalculateTotals() {
    let subtotal = 0;
    let itbis = 0;

    for (const row of this.invoiceRows) {
      const lineSubtotal = (row.cantidad || 0) * (row.precioUnitario || 0);
      const lineItbis = (lineSubtotal * (row.tasaItbis || 18)) / 100;
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
    const validItems = this.invoiceRows.filter(r => r.productoId && r.cantidad > 0);
    if (validItems.length === 0) {
      this.snackBar.open('Debes agregar al menos un producto a la factura', 'Cerrar', { duration: 3000 });
      return;
    }

    this.newInvoice.items = validItems.map(r => ({
      productoId: r.productoId,
      cantidad: Number(r.cantidad),
      precioUnitario: Number(r.precioUnitario),
      tasaItbis: Number(r.tasaItbis),
    }));

    this.invoicesService.create(this.newInvoice).subscribe({
      next: (created) => {
        this.snackBar.open(`Factura ${created.numeroFactura} emitida (${created.ncf})`, 'Cerrar', { duration: 3500 });
        this.closeDialog();
        this.invoicesService.findAll().subscribe();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al emitir factura', 'Cerrar', { duration: 4500 });
      }
    });
  }

  sendFiscalBridge(id: string) {
    this.invoicesService.sendToFiscalBridge(id).subscribe({
      next: () => {
        this.snackBar.open('Factura transmitida a FiscalBridge exitosamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error al transmitir a FiscalBridge', 'Cerrar', { duration: 4000 });
      }
    });
  }

  cancelInvoice(inv: any) {
    const ncf = inv?.ncf ? ` (NCF: ${inv.ncf})` : '';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Anular Factura',
        message: `¿Estás seguro de que deseas anular esta factura${ncf}? El inventario será restaurado.`,
        confirmLabel: 'Anular Factura',
        cancelLabel: 'Cancelar',
        destructive: true,
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.invoicesService.cancel(inv.id || inv).subscribe({
          next: () => {
            this.snackBar.open('Factura anulada y stock devuelto al almacén', 'Cerrar', { duration: 3000 });
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'No se pudo anular la factura', 'Cerrar', { duration: 4000 });
          }
        });
      }
    });
  }
}
export default InvoicesComponent;
