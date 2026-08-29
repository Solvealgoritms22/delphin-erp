import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { optimizeImageToWebP, formatBytes } from '@shared/utils/image-optimizer.util';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductsService } from '../../data/products.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { CommonModule } from '@angular/common';

export type InsumoRow = {
  insumoProductoId: string;
  cantidad: number;
  costoUnitario: number;
  unidadMedidaId?: string | null;
  notas?: string;
  nombre?: string;
  unidadNombre?: string;
};

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    TranslocoPipe,
  ],
  template: `
    <div
      class="flex h-full w-full flex-auto flex-col overflow-x-hidden overflow-y-auto px-4 py-8 sm:px-6 md:px-8"
    >
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            mat-icon-button
            (click)="goBack()"
            class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            <mat-icon svgIcon="arrow-left" class="icon-size-5"></mat-icon>
          </button>
          <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {{
                isEdit
                  ? (isService()
                    ? ('catalogs.products.editService' | transloco)
                    : ('catalogs.products.edit' | transloco))
                  : (isService()
                    ? ('catalogs.products.createService' | transloco)
                    : ('catalogs.products.create' | transloco))
              }}
            </h1>
            <p class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {{
                isEdit
                  ? (isService()
                    ? ('catalogs.products.editServiceSubtitle' | transloco)
                    : ('catalogs.products.editProductSubtitle' | transloco))
                  : (isService()
                    ? ('catalogs.products.createServiceSubtitle' | transloco)
                    : ('catalogs.products.createProductSubtitle' | transloco))
              }}
            </p>
          </div>
        </div>

        <!-- Visual Type Badge -->
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
          [ngClass]="
            isService()
              ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-300 dark:border-gray-800/50'
          "
        >
          <mat-icon [svgIcon]="isService() ? 'wrench' : 'package'" class="icon-size-4"></mat-icon>
          <span>{{ isService() ? ('catalogs.products.typeService' | transloco) : ('catalogs.products.typePhysical' | transloco) }}</span>
        </div>
      </div>

      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="flex w-full flex-col gap-6 pb-28 md:flex-row"
      >
        <div class="flex flex-auto flex-col gap-6 md:w-2/3">
          <!-- Información Básica -->
          <div
            class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h2 class="mb-5 text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon [svgIcon]="isService() ? 'wrench' : 'package'" class="icon-size-5 text-neutral-500"></mat-icon>
              {{ 'common.basicInformation' | transloco }}
            </h2>

            <!-- Tipo de Ítem Selector -->
            <div class="mb-4">
              <mat-form-field class="w-full">
                <mat-label>{{ 'catalogs.products.itemType' | transloco }}</mat-label>
                <mat-select
                  formControlName="tipo"
                  (selectionChange)="onTipoChange($event.value)"
                  [placeholder]="'catalogs.products.itemType' | transloco"
                >
                  <mat-option value="PRODUCTO">
                    <div class="flex items-center gap-2">
                      <mat-icon svgIcon="package" class="icon-size-4 text-gray-600"></mat-icon>
                      <span>{{ 'catalogs.products.typePhysical' | transloco }}</span>
                    </div>
                  </mat-option>
                  <mat-option value="SERVICIO">
                    <div class="flex items-center gap-2">
                      <mat-icon svgIcon="wrench" class="icon-size-4 text-slate-600 dark:text-slate-300"></mat-icon>
                      <span>{{ 'catalogs.products.typeService' | transloco }}</span>
                    </div>
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Name & Code -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <mat-form-field class="w-full">
                <mat-label>
                  {{ isService() ? ('catalogs.products.serviceName' | transloco) : ('catalogs.products.name' | transloco) }}
                </mat-label>
                <input
                  matInput
                  formControlName="nombre"
                  [placeholder]="isService() ? ('catalogs.products.serviceNamePlaceholder' | transloco) : ('catalogs.products.namePlaceholder' | transloco)"
                />
                @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) {
                  <mat-error>El nombre es obligatorio</mat-error>
                }
              </mat-form-field>

              <mat-form-field class="w-full">
                <mat-label>
                  {{ isService() ? ('catalogs.products.serviceCode' | transloco) : ('catalogs.products.code' | transloco) }}
                </mat-label>
                <input
                  matInput
                  formControlName="codigo"
                  [placeholder]="isService() ? 'SRV-00001' : 'PRD-00001'"
                />
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  (click)="generateCode(true)"
                  [matTooltip]="'catalogs.products.generateCode' | transloco"
                  class="text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <mat-icon svgIcon="sparkles" class="icon-size-4.5"></mat-icon>
                </button>
                <mat-hint class="text-[11px] text-neutral-400">
                  {{ 'catalogs.products.codeHint' | transloco }}
                </mat-hint>
                @if (form.get('codigo')?.touched && form.get('codigo')?.invalid) {
                  <mat-error>El código es obligatorio</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Código de barras (Solo para productos físicos) -->
            @if (!isService()) {
              <div class="mb-4">
                <mat-form-field class="w-full">
                  <mat-label>{{ 'catalogs.products.barcode' | transloco }}</mat-label>
                  <input
                    matInput
                    formControlName="codigoBarras"
                    [placeholder]="'catalogs.products.barcodePlaceholder' | transloco"
                  />
                </mat-form-field>
              </div>
            }

            <!-- Descripción -->
            <mat-form-field class="w-full">
              <mat-label>{{ 'common.description' | transloco }}</mat-label>
              <textarea
                matInput
                formControlName="descripcion"
                rows="3"
                [placeholder]="
                  isService()
                    ? ('catalogs.products.serviceDescriptionPlaceholder' | transloco)
                    : ('catalogs.products.descriptionPlaceholder' | transloco)
                "
              ></textarea>
            </mat-form-field>
          </div>

          <!-- Precios e Impuestos -->
          <div
            class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h2 class="mb-5 text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <mat-icon svgIcon="circle-dollar-sign" class="icon-size-5 text-neutral-500"></mat-icon>
              {{ 'catalogs.products.pricing' | transloco }}
            </h2>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
              <mat-form-field class="w-full">
                <mat-label>{{ 'common.price' | transloco }}</mat-label>
                <span matTextPrefix class="mr-1 text-neutral-500 font-semibold">$</span>
                <input
                  matInput
                  type="number"
                  min="0"
                  step="0.01"
                  formControlName="precioVenta"
                  placeholder="0.00"
                />
              </mat-form-field>

              <mat-form-field class="w-full">
                <mat-label>
                  {{ isService() ? ('catalogs.products.laborOrBaseCost' | transloco) : ('catalogs.products.costPrice' | transloco) }}
                </mat-label>
                <span matTextPrefix class="mr-1 text-neutral-500 font-semibold">$</span>
                <input
                  matInput
                  type="number"
                  min="0"
                  step="0.01"
                  formControlName="costo"
                  placeholder="0.00"
                />
              </mat-form-field>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <mat-form-field class="w-full">
                <mat-label>{{ 'catalogs.products.taxRate' | transloco }}</mat-label>
                <mat-select
                  formControlName="impuestoId"
                  placeholder="Selecciona un impuesto"
                >
                  <mat-option [value]="null">Sin impuesto (0%)</mat-option>
                  @for (tax of taxes(); track tax.id) {
                    <mat-option [value]="tax.id">{{
                      getTaxLabel(tax)
                    }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field class="w-full">
                <mat-label>{{ 'common.status' | transloco }}</mat-label>
                <mat-select formControlName="estado" placeholder="Seleccionar estado">
                  <mat-option value="ACTIVO">{{ 'common.active' | transloco }}</mat-option>
                  <mat-option value="INACTIVO">{{ 'common.inactive' | transloco }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <!-- Descuentos y Ofertas Especiales -->
          <div
            class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <mat-icon svgIcon="tag" class="icon-size-5 text-neutral-500"></mat-icon>
                <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
                  {{ 'catalogs.products.discountsAndOffers' | transloco }}
                </h2>
              </div>
              <mat-slide-toggle formControlName="enOferta" color="primary">
                <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {{ 'catalogs.products.enableOffer' | transloco }}
                </span>
              </mat-slide-toggle>
            </div>

            @if (form.get('enOferta')?.value) {
              <div class="flex flex-col gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 mb-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <mat-form-field class="w-full">
                    <mat-label>{{ 'catalogs.products.discountPercentage' | transloco }}</mat-label>
                    <span matTextSuffix class="text-neutral-500 font-semibold pr-2">%</span>
                    <input
                      matInput
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      formControlName="descuentoPorcentaje"
                      (input)="onDiscountPercentChange()"
                      placeholder="0"
                    />
                  </mat-form-field>

                  <mat-form-field class="w-full">
                    <mat-label>{{ 'catalogs.products.specialOfferPrice' | transloco }}</mat-label>
                    <span matTextPrefix class="mr-1 text-neutral-500 font-semibold">RD$</span>
                    <input
                      matInput
                      type="number"
                      min="0"
                      step="0.01"
                      formControlName="precioOferta"
                      (input)="onOfferPriceChange()"
                      placeholder="0.00"
                    />
                  </mat-form-field>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <mat-form-field class="w-full">
                    <mat-label>{{ 'catalogs.products.offerValidFrom' | transloco }}</mat-label>
                    <input
                      matInput
                      type="date"
                      formControlName="ofertaDesde"
                    />
                  </mat-form-field>

                  <mat-form-field class="w-full">
                    <mat-label>{{ 'catalogs.products.offerValidUntil' | transloco }}</mat-label>
                    <input
                      matInput
                      type="date"
                      formControlName="ofertaHasta"
                    />
                  </mat-form-field>
                </div>

                <!-- Resumen interactivo de ahorro -->
                <div class="flex items-center justify-between p-3 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 text-xs font-semibold">
                  <span>{{ 'catalogs.products.customerSavings' | transloco }}:</span>
                  <span class="font-mono font-bold text-sm">
                    RD$ {{ calculatedSavings() | number:'1.2-2' }} ({{ calculatedDiscountPercent() | number:'1.0-1' }}% OFF)
                  </span>
                </div>
              </div>
            }

            <!-- Descuento Máximo Permitido en Ventas -->
            <div class="mt-2">
              <mat-form-field class="w-full">
                <mat-label>{{ 'catalogs.products.maxAllowedDiscount' | transloco }}</mat-label>
                <span matTextSuffix class="text-neutral-500 font-semibold pr-2">%</span>
                <input
                  matInput
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  formControlName="descuentoMaximo"
                  placeholder="100"
                />
                <mat-hint class="text-[11px] text-neutral-400">
                  {{ 'catalogs.products.maxAllowedDiscountHint' | transloco }}
                </mat-hint>
              </mat-form-field>
            </div>
          </div>

          <!-- SECCIÓN DE INVENTARIO PARA PRODUCTOS FÍSICOS -->
          @if (!isService()) {
            <div
              class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h2 class="mb-1 text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <mat-icon svgIcon="boxes" class="icon-size-5 text-neutral-500"></mat-icon>
                {{ isEdit ? 'Inventario y Existencias' : 'Inventario y Stock Inicial' }}
              </h2>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
                {{
                  isEdit
                    ? 'Consulta o ajusta las existencias en almacén y el umbral de stock mínimo de alerta.'
                    : 'Registra las unidades iniciales disponibles y el almacén donde se custodiará el producto.'
                }}
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <mat-form-field class="w-full">
                  <mat-label>Almacén</mat-label>
                  <mat-select formControlName="almacenId" placeholder="Seleccionar almacén">
                    <mat-option [value]="null">Almacén Principal (Predeterminado)</mat-option>
                    @for (w of productsService.warehouses(); track w.id) {
                      <mat-option [value]="w.id">
                        {{ w.nombre }} {{ w.esPrincipal ? '(Principal)' : '' }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field class="w-full">
                  <mat-label>{{ isEdit ? 'Existencia actual' : 'Cantidad en existencia' }}</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    step="1"
                    formControlName="stockInicial"
                    placeholder="0"
                  />
                </mat-form-field>

                <mat-form-field class="w-full">
                  <mat-label>Stock mínimo de alerta</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    step="1"
                    formControlName="stockMinimo"
                    placeholder="0"
                  />
                </mat-form-field>
              </div>
              <p class="text-[11px] text-neutral-400">
                * Las modificaciones de existencias se registrarán automáticamente con trazabilidad en el Kardex.
              </p>
            </div>
          }

          <!-- SECCIÓN DE INSUMOS / RECETA PARA SERVICIOS (BOM) -->
          @if (isService()) {
            <div
              class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 class="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <mat-icon svgIcon="layers" class="icon-size-5 text-gray-600 dark:text-gray-400"></mat-icon>
                    {{ 'catalogs.products.recipeTitle' | transloco }}
                  </h2>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {{ 'catalogs.products.recipeDescription' | transloco }}
                  </p>
                </div>

                <!-- Toggle para activar insumos -->
                <mat-slide-toggle
                  [checked]="consumesInsumos()"
                  (change)="consumesInsumos.set($event.checked)"
                  color="primary"
                >
                  <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {{ 'catalogs.products.consumesInventory' | transloco }}
                  </span>
                </mat-slide-toggle>
              </div>

              @if (consumesInsumos()) {
                <div class="flex flex-col gap-4 mt-2">
                  <!-- Insumos Table / List -->
                  @if (insumosList().length === 0) {
                    <div class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-center">
                      <mat-icon svgIcon="layers" class="icon-size-8 text-neutral-400 mb-2"></mat-icon>
                      <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                        {{ 'catalogs.products.noInsumosYet' | transloco }}
                      </p>
                      <button
                        mat-stroked-button
                        type="button"
                        (click)="addInsumoRow()"
                        class="mt-3 text-xs cursor-pointer"
                      >
                        <mat-icon svgIcon="plus" class="icon-size-4 mr-1"></mat-icon>
                        {{ 'catalogs.products.addInsumo' | transloco }}
                      </button>
                    </div>
                  } @else {
                    <div class="flex flex-col gap-3">
                      @for (row of insumosList(); track $index) {
                        <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-800/40">
                          <!-- Insumo Product Selector -->
                          <div class="flex-1 min-w-[200px]">
                            <mat-form-field class="w-full !mb-0" subscriptSizing="dynamic">
                              <mat-label>{{ 'catalogs.products.selectInsumo' | transloco }}</mat-label>
                              <mat-select
                                [value]="row.insumoProductoId"
                                (selectionChange)="onInsumoSelected($index, $event.value)"
                              >
                                @for (prod of availablePhysicalProducts(); track prod.id) {
                                  <mat-option [value]="prod.id">
                                    {{ prod.nombre }} ({{ prod.codigo }}) - Costo: {{ prod.costo || 0 | currency }}
                                  </mat-option>
                                }
                              </mat-select>
                            </mat-form-field>
                          </div>

                          <!-- Cantidad -->
                          <div class="w-full sm:w-28">
                            <mat-form-field class="w-full !mb-0" subscriptSizing="dynamic">
                              <mat-label>{{ 'catalogs.products.quantity' | transloco }}</mat-label>
                              <input
                                matInput
                                type="number"
                                min="0.01"
                                step="0.5"
                                [(ngModel)]="row.cantidad"
                                [ngModelOptions]="{ standalone: true }"
                                (ngModelChange)="updateInsumoRow($index)"
                              />
                            </mat-form-field>
                          </div>

                          <!-- Costo Unitario -->
                          <div class="w-full sm:w-28">
                            <mat-form-field class="w-full !mb-0" subscriptSizing="dynamic">
                              <mat-label>{{ 'catalogs.products.unitCost' | transloco }}</mat-label>
                              <span matTextPrefix class="mr-1 text-neutral-400">$</span>
                              <input
                                matInput
                                type="number"
                                min="0"
                                step="0.01"
                                [(ngModel)]="row.costoUnitario"
                                [ngModelOptions]="{ standalone: true }"
                                (ngModelChange)="updateInsumoRow($index)"
                              />
                            </mat-form-field>
                          </div>

                          <!-- Subtotal Cost Field (Alineado perfectamente con mat-form-field) -->
                          <div class="w-full sm:w-32">
                            <mat-form-field class="w-full !mb-0" subscriptSizing="dynamic">
                              <mat-label>{{ 'catalogs.products.subtotalCost' | transloco }}</mat-label>
                              <input
                                matInput
                                [value]="(row.cantidad * row.costoUnitario) | currency"
                                readonly
                                class="!font-bold !text-neutral-900 dark:!text-white"
                              />
                            </mat-form-field>
                          </div>

                          <!-- Delete button (Alineado perfectamente con los inputs) -->
                          <button
                            type="button"
                            (click)="removeInsumoRow($index)"
                            class="flex size-12 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white text-red-500 shadow-2xs transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-neutral-700/80 dark:bg-neutral-900 dark:hover:border-red-900/50 dark:hover:bg-red-950/30 cursor-pointer self-center sm:self-end"
                            [matTooltip]="'common.delete' | transloco"
                            aria-label="Eliminar insumo"
                          >
                            <mat-icon svgIcon="trash" class="icon-size-4.5 text-red-500"></mat-icon>
                          </button>
                        </div>
                      }

                      <div class="flex justify-start pt-1">
                        <button
                          mat-button
                          type="button"
                          (click)="addInsumoRow()"
                          class="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold !rounded-xl cursor-pointer"
                        >
                          <mat-icon svgIcon="plus" class="icon-size-4 mr-1"></mat-icon>
                          {{ 'catalogs.products.addInsumo' | transloco }}
                        </button>
                      </div>
                    </div>

                    <!-- Cost Summary Card for Service (Neutral & Blue) -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 mt-3">
                      <div>
                        <span class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                          {{ 'catalogs.products.estimatedMaterialsCost' | transloco }}
                        </span>
                        <span class="text-base font-extrabold text-neutral-900 dark:text-white">
                          {{ totalMaterialsCost() | currency }}
                        </span>
                      </div>
                      <div>
                        <span class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                          {{ 'catalogs.products.laborOrBaseCost' | transloco }}
                        </span>
                        <span class="text-base font-extrabold text-neutral-900 dark:text-white">
                          {{ (form.get('costo')?.value || 0) | currency }}
                        </span>
                      </div>
                      <div>
                        <span class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                          {{ 'catalogs.products.totalEstimatedCost' | transloco }}
                        </span>
                        <span class="text-base font-extrabold text-blue-600 dark:text-blue-400">
                          {{ (totalMaterialsCost() + (form.get('costo')?.value || 0)) | currency }}
                        </span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="flex w-full flex-col gap-6 md:w-1/3">
          <!-- Imágenes o Portada -->
          <div
            class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h2 class="mb-1 text-lg font-bold text-neutral-900 dark:text-white">
              {{ isService() ? ('catalogs.products.serviceImage' | transloco) : ('catalogs.products.image' | transloco) }}
            </h2>
            <p class="mb-4 text-xs text-neutral-500">
              {{ isService() ? ('catalogs.products.serviceImageDescription' | transloco) : ('catalogs.products.imageDescription' | transloco) }}
            </p>

            <input
              type="file"
              #fileInput
              (change)="onFileSelected($event)"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              class="hidden"
              multiple
            />

            <div
              (click)="fileInput.click()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              [class.border-blue-500]="isDragging"
              [class.bg-blue-50]="isDragging"
              class="relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50"
            >
              @if (imagePreviews.length > 0) {
                <div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
                  @for (image of imagePreviews; track $index) {
                    <div
                      class="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <img
                        [src]="image"
                        alt="Preview"
                        class="h-full w-full object-contain p-1"
                      />
                      <!-- WebP badge -->
                      @if (imageStats()[$index]?.wasConverted) {
                        <span class="absolute bottom-1 left-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">WebP</span>
                      }
                      <button
                        type="button"
                        (click)="removeImage($event, $index)"
                        class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition group-hover:opacity-100 hover:bg-red-600 cursor-pointer"
                      >
                        <mat-icon svgIcon="x" class="icon-size-3"></mat-icon>
                      </button>
                    </div>
                  }
                </div>
                @if (imagePreviews.length < maxImages) {
                  <p class="mt-2.5 text-xs text-neutral-500">
                    <span class="text-blue-600 font-semibold">{{
                      'catalogs.products.addMore' | transloco
                    }}</span>
                    · {{ imagePreviews.length }}/{{ maxImages }}
                  </p>
                } @else {
                  <p class="mt-2.5 text-xs font-medium text-neutral-500">
                    {{
                      'catalogs.products.maxImages'
                        | transloco: { count: maxImages }
                    }}
                  </p>
                }
              } @else {
                <mat-icon
                  svgIcon="image"
                  class="mb-2 !h-12 !w-12 !text-[48px] text-neutral-400"
                ></mat-icon>
                <p
                  class="text-center text-xs font-medium text-neutral-600 dark:text-neutral-400"
                >
                  {{ 'catalogs.products.dropImage' | transloco }}
                  <span class="text-blue-600 font-semibold">{{
                    'catalogs.products.browse' | transloco
                  }}</span>
                </p>
              }
              <!-- Image processing overlay -->
              @if (imageOptimizing()) {
                <div class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
                  <div class="flex flex-col items-center gap-2">
                    <div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    <span class="text-xs font-semibold text-blue-600">Optimizando WebP…</span>
                  </div>
                </div>
              }
            </div>
            <!-- Savings summary -->
            @if (imageStats().length > 0 && imageStats()[imageStats().length - 1].wasConverted) {
              <p class="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <mat-icon svgIcon="check" class="icon-size-3"></mat-icon>
                Convertida a WebP ·
                {{ formatBytes(imageStats()[imageStats().length - 1].originalSize) }}
                → {{ formatBytes(imageStats()[imageStats().length - 1].optimizedSize) }}
              </p>
            }
            @if (imageError) {
              <p
                class="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
              >
                {{ imageError }}
              </p>
            }
            <p class="mt-3 text-center text-[11px] text-neutral-400">
              {{
                'catalogs.products.imageHint' | transloco: { count: maxImages }
              }}
            </p>
          </div>

          <!-- Atributos y Clasificación -->
          <div
            class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h2 class="mb-5 text-lg font-bold text-neutral-900 dark:text-white">
              {{ 'catalogs.products.attributes' | transloco }}
            </h2>

            <!-- Categoría -->
            <mat-form-field class="mb-4 w-full">
              <mat-label>{{ 'common.category' | transloco }}</mat-label>
              <mat-select
                formControlName="categoriaId"
                [placeholder]="'common.select' | transloco"
              >
                <mat-option [value]="null">{{
                  'common.select' | transloco
                }}</mat-option>
                @for (cat of filteredCategories(); track cat.id) {
                  <mat-option [value]="cat.id">
                    <div class="flex items-center gap-2">
                      @if (cat.icono) {
                        <img [src]="getCatImg(cat.icono)" alt="" class="size-4 object-contain" />
                      }
                      <span>{{ cat.nombre }}</span>
                    </div>
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!-- Unidad de Medida -->
            <mat-form-field class="mb-4 w-full">
              <mat-label>Unidad de medida</mat-label>
              <mat-select
                formControlName="unidadMedidaId"
                placeholder="Seleccionar unidad de medida"
              >
                <mat-option [value]="null">Ninguna</mat-option>
                @for (unit of filteredUnits(); track unit.id) {
                  <mat-option [value]="unit.id">
                    {{ unit.nombre }} ({{ unit.abreviatura }})
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!-- Marca (Solo visible para productos físicos) -->
            @if (!isService()) {
              <mat-form-field class="mb-4 w-full">
                <mat-label>{{ 'common.brand' | transloco }}</mat-label>
                <mat-select
                  formControlName="marcaId"
                  [placeholder]="'catalogs.products.brandPlaceholder' | transloco"
                >
                  <mat-option [value]="null">{{
                    'catalogs.products.brandPlaceholder' | transloco
                  }}</mat-option>
                  @for (marca of productsService.brands(); track marca.id) {
                    <mat-option [value]="marca.id">{{ marca.nombre }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <!-- Etiquetas -->
            <mat-form-field class="w-full">
              <mat-label>{{ 'common.tags' | transloco }}</mat-label>
              <input
                matInput
                formControlName="tags"
                [placeholder]="'catalogs.products.tagsPlaceholder' | transloco"
              />
            </mat-form-field>
          </div>
        </div>
      </form>

      <!-- Barra de Acciones Fija Inferior -->
      <div
        class="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-end border-t border-neutral-200 bg-white/95 backdrop-blur-sm px-8 py-4 sm:left-64 dark:border-neutral-800 dark:bg-neutral-900/95 shadow-lg"
      >
        <button
          mat-button
          type="button"
          (click)="goBack()"
          [disabled]="isLoading()"
          class="!rounded-xl cursor-pointer"
        >
          {{ 'common.discard' | transloco }}
        </button>
        <button
          mat-flat-button
          type="button"
          (click)="submit()"
          [disabled]="form.invalid || isLoading()"
          class="!rounded-xl ml-3 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          {{
            (isEdit ? 'common.saveChanges' : (isService() ? 'catalogs.products.createService' : 'catalogs.products.create'))
              | transloco
          }}
        </button>
      </div>
    </div>
  `,
})
export default class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  public productsService = inject(ProductsService);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);
  private http = inject(HttpClient);

  form!: FormGroup;
  isEdit = false;
  productId: string | null = null;
  isLoading = signal(false);

  // Insumos / Recipe for Services
  consumesInsumos = signal(false);
  insumosList = signal<InsumoRow[]>([]);

  isService = signal(false);

  // Image Upload Handling
  imagePreviews: string[] = [];
  isDragging = false;
  imageError: string | null = null;
  imageOptimizing = signal(false);
  imageStats = signal<Array<{ originalSize: number; optimizedSize: number; wasConverted: boolean }>>([]);
  readonly maxImages = 5;
  readonly formatBytes = formatBytes;

  taxes = signal<
    Array<{
      id: string;
      codigo: string;
      nombre: string;
      tasa: number;
      activo?: boolean;
    }>
  >([]);

  productStocks: any[] = [];

  availablePhysicalProducts = computed(() => {
    return this.productsService
      .products()
      .filter((p) => p.tipo !== 'SERVICIO' && p.id !== this.productId);
  });

  filteredCategories = computed(() => {
    const isServ = this.isService();
    return this.productsService.categories().filter((cat) => {
      if (isServ) {
        return cat.tipo === 'SERVICIO' || cat.tipo === 'AMBOS' || !cat.tipo;
      }
      return cat.tipo === 'PRODUCTO' || cat.tipo === 'AMBOS' || !cat.tipo;
    });
  });

  filteredUnits = computed(() => {
    const isServ = this.isService();
    return this.productsService.units().filter((unit) => {
      if (isServ) {
        return unit.tipo === 'SERVICIO';
      }
      return unit.tipo === 'PRODUCTO' || !unit.tipo;
    });
  });

  totalMaterialsCost = computed(() => {
    return this.insumosList().reduce((acc, item) => {
      return acc + (Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0);
    }, 0);
  });

  ngOnInit(): void {
    this.productsService.loadCatalogs();
    this.productsService.findAll().subscribe();

    this.http
      .get<
        Array<{
          id: string;
          codigo: string;
          nombre: string;
          tasa: number;
          activo?: boolean;
        }>
      >(`${environment.apiUrl}/billing-config/taxes`)
      .subscribe({
        next: (taxes) =>
          this.taxes.set(taxes.filter((tax) => tax.activo !== false)),
        error: () => { },
      });

    this.productId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.productId && this.productId !== 'new';

    this.form = this.fb.group({
      nombre: ['', Validators.required],
      codigo: [''],
      tipo: ['PRODUCTO', Validators.required],
      codigoBarras: [''],
      descripcion: [''],
      precioVenta: [0, [Validators.required, Validators.min(0)]],
      costo: [0, [Validators.min(0)]],
      stockInicial: [0, [Validators.min(0)]],
      stockMinimo: [0, [Validators.min(0)]],
      almacenId: [null],
      impuestoId: [null],
      categoriaId: [null],
      marcaId: [null],
      unidadMedidaId: [null],
      tags: [''],
      imagenes: [null],
      estado: ['ACTIVO'],
      enOferta: [false],
      precioOferta: [null, [Validators.min(0)]],
      descuentoPorcentaje: [0, [Validators.min(0), Validators.max(100)]],
      ofertaDesde: [null],
      ofertaHasta: [null],
      descuentoMaximo: [100, [Validators.min(0), Validators.max(100)]],
    });

    if (this.isEdit && this.productId) {
      this.productsService.findOne(this.productId).subscribe({
        next: (data) => {
          const isServ = (data.tipo || 'PRODUCTO').toUpperCase() === 'SERVICIO';
          this.isService.set(isServ);

          this.form.patchValue({
            nombre: data.nombre,
            codigo: data.codigo,
            tipo: data.tipo || 'PRODUCTO',
            codigoBarras: data.codigoBarras || '',
            descripcion: data.descripcion || '',
            precioVenta: Number(data.precioVenta),
            costo:
              data.costo !== null && data.costo !== undefined
                ? Number(data.costo)
                : 0,
            impuestoId: data.impuestoId || null,
            categoriaId: data.categoriaId || null,
            marcaId: data.marcaId || null,
            unidadMedidaId: data.unidadMedidaId || null,
            tags: data.tags || '',
            imagenes: data.imagenes || null,
            estado: data.estado || 'ACTIVO',
            enOferta: Boolean(data.enOferta),
            precioOferta:
              data.precioOferta !== null && data.precioOferta !== undefined
                ? Number(data.precioOferta)
                : null,
            descuentoPorcentaje:
              data.descuentoPorcentaje !== null && data.descuentoPorcentaje !== undefined
                ? Number(data.descuentoPorcentaje)
                : 0,
            ofertaDesde: data.ofertaDesde ? data.ofertaDesde.split('T')[0] : null,
            ofertaHasta: data.ofertaHasta ? data.ofertaHasta.split('T')[0] : null,
            descuentoMaximo:
              data.descuentoMaximo !== null && data.descuentoMaximo !== undefined
                ? Number(data.descuentoMaximo)
                : 100,
          });

          // Insumos if any
          if (data.insumos && data.insumos.length > 0) {
            this.consumesInsumos.set(true);
            this.insumosList.set(
              data.insumos.map((i: any) => ({
                insumoProductoId: i.insumoProductoId,
                cantidad: Number(i.cantidad || 1),
                costoUnitario: Number(i.costoUnitario || i.insumoProducto?.costo || 0),
                unidadMedidaId: i.unidadMedidaId || i.insumoProducto?.unidadMedidaId || null,
                notas: i.notas || '',
                nombre: i.insumoProducto?.nombre || '',
                unidadNombre: i.insumoProducto?.unidadMedida?.abreviatura || '',
              }))
            );
          }

          this.productStocks = data.stocks || [];
          if (this.productStocks.length > 0) {
            const mainStock =
              this.productStocks.find((s: any) => s.almacen?.esPrincipal) ||
              this.productStocks[0];
            if (mainStock) {
              this.form.patchValue({
                almacenId: mainStock.almacenId,
                stockInicial: Number(mainStock.cantidad || 0),
                stockMinimo: Number(mainStock.stockMinimo || 0),
              });
            }
          }

          if (data.imagenes) {
            try {
              this.imagePreviews = JSON.parse(data.imagenes);
            } catch {
              this.imagePreviews = [data.imagenes];
            }
          }
        },
        error: (_err) => {
          this.snackBar.open(
            'No se pudo cargar la información del producto',
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 3000 },
          );
          this.goBack();
        },
      });

      // Synchronize stock inputs when selecting different warehouses in edit mode
      this.form.get('almacenId')?.valueChanges.subscribe((selectedAlmacenId) => {
        if (this.productStocks && this.productStocks.length > 0) {
          const matchedStock = this.productStocks.find((s: any) =>
            selectedAlmacenId
              ? s.almacenId === selectedAlmacenId
              : s.almacen?.esPrincipal,
          );
          if (matchedStock) {
            this.form.patchValue(
              {
                stockInicial: Number(matchedStock.cantidad || 0),
                stockMinimo: Number(matchedStock.stockMinimo || 0),
              },
              { emitEvent: false },
            );
          } else {
            this.form.patchValue(
              {
                stockInicial: 0,
                stockMinimo: 0,
              },
              { emitEvent: false },
            );
          }
        }
      });
    } else {
      // Auto-detect if creating from /services route
      if (this.router.url.includes('/services')) {
        this.form.patchValue({ tipo: 'SERVICIO' });
        this.isService.set(true);
      }
      // Auto-generate initial SKU for new item
      this.generateCode(false);
    }
  }

  onTipoChange(newTipo: string) {
    const isServ = (newTipo || 'PRODUCTO').toUpperCase() === 'SERVICIO';
    this.isService.set(isServ);

    // Clean up category or unit if not permitted for the new item type
    const currentCatId = this.form.get('categoriaId')?.value;
    if (currentCatId) {
      const allowed = this.filteredCategories().some((c) => c.id === currentCatId);
      if (!allowed) {
        this.form.patchValue({ categoriaId: null });
      }
    }

    const currentUnitId = this.form.get('unidadMedidaId')?.value;
    if (currentUnitId) {
      const allowed = this.filteredUnits().some((u) => u.id === currentUnitId);
      if (!allowed) {
        this.form.patchValue({ unidadMedidaId: null });
      }
    }

    const currentCode = this.form.get('codigo')?.value || '';
    if (!currentCode || currentCode.startsWith('PRD-') || currentCode.startsWith('SRV-')) {
      this.generateCode(false);
    }
  }

  onDiscountPercentChange() {
    const price = Number(this.form.get('precioVenta')?.value || 0);
    const pct = Number(this.form.get('descuentoPorcentaje')?.value || 0);
    if (price > 0 && pct >= 0 && pct <= 100) {
      const offerPrice = price - (price * pct) / 100;
      this.form.patchValue(
        { precioOferta: Number(offerPrice.toFixed(2)) },
        { emitEvent: false },
      );
    }
  }

  onOfferPriceChange() {
    const price = Number(this.form.get('precioVenta')?.value || 0);
    const offer = Number(this.form.get('precioOferta')?.value || 0);
    if (price > 0 && offer >= 0 && offer <= price) {
      const pct = ((price - offer) / price) * 100;
      this.form.patchValue(
        { descuentoPorcentaje: Number(pct.toFixed(2)) },
        { emitEvent: false },
      );
    }
  }

  calculatedSavings(): number {
    const price = Number(this.form?.get('precioVenta')?.value || 0);
    const offer = this.form?.get('precioOferta')?.value;
    const pct = Number(this.form?.get('descuentoPorcentaje')?.value || 0);
    if (offer !== null && offer !== undefined && !isNaN(Number(offer)) && Number(offer) < price) {
      return Math.max(0, price - Number(offer));
    }
    if (pct > 0 && price > 0) {
      return (price * pct) / 100;
    }
    return 0;
  }

  calculatedDiscountPercent(): number {
    const price = Number(this.form?.get('precioVenta')?.value || 0);
    const savings = this.calculatedSavings();
    if (price > 0 && savings > 0) {
      return (savings / price) * 100;
    }
    return 0;
  }

  getCatImg(icono?: string): string {
    if (!icono) return 'category/default_category.svg';
    if (icono.startsWith('category/') || icono.startsWith('/category/')) return icono;
    if (icono.endsWith('.png') || icono.endsWith('.svg')) return `category/${icono}`;
    return `category/${icono}.png`;
  }

  addInsumoRow() {
    const available = this.availablePhysicalProducts();
    const first = available.length > 0 ? available[0] : null;

    const newRow: InsumoRow = {
      insumoProductoId: first ? first.id : '',
      cantidad: 1,
      costoUnitario: first ? Number(first.costo || 0) : 0,
      unidadMedidaId: first ? first.unidadMedidaId : null,
      nombre: first ? first.nombre : '',
      unidadNombre: first?.unidadMedida?.abreviatura || '',
      notas: '',
    };

    this.insumosList.update((prev) => [...prev, newRow]);
  }

  onInsumoSelected(index: number, productoId: string) {
    const prod = this.productsService.products().find((p) => p.id === productoId);
    this.insumosList.update((rows) => {
      const copy = [...rows];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          insumoProductoId: productoId,
          costoUnitario: prod ? Number(prod.costo || 0) : copy[index].costoUnitario,
          unidadMedidaId: prod?.unidadMedidaId || null,
          nombre: prod?.nombre || '',
          unidadNombre: prod?.unidadMedida?.abreviatura || '',
        };
      }
      return copy;
    });
  }

  updateInsumoRow(_index: number) {
    this.insumosList.update((rows) => [...rows]);
  }

  removeInsumoRow(index: number) {
    this.insumosList.update((prev) => prev.filter((_, idx) => idx !== index));
  }

  generateCode(showNotification = true) {
    const tipo = this.form.get('tipo')?.value || 'PRODUCTO';
    this.productsService.getNextCode(tipo).subscribe({
      next: (res) => {
        if (res?.code) {
          this.form.patchValue({ codigo: res.code });
          if (showNotification) {
            this.snackBar.open(
              this.transloco.translate('catalogs.products.codeGenerated') + ': ' + res.code,
              this.transloco.translate('common.close') || 'Cerrar',
              { duration: 2500 },
            );
          }
        }
      },
      error: () => { },
    });
  }

  getTaxLabel(tax: { nombre: string; tasa: number; codigo?: string }): string {
    return tax.nombre + ' (' + tax.tasa + '%)';
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.handleFiles(Array.from(target.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private async handleFiles(files: File[]): Promise<void> {
    this.imageError = null;

    if (this.imagePreviews.length + files.length > this.maxImages) {
      this.imageError = `Solo puedes subir hasta ${this.maxImages} imágenes en total.`;
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.match(/image\/(png|jpeg|jpg|webp|gif|bmp|svg\+xml)/)) {
        this.imageError = 'Solo se permiten imágenes (.png, .jpg, .jpeg, .webp, .gif).';
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    this.imageOptimizing.set(true);

    try {
      for (const file of validFiles) {
        if (this.imagePreviews.length >= this.maxImages) break;

        const result = await optimizeImageToWebP(file, 0.85, 1920, 1920);

        this.imagePreviews.push(result.base64);
        this.imageStats.update((stats) => [
          ...stats,
          {
            originalSize: result.originalSize,
            optimizedSize: result.optimizedSize,
            wasConverted: result.wasConverted,
          },
        ]);
      }

      this.form.patchValue({
        imagenes: this.imagePreviews.length > 0 ? JSON.stringify(this.imagePreviews) : null,
      });
    } catch {
      this.imageError = 'Error al procesar la imagen. Intenta con otro archivo.';
    } finally {
      this.imageOptimizing.set(false);
    }
  }

  removeImage(event: Event, index: number): void {
    event.stopPropagation();
    this.imagePreviews.splice(index, 1);
    this.imageStats.update((stats) => stats.filter((_, i) => i !== index));
    this.form.patchValue({
      imagenes:
        this.imagePreviews.length > 0
          ? JSON.stringify(this.imagePreviews)
          : null,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const isServ = (this.form.value.tipo || 'PRODUCTO').toUpperCase() === 'SERVICIO';

    // Build payload
    const payload: any = {
      ...this.form.value,
      codigoBarras: isServ ? null : this.form.value.codigoBarras,
      marcaId: isServ ? null : this.form.value.marcaId,
    };

    // If service and consumes insumos, attach insumos array
    if (isServ) {
      if (this.consumesInsumos() && this.insumosList().length > 0) {
        payload.insumos = this.insumosList().map((item) => ({
          insumoProductoId: item.insumoProductoId,
          cantidad: Number(item.cantidad || 1),
          costoUnitario: Number(item.costoUnitario || 0),
          unidadMedidaId: item.unidadMedidaId || null,
          notas: item.notas || null,
        }));
      } else {
        payload.insumos = [];
      }
    }

    if (this.isEdit && this.productId) {
      this.productsService.update(this.productId, payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackBar.open(
            isServ ? 'Servicio actualizado con éxito' : 'Producto actualizado con éxito',
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 3000 },
          );
          this.goBack();
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg =
            err.error?.message ||
            'Ocurrió un error al intentar actualizar.';
          this.snackBar.open(
            msg,
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 4000 },
          );
        },
      });
    } else {
      this.productsService.create(payload).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackBar.open(
            isServ ? 'Servicio creado con éxito' : 'Producto creado con éxito',
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 3000 },
          );
          this.goBack();
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg =
            err.error?.message ||
            'Ocurrió un error al intentar registrar.';
          this.snackBar.open(
            msg,
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 4000 },
          );
        },
      });
    }
  }

  goBack(): void {
    if (this.isService() || this.router.url.includes('/services')) {
      this.router.navigate(['/admin/catalogs/services']);
    } else {
      this.router.navigate(['/admin/catalogs/products']);
    }
  }
}
