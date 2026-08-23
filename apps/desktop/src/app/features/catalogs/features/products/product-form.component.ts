import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductsService } from '../../data/products.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslocoPipe,
  ],
  template: `
    <div
      class="flex h-full w-full flex-auto flex-col overflow-x-hidden overflow-y-auto px-4 py-8 sm:px-6 md:px-8"
    >
      <div class="mb-8 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            mat-icon-button
            (click)="goBack()"
            class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <mat-icon
              svgIcon="arrow-left"
              class="icon-size-5"
            ></mat-icon>
          </button>
          <div>
            <h1
              class="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
            >
              {{
                (isEdit ? 'catalogs.products.edit' : 'catalogs.products.create')
                  | transloco
              }}
            </h1>
            <p class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {{ isEdit ? 'Modifica los detalles y atributos del producto.' : 'Completa la información básica, precios y atributos para registrar el producto.' }}
            </p>
          </div>
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
              {{ 'common.basicInformation' | transloco }}
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <mat-form-field class="w-full">
                <mat-label>{{ 'catalogs.products.name' | transloco }}</mat-label>
                <input
                  matInput
                  formControlName="nombre"
                  [placeholder]="'catalogs.products.namePlaceholder' | transloco"
                />
                @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) {
                  <mat-error>El nombre del producto es obligatorio</mat-error>
                }
              </mat-form-field>

              <mat-form-field class="w-full">
                <mat-label>{{ 'catalogs.products.code' | transloco }}</mat-label>
                <input
                  matInput
                  formControlName="codigo"
                  placeholder="PRD-00001"
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
                  <mat-error>El código del producto es obligatorio</mat-error>
                }
              </mat-form-field>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <mat-form-field class="w-full">
                <mat-label>Tipo de ítem</mat-label>
                <mat-select formControlName="tipo">
                  <mat-option value="PRODUCTO">Producto Físico</mat-option>
                  <mat-option value="SERVICIO">Servicio</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field class="w-full">
                <mat-label>Código de barras</mat-label>
                <input
                  matInput
                  formControlName="codigoBarras"
                  placeholder="742100023412"
                />
              </mat-form-field>
            </div>

            <mat-form-field class="w-full">
              <mat-label>{{ 'common.description' | transloco }}</mat-label>
              <textarea
                matInput
                formControlName="descripcion"
                rows="4"
                [placeholder]="
                  'catalogs.products.descriptionPlaceholder' | transloco
                "
              ></textarea>
            </mat-form-field>
          </div>

          <!-- Precios e Impuestos -->
          <div
            class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h2 class="mb-5 text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">   
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
                <mat-label>{{ 'catalogs.products.costPrice' | transloco }}</mat-label>
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
                <mat-label>Estado</mat-label>
                <mat-select formControlName="estado">
                  <mat-option value="ACTIVO">Activo</mat-option>
                  <mat-option value="INACTIVO">Inactivo</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <!-- Inventario y Stock (Solo productos físicos) -->
          @if (form.get('tipo')?.value !== 'SERVICIO') {
            <div
              class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h2 class="mb-1 text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
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
                  <mat-select formControlName="almacenId">
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
        </div>

        <div class="flex w-full flex-col gap-6 md:w-1/3">
          <!-- Imágenes -->
          <div
            class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h2 class="mb-1 text-lg font-bold text-neutral-900 dark:text-white">
              {{ 'catalogs.products.image' | transloco }}
            </h2>
            <p class="mb-4 text-xs text-neutral-500">
              {{ 'catalogs.products.imageDescription' | transloco }}
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
                        alt="Product preview"
                        class="h-full w-full object-contain p-1"
                      />
                      <button
                        type="button"
                        (click)="removeImage($event, $index)"
                        [attr.aria-label]="'Remove image ' + ($index + 1)"
                        class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition group-hover:opacity-100 hover:bg-red-600"
                      >
                        <mat-icon
                          svgIcon="x"
                          class="icon-size-3"
                        ></mat-icon>
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
            </div>
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

          <!-- Atributos y Clasificación (Unidad de Medida, Categoría, Marca) -->
          <div
            class="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h2 class="mb-5 text-lg font-bold text-neutral-900 dark:text-white">
              {{ 'catalogs.products.attributes' | transloco }}
            </h2>

            <!-- Unidad de Medida -->
            <mat-form-field class="mb-4 w-full">
              <mat-label>Unidad de medida</mat-label>
              <mat-select formControlName="unidadMedidaId">
                <mat-option [value]="null">Ninguna</mat-option>
                @for (unit of productsService.units(); track unit.id) {
                  <mat-option [value]="unit.id">
                    {{ unit.nombre }} ({{ unit.abreviatura }})
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!-- Categoría -->
            <mat-form-field class="mb-4 w-full">
              <mat-label>{{ 'common.category' | transloco }}</mat-label>
              <mat-select formControlName="categoriaId">
                <mat-option [value]="null">{{
                  'common.select' | transloco
                }}</mat-option>
                @for (cat of productsService.categories(); track cat.id) {
                  <mat-option [value]="cat.id">{{ cat.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!-- Marca -->
            <mat-form-field class="mb-4 w-full">
              <mat-label>{{ 'common.brand' | transloco }}</mat-label>
              <mat-select formControlName="marcaId">
                <mat-option [value]="null">{{
                  'catalogs.products.brandPlaceholder' | transloco
                }}</mat-option>
                @for (marca of productsService.brands(); track marca.id) {
                  <mat-option [value]="marca.id">{{ marca.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

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
          class="!rounded-xl"
        >
          {{ 'common.discard' | transloco }}
        </button>
        <button
          mat-flat-button
          [color]="'primary'"
          type="button"
          class="ml-4 !rounded-xl !px-6 !font-semibold"
          (click)="submit()"
          [disabled]="form.invalid || isLoading()"
        >
          @if (isLoading()) {
            Guardando...
          } @else {
            {{ (isEdit ? 'common.save' : 'common.create') | transloco }}
          }
        </button>
      </div>
    </div>
  `,
})
export default class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected productsService = inject(ProductsService);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);
  private http = inject(HttpClient);

  isEdit = false;
  productId: string | null = null;
  form!: FormGroup;
  isLoading = signal(false);
  productStocks: any[] = [];

  isDragging = false;
  imagePreviews: string[] = [];
  imageError = '';
  readonly maxImages = 5;
  readonly taxes = signal<
    Array<{
      id: string;
      codigo: string;
      nombre: string;
      tasa: number;
      activo?: boolean;
    }>
  >([]);

  ngOnInit() {
    this.productsService.loadCatalogs();
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
    });

    if (this.isEdit && this.productId) {
      this.productsService.findOne(this.productId).subscribe({
        next: (data) => {
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
          });

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
      // Auto-generate initial SKU for new product
      this.generateCode(false);

      // Regenerate prefix when switching between PRODUCTO and SERVICIO if code was default/empty
      this.form.get('tipo')?.valueChanges.subscribe((_tipo) => {
        const currentCode = this.form.get('codigo')?.value || '';
        if (!currentCode || currentCode.startsWith('PRD-') || currentCode.startsWith('SRV-')) {
          this.generateCode(false);
        }
      });
    }
  }

  generateCode(showNotification = true) {
    const tipo = this.form.get('tipo')?.value || 'PRODUCTO';
    this.productsService.getNextCode(tipo).subscribe({
      next: (res) => {
        if (res?.code) {
          this.form.patchValue({ codigo: res.code });
          if (showNotification) {
            this.snackBar.open(
              `${this.transloco.translate('catalogs.products.codeGenerated')}: ${res.code}`,
              this.transloco.translate('common.close') || 'Cerrar',
              { duration: 2500 },
            );
          }
        }
      },
      error: () => {},
    });
  }

  getTaxLabel(tax: { codigo: string; nombre: string; tasa: number }): string {
    if (tax.codigo.startsWith('ITBIS')) return `ITBIS ${tax.tasa}%`;
    return `${tax.nombre} · ${tax.tasa}%`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.handleFiles(Array.from(input.files || []));
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    this.handleFiles(Array.from(event.dataTransfer?.files || []));
  }

  async handleFiles(files: File[]) {
    this.imageError = '';
    const availableSlots = this.maxImages - this.imagePreviews.length;
    if (availableSlots <= 0) {
      this.imageError = `Solo puedes cargar hasta ${this.maxImages} imágenes.`;
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      this.imageError = `Solo se agregaron ${availableSlots} imágenes. El máximo es ${this.maxImages}.`;
    }

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        this.imageError = 'Solo puedes cargar archivos de imagen.';
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.imageError = 'Cada imagen debe pesar como máximo 5 MB.';
        continue;
      }

      try {
        const optimized = await this.optimizeImage(file);
        this.imagePreviews = [...this.imagePreviews, optimized].slice(
          0,
          this.maxImages,
        );
        this.form.patchValue({
          imagenes: JSON.stringify(this.imagePreviews),
        });
      } catch {
        this.imageError = 'No se pudo procesar la imagen seleccionada.';
      }
    }
  }

  private async optimizeImage(file: File): Promise<string> {
    try {
      if (typeof createImageBitmap === 'function') {
        const bmp = await createImageBitmap(file);
        const maxDim = 700;
        let width = bmp.width;
        let height = bmp.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bmp, 0, 0, width, height);
          bmp.close?.();
          return canvas.toDataURL('image/jpeg', 0.82);
        }
      }
    } catch {}

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 700;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
            return;
          }
          resolve(e.target?.result as string);
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  removeImage(event: Event, index: number) {
    event.stopPropagation();
    this.imagePreviews = this.imagePreviews.filter(
      (_, imageIndex) => imageIndex !== index,
    );
    this.form.patchValue({
      imagenes: this.imagePreviews.length
        ? JSON.stringify(this.imagePreviews)
        : null,
    });
  }

  goBack() {
    this.router.navigate(['/admin/catalogs/products']);
  }

  submit() {
    if (this.form.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    const formRaw = this.form.value;
    const payload: any = {
      ...formRaw,
      categoriaId: formRaw.categoriaId ? formRaw.categoriaId : null,
      marcaId: formRaw.marcaId ? formRaw.marcaId : null,
      unidadMedidaId: formRaw.unidadMedidaId ? formRaw.unidadMedidaId : null,
      impuestoId: formRaw.impuestoId ? formRaw.impuestoId : null,
      almacenId: formRaw.almacenId ? formRaw.almacenId : null,
      stockInicial:
        formRaw.stockInicial !== null &&
        formRaw.stockInicial !== '' &&
        !isNaN(Number(formRaw.stockInicial))
          ? Number(formRaw.stockInicial)
          : 0,
      stockMinimo:
        formRaw.stockMinimo !== null &&
        formRaw.stockMinimo !== '' &&
        !isNaN(Number(formRaw.stockMinimo))
          ? Number(formRaw.stockMinimo)
          : 0,
      precioVenta: Number(formRaw.precioVenta ?? 0),
      costo:
        formRaw.costo !== null &&
          formRaw.costo !== '' &&
          !isNaN(Number(formRaw.costo))
          ? Number(formRaw.costo)
          : null,
    };

    const request$ =
      this.isEdit && this.productId
        ? this.productsService.update(this.productId, payload)
        : this.productsService.create(payload);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open(
          this.isEdit
            ? 'Producto actualizado con éxito'
            : 'Producto creado con éxito',
          this.transloco.translate('common.close') || 'Cerrar',
          { duration: 3000 },
        );
        this.goBack();
      },
      error: (err) => {
        this.isLoading.set(false);
        const errorMsg =
          err?.error?.message ||
          'Error al guardar el producto. Verifica los campos requeridos.';
        this.snackBar.open(
          errorMsg,
          this.transloco.translate('common.close') || 'Cerrar',
          { duration: 4000 },
        );
      },
    });
  }
}
