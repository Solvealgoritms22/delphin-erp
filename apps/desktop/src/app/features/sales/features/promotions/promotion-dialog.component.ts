import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PromotionsService, Promocion } from '../../data/promotions.service';
import { ProductsService } from '../../../catalogs/data/products.service';

export interface PromotionDialogData {
  promotion?: Promocion | null;
  isEdit?: boolean;
}

@Component({
  selector: 'app-promotion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    TranslocoPipe,
  ],
  template: `
    <div
      class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
    >
      <!-- Modal Header -->
      <div
        class="flex shrink-0 items-center justify-between border-b border-neutral-100 px-6 py-5 dark:border-neutral-800"
      >
        <div>
          <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
            {{
              isEdit
                ? ('commercial.promotions.editTitle' | transloco)
                : ('commercial.promotions.createTitle' | transloco)
            }}
          </h2>
          <p class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {{
              isEdit
                ? ('commercial.promotions.editSubtitle' | transloco)
                : ('commercial.promotions.createSubtitle' | transloco)
            }}
          </p>
        </div>

        <button
          type="button"
          (click)="dialogRef.close()"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:hover:text-neutral-300 cursor-pointer"
        >
          <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
        </button>
      </div>

      <!-- Form Body -->
      <form
        [formGroup]="form"
        (ngSubmit)="save()"
        class="flex flex-col gap-4 overflow-y-auto p-6"
      >
        <!-- Información General -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'common.name' | transloco }}</mat-label>
            <input
              matInput
              formControlName="nombre"
              [placeholder]="'commercial.promotions.namePlaceholder' | transloco"
            />
            @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) {
              <mat-error>El nombre es obligatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'commercial.promotions.couponCode' | transloco }}</mat-label>
            <input
              matInput
              formControlName="codigoCupon"
              placeholder="VERANO2026"
            />
            <mat-hint class="text-[11px]">Opcional. Si se deja vacío aplica automáticamente</mat-hint>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'common.description' | transloco }}</mat-label>
          <textarea
            matInput
            formControlName="descripcion"
            rows="2"
            [placeholder]="'commercial.promotions.descriptionPlaceholder' | transloco"
          ></textarea>
        </mat-form-field>

        <!-- Tipo y Valor de Descuento -->
        <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
          <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            {{ 'commercial.promotions.discountRules' | transloco }}
          </h4>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.promotions.discountType' | transloco }}</mat-label>
              <mat-select
                formControlName="tipoDescuento"
                [placeholder]="'common.select' | transloco"
              >
                <mat-option value="PORCENTAJE">
                  {{ 'commercial.promotions.types.percentage' | transloco }} (%)
                </mat-option>
                <mat-option value="MONTO_FIJO">
                  {{ 'commercial.promotions.types.fixedAmount' | transloco }} (RD$)
                </mat-option>
                <mat-option value="PRECIO_FIJO">
                  {{ 'commercial.promotions.types.fixedPrice' | transloco }} (RD$)
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.promotions.discountValue' | transloco }}</mat-label>
              @if (form.get('tipoDescuento')?.value === 'PORCENTAJE') {
                <span matTextSuffix class="pr-2 font-semibold text-neutral-500">%</span>
              } @else {
                <span matTextPrefix class="mr-1 font-semibold text-neutral-500">RD$</span>
              }
              <input
                matInput
                type="number"
                min="0"
                step="0.01"
                formControlName="valorDescuento"
                placeholder="0.00"
              />
              @if (form.get('valorDescuento')?.touched && form.get('valorDescuento')?.invalid) {
                <mat-error>Ingresa un valor válido</mat-error>
              }
            </mat-form-field>
          </div>
        </div>

        <!-- Alcance y Aplicación -->
        <div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
          <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            {{ 'commercial.promotions.scopeSection' | transloco }}
          </h4>

          <mat-form-field appearance="outline" class="w-full mb-2">
            <mat-label>{{ 'commercial.promotions.scope' | transloco }}</mat-label>
            <mat-select
              formControlName="alcance"
              [placeholder]="'common.select' | transloco"
            >
              <mat-option value="TODOS">{{ 'commercial.promotions.scopes.all' | transloco }}</mat-option>
              <mat-option value="CATEGORIA">{{ 'commercial.promotions.scopes.category' | transloco }}</mat-option>
              <mat-option value="MARCA">{{ 'commercial.promotions.scopes.brand' | transloco }}</mat-option>
              <mat-option value="PRODUCTOS">{{ 'commercial.promotions.scopes.products' | transloco }}</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Categoría Selector -->
          @if (form.get('alcance')?.value === 'CATEGORIA') {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'common.category' | transloco }}</mat-label>
              <mat-select
                formControlName="categoriaId"
                [placeholder]="'common.select' | transloco"
              >
                @for (cat of productsService.categories(); track cat.id) {
                  <mat-option [value]="cat.id">{{ cat.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }

          <!-- Marca Selector -->
          @if (form.get('alcance')?.value === 'MARCA') {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'common.brand' | transloco }}</mat-label>
              <mat-select
                formControlName="marcaId"
                [placeholder]="'common.select' | transloco"
              >
                @for (brand of productsService.brands(); track brand.id) {
                  <mat-option [value]="brand.id">{{ brand.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }

          <!-- Productos Multi-select -->
          @if (form.get('alcance')?.value === 'PRODUCTOS') {
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.promotions.selectProducts' | transloco }}</mat-label>
              <mat-select
                formControlName="productoIds"
                multiple
                [placeholder]="'common.select' | transloco"
              >
                @for (p of productsService.products(); track p.id) {
                  <mat-option [value]="p.id">
                    {{ p.codigo }} - {{ p.nombre }} (RD$ {{ p.precioVenta | number:'1.2-2' }})
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
        </div>

        <!-- Vigencia y Restricciones -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'commercial.promotions.startDate' | transloco }}</mat-label>
            <input matInput type="date" formControlName="fechaInicio" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'commercial.promotions.endDate' | transloco }}</mat-label>
            <input matInput type="date" formControlName="fechaFin" />
          </mat-form-field>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'commercial.promotions.minQuantity' | transloco }}</mat-label>
            <input
              matInput
              type="number"
              min="1"
              step="1"
              formControlName="cantidadMinima"
              placeholder="1"
            />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'commercial.promotions.minAmount' | transloco }}</mat-label>
            <span matTextPrefix class="mr-1 text-neutral-500 font-semibold">RD$</span>
            <input
              matInput
              type="number"
              min="0"
              step="0.01"
              formControlName="montoMinimo"
              placeholder="0.00"
            />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'commercial.promotions.usageLimit' | transloco }}</mat-label>
            <input
              matInput
              type="number"
              min="1"
              step="1"
              formControlName="limiteUsos"
              placeholder="Ilimitado"
            />
          </mat-form-field>
        </div>

        <!-- Opciones adicionales -->
        <div class="flex flex-wrap items-center justify-between gap-4 py-2 border-t border-neutral-100 dark:border-neutral-800">
          <mat-slide-toggle formControlName="esAcumulable" color="primary">
            <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {{ 'commercial.promotions.isCumulative' | transloco }}
            </span>
          </mat-slide-toggle>

          <div class="w-40">
            <mat-form-field appearance="outline" class="!mb-0 w-full">
              <mat-label>{{ 'common.status' | transloco }}</mat-label>
              <mat-select formControlName="estado" [placeholder]="'common.select' | transloco">
                <mat-option value="ACTIVO">{{ 'common.active' | transloco }}</mat-option>
                <mat-option value="PAUSADO">{{ 'commercial.promotions.paused' | transloco }}</mat-option>
                <mat-option value="INACTIVO">{{ 'common.inactive' | transloco }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </form>

      <!-- Modal Footer -->
      <div
        class="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <button
          mat-button
          type="button"
          (click)="dialogRef.close()"
          class="!rounded-xl cursor-pointer"
        >
          {{ 'common.cancel' | transloco }}
        </button>
        <button
          mat-flat-button
          color="primary"
          (click)="save()"
          [disabled]="form.invalid || isSaving()"
          class="!rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          {{ (isEdit ? 'common.saveChanges' : 'common.create') | transloco }}
        </button>
      </div>
    </div>
  `,
})
export class PromotionDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<PromotionDialogComponent>);
  data = inject<PromotionDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private promotionsService = inject(PromotionsService);
  public productsService = inject(ProductsService);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  form!: FormGroup;
  isEdit = false;
  isSaving = signal(false);

  ngOnInit(): void {
    this.isEdit = Boolean(this.data?.isEdit && this.data?.promotion);
    const promo = this.data?.promotion;

    this.productsService.loadCatalogs();
    this.productsService.findAll().subscribe();

    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .split('T')[0];

    this.form = this.fb.group({
      nombre: [promo?.nombre || '', Validators.required],
      descripcion: [promo?.descripcion || ''],
      codigoCupon: [promo?.codigoCupon || ''],
      tipoDescuento: [promo?.tipoDescuento || 'PORCENTAJE', Validators.required],
      valorDescuento: [
        promo?.valorDescuento !== undefined ? Number(promo.valorDescuento) : 10,
        [Validators.required, Validators.min(0)],
      ],
      alcance: [promo?.alcance || 'TODOS', Validators.required],
      categoriaId: [promo?.categoriaId || null],
      marcaId: [promo?.marcaId || null],
      productoIds: [
        promo?.productos?.map((pp) => pp.productoId) || [],
      ],
      fechaInicio: [
        promo?.fechaInicio ? promo.fechaInicio.split('T')[0] : today,
        Validators.required,
      ],
      fechaFin: [
        promo?.fechaFin ? promo.fechaFin.split('T')[0] : nextMonth,
        Validators.required,
      ],
      cantidadMinima: [
        promo?.cantidadMinima !== undefined && promo?.cantidadMinima !== null
          ? Number(promo.cantidadMinima)
          : 1,
        [Validators.min(1)],
      ],
      montoMinimo: [
        promo?.montoMinimo !== undefined && promo?.montoMinimo !== null
          ? Number(promo.montoMinimo)
          : 0,
        [Validators.min(0)],
      ],
      limiteUsos: [promo?.limiteUsos || null],
      esAcumulable: [Boolean(promo?.esAcumulable)],
      prioridad: [promo?.prioridad || 0],
      estado: [promo?.estado || 'ACTIVO'],
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.form.value;

    const payload: any = {
      nombre: formVal.nombre,
      descripcion: formVal.descripcion || null,
      codigoCupon: formVal.codigoCupon ? formVal.codigoCupon.toUpperCase() : null,
      tipoDescuento: formVal.tipoDescuento,
      valorDescuento: Number(formVal.valorDescuento),
      alcance: formVal.alcance,
      categoriaId: formVal.alcance === 'CATEGORIA' ? formVal.categoriaId : null,
      marcaId: formVal.alcance === 'MARCA' ? formVal.marcaId : null,
      productoIds: formVal.alcance === 'PRODUCTOS' ? formVal.productoIds : [],
      fechaInicio: new Date(`${formVal.fechaInicio}T00:00:00.000Z`).toISOString(),
      fechaFin: new Date(`${formVal.fechaFin}T23:59:59.999Z`).toISOString(),
      cantidadMinima: Number(formVal.cantidadMinima || 1),
      montoMinimo: Number(formVal.montoMinimo || 0),
      limiteUsos: formVal.limiteUsos ? Number(formVal.limiteUsos) : null,
      esAcumulable: Boolean(formVal.esAcumulable),
      prioridad: Number(formVal.prioridad || 0),
      estado: formVal.estado || 'ACTIVO',
    };

    if (this.isEdit && this.data.promotion?.id) {
      this.promotionsService.update(this.data.promotion.id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open(
            'Promoción actualizada con éxito',
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.snackBar.open(
            err.error?.message || 'Error al actualizar la promoción',
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 4000 },
          );
        },
      });
    } else {
      this.promotionsService.create(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open(
            'Promoción creada con éxito',
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 3000 },
          );
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.snackBar.open(
            err.error?.message || 'Error al crear la promoción',
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 4000 },
          );
        },
      });
    }
  }
}
