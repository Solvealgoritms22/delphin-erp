import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';

export type CategoryIllustrationItem = {
  id: string;
  file: string;
  label: string;
};

export type CategoryIllustrationGroup = {
  nameKey: string;
  items: CategoryIllustrationItem[];
};

export const CATEGORY_ILLUSTRATION_GROUPS: CategoryIllustrationGroup[] = [
  {
    nameKey: 'catalogs.categories.freshFoodGroup',
    items: [
      { id: 'frutas', file: 'frutas.png', label: 'Frutas' },
      { id: 'vegetales', file: 'vegetales.png', label: 'Vegetales' },
      { id: 'carnes', file: 'carnes.png', label: 'Carnes' },
      { id: 'lacteos', file: 'lacteos.png', label: 'Lácteos' },
      { id: 'huevos', file: 'huevos.png', label: 'Huevos' },
      { id: 'embutidos', file: 'embutidos.png', label: 'Embutidos' },
      { id: 'congelados', file: 'congelados.png', label: 'Congelados' },
      { id: 'granos', file: 'granos.png', label: 'Granos y Cereales' },
      { id: 'condimentos', file: 'condimentos.png', label: 'Condimentos' },
      { id: 'enlatados', file: 'enlatados.png', label: 'Enlatados' },
    ],
  },
  {
    nameKey: 'catalogs.categories.drinksBakeryGroup',
    items: [
      { id: 'bebidas', file: 'bebidas.png', label: 'Bebidas' },
      { id: 'cafe_y_te', file: 'cafe_y_te.png', label: 'Café y Té' },
      { id: 'panaderia', file: 'panaderia.png', label: 'Panadería' },
      { id: 'dulces', file: 'dulces.png', label: 'Dulces y Golosinas' },
      { id: 'snacks', file: 'snacks.png', label: 'Snacks' },
    ],
  },
  {
    nameKey: 'catalogs.categories.homeCareGroup',
    items: [
      { id: 'cocina_hogar', file: 'cocina_hogar.png', label: 'Cocina y Hogar' },
      { id: 'muebles', file: 'muebles.png', label: 'Muebles' },
      { id: 'electrodomesticos', file: 'electrodomesticos.png', label: 'Electrodomésticos' },
      { id: 'detergentes', file: 'detergentes.png', label: 'Detergentes y Limpieza' },
      { id: 'higiene', file: 'higiene.png', label: 'Higiene Personal' },
    ],
  },
  {
    nameKey: 'catalogs.categories.fashionBeautyGroup',
    items: [
      { id: 'ropa', file: 'ropa.png', label: 'Ropa' },
      { id: 'calzado', file: 'calzado.png', label: 'Calzado' },
      { id: 'accesorios', file: 'accesorios.png', label: 'Accesorios' },
      { id: 'cosmeticos', file: 'cosmeticos.png', label: 'Cosméticos' },
      { id: 'bebe', file: 'bebe.png', label: 'Bebé y Maternidad' },
    ],
  },
  {
    nameKey: 'catalogs.categories.techCommercialGroup',
    items: [
      { id: 'tecnologia', file: 'tecnologia.png', label: 'Tecnología' },
      { id: 'ferreteria', file: 'ferreteria.png', label: 'Ferretería' },
      { id: 'papeleria', file: 'papeleria.png', label: 'Papelería y Oficina' },
      { id: 'escolar', file: 'escolar.png', label: 'Artículos Escolares' },
      { id: 'mascotas', file: 'mascotas.png', label: 'Mascotas' },
    ],
  },
];

const KNOWN_MAP: Record<string, string> = {
  accesorios: 'accesorios.png',
  bebe: 'bebe.png',
  bebidas: 'bebidas.png',
  cafe_y_te: 'cafe_y_te.png',
  calzado: 'calzado.png',
  carnes: 'carnes.png',
  cocina_hogar: 'cocina_hogar.png',
  condimentos: 'condimentos.png',
  congelados: 'congelados.png',
  cosmeticos: 'cosmeticos.png',
  detergentes: 'detergentes.png',
  dulces: 'dulces.png',
  electrodomesticos: 'electrodomesticos.png',
  embutidos: 'embutidos.png',
  enlatados: 'enlatados.png',
  escolar: 'escolar.png',
  ferreteria: 'ferreteria.png',
  frutas: 'frutas.png',
  granos: 'granos.png',
  higiene: 'higiene.png',
  huevos: 'huevos.png',
  lacteos: 'lacteos.png',
  mascotas: 'mascotas.png',
  muebles: 'muebles.png',
  panaderia: 'panaderia.png',
  papeleria: 'papeleria.png',
  ropa: 'ropa.png',
  snacks: 'snacks.png',
  tecnologia: 'tecnologia.png',
  vegetales: 'vegetales.png',
  apple: 'frutas.png',
  carrot: 'vegetales.png',
  beef: 'carnes.png',
  milk: 'lacteos.png',
  egg: 'huevos.png',
  fish: 'carnes.png',
  croissant: 'panaderia.png',
  coffee: 'cafe_y_te.png',
  beer: 'bebidas.png',
  pizza: 'snacks.png',
  'ice-cream': 'dulces.png',
  wheat: 'granos.png',
  shirt: 'ropa.png',
  'shopping-bag': 'accesorios.png',
  'shopping-basket': 'frutas.png',
  sparkles: 'cosmeticos.png',
  gem: 'accesorios.png',
  laptop: 'tecnologia.png',
  smartphone: 'tecnologia.png',
  monitor: 'tecnologia.png',
  pill: 'higiene.png',
  wrench: 'ferreteria.png',
  hammer: 'ferreteria.png',
  armchair: 'muebles.png',
  book: 'papeleria.png',
  package: 'default_category.svg',
};

export const COLOR_OPTIONS = [
  {
    id: 'emerald',
    label: 'Esmeralda',
    bgClass: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800/50',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'amber',
    label: 'Ámbar',
    bgClass: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800/50',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'rose',
    label: 'Rosa / Rojo',
    bgClass: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-800/50',
    dotClass: 'bg-rose-500',
  },
  {
    id: 'blue',
    label: 'Azul',
    bgClass: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800/50',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'purple',
    label: 'Púrpura',
    bgClass: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-800/50',
    dotClass: 'bg-purple-500',
  },
  {
    id: 'neutral',
    label: 'Neutro',
    bgClass: 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
    dotClass: 'bg-neutral-500',
  },
];

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col w-full max-h-[90vh] overflow-hidden">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
          {{ (isEdit ? 'catalogs.categories.edit' : 'catalogs.categories.new') | transloco }}
        </h2>
        <button mat-icon-button (click)="dialogRef.close()" class="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer">
          <mat-icon svgIcon="x" class="icon-size-5"></mat-icon>
        </button>
      </div>

      <!-- Form Body -->
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col p-6 overflow-y-auto gap-5">
        <!-- Visual Illustration Preview & Color Chooser -->
        <div class="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-800">
          <!-- Selected Illustration Preview Badge -->
          <div
            class="flex size-20 shrink-0 items-center justify-center rounded-2xl border p-2 shadow-xs transition-transform duration-200 hover:scale-105"
            [ngClass]="activeBadgeClass()"
          >
            <img
              [src]="previewSrc()"
              [alt]="selectedLabel()"
              (error)="onPreviewError($event)"
              class="size-16 object-contain drop-shadow-sm"
            />
          </div>

          <div class="flex flex-col gap-2 flex-1 w-full text-center sm:text-left">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {{ 'catalogs.categories.icon' | transloco }}
              </p>
              <p class="text-sm font-bold text-neutral-900 dark:text-white">
                {{ selectedLabel() }}
              </p>
            </div>

            <!-- Color Palette Selector -->
            <div class="flex items-center justify-center sm:justify-start gap-2 pt-1">
              @for (col of colors; track col.id) {
                <button
                  type="button"
                  (click)="selectColor(col.id)"
                  class="size-6 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center"
                  [ngClass]="[
                    col.dotClass,
                    selectedColor() === col.id ? 'border-neutral-900 dark:border-white scale-110 shadow-xs' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                  ]"
                  [attr.aria-label]="col.label"
                  [matTooltip]="col.label"
                >
                  <span class="sr-only">{{ col.label }}</span>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Name & Description Fields -->
        <div class="grid grid-cols-1 gap-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'common.name' | transloco }}</mat-label>
            <input matInput formControlName="nombre" placeholder="Frutas y Vegetales" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'common.description' | transloco }}</mat-label>
            <textarea matInput formControlName="descripcion" rows="2" placeholder="Descripción breve de la categoría..."></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ 'common.status' | transloco }}</mat-label>
            <mat-select formControlName="estado">
              <mat-option value="ACTIVO">{{ 'common.active' | transloco }}</mat-option>
              <mat-option value="INACTIVO">{{ 'common.inactive' | transloco }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Illustration Picker Grid -->
        <div class="flex flex-col gap-3 pt-1 border-t border-neutral-100 dark:border-neutral-800">
          <div class="flex items-center justify-between gap-3">
            <span class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {{ 'catalogs.categories.icon' | transloco }}
            </span>

            <!-- Filter Search -->
            <div class="relative w-48 sm:w-56">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                [ngModelOptions]="{ standalone: true }"
                [placeholder]="'catalogs.categories.searchIcon' | transloco"
                class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-1.5 pl-7 pr-2.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <mat-icon svgIcon="search" class="icon-size-3.5 absolute left-2 top-2 text-neutral-400"></mat-icon>
            </div>
          </div>

          <!-- Illustration Groups List (with padding so active border & rings are completely visible) -->
          <div class="flex flex-col gap-5 max-h-64 overflow-y-auto p-2 -m-2">
            <!-- Option for Default / No Illustration -->
            <div class="flex flex-col gap-2">
              <div class="grid grid-cols-4 sm:grid-cols-5 gap-3">
                <button
                  type="button"
                  (click)="selectIllustration(null)"
                  class="flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer group text-center"
                  [ngClass]="
                    !selectedFile() || selectedFile() === 'default_category.svg'
                      ? 'border-blue-500 bg-blue-50/90 text-blue-700 dark:bg-blue-950/60 dark:border-blue-400 dark:text-blue-300 ring-4 ring-blue-500/20 shadow-sm'
                      : 'border-neutral-200/80 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800/80'
                  "
                  [matTooltip]="'catalogs.categories.noIllustration' | transloco"
                >
                  <img
                    src="category/default_category.svg"
                    alt="Default"
                    class="size-11 object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
                  />
                  <span class="mt-1.5 text-[11px] font-medium truncate w-full block">
                    {{ 'catalogs.categories.noIllustrationShort' | transloco }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Categories Groups -->
            @for (group of filteredGroups(); track group.nameKey) {
              <div class="flex flex-col gap-2">
                <span class="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  {{ group.nameKey | transloco }}
                </span>
                <div class="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  @for (item of group.items; track item.file) {
                    <button
                      type="button"
                      (click)="selectIllustration(item)"
                      class="flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-pointer group text-center"
                      [ngClass]="
                        selectedFile() === item.file
                          ? 'border-blue-500 bg-blue-50/90 text-blue-700 dark:bg-blue-950/60 dark:border-blue-400 dark:text-blue-300 ring-4 ring-blue-500/20 shadow-sm'
                          : 'border-neutral-200/80 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800/80'
                      "
                      [matTooltip]="item.label"
                    >
                      <img
                        [src]="'category/' + item.file"
                        [alt]="item.label"
                        class="size-11 object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
                        loading="lazy"
                      />
                      <span class="mt-1.5 text-[11px] font-medium truncate w-full block">
                        {{ item.label }}
                      </span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Footer Buttons -->
        <div class="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <button mat-button type="button" (click)="dialogRef.close()" class="cursor-pointer">
            {{ 'common.cancel' | transloco }}
          </button>
          <button
            mat-flat-button
            type="submit"
            [disabled]="form.invalid"
            class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
          >
            {{ 'common.save' | transloco }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class CategoryDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<CategoryDialogComponent>);
  data = inject(MAT_DIALOG_DATA);
  fb = inject(FormBuilder);
  transloco = inject(TranslocoService);

  isEdit = false;
  form!: FormGroup;

  colors = COLOR_OPTIONS;
  groups = CATEGORY_ILLUSTRATION_GROUPS;

  selectedFile = signal<string>('');
  selectedColor = signal<string>('emerald');
  searchQuery = '';

  activeBadgeClass = computed(() => {
    const col = this.colors.find((c) => c.id === this.selectedColor()) || this.colors[0];
    return col.bgClass;
  });

  previewSrc = computed(() => {
    const file = this.selectedFile();
    if (!file || file === 'default_category.svg') {
      return 'category/default_category.svg';
    }
    return `category/${file}`;
  });

  selectedLabel = computed(() => {
    const file = this.selectedFile();
    if (!file || file === 'default_category.svg') {
      return this.transloco.translate('catalogs.categories.noIllustration');
    }
    for (const g of this.groups) {
      const match = g.items.find((i) => i.file === file || i.id === file);
      if (match) return match.label;
    }
    return file.replace('.png', '');
  });

  filteredGroups = computed(() => {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.groups;

    return this.groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => i.label.toLowerCase().includes(query) || i.id.toLowerCase().includes(query) || i.file.toLowerCase().includes(query)
        ),
      }))
      .filter((g) => g.items.length > 0);
  });

  ngOnInit() {
    this.isEdit = !!this.data?.category;
    const cat = this.data?.category;

    let initialFile = '';
    if (cat?.icono) {
      const clean = cat.icono.replace(/^(\/?category\/)/, '').replace(/\.png$/, '').toLowerCase().trim();
      if (KNOWN_MAP[clean]) {
        initialFile = KNOWN_MAP[clean];
      } else if (cat.icono.endsWith('.png')) {
        initialFile = cat.icono.replace(/^(\/?category\/)/, '');
      }
    }
    this.selectedFile.set(initialFile);
    this.selectedColor.set(cat?.color || 'emerald');

    this.form = this.fb.group({
      nombre: [cat?.nombre || '', Validators.required],
      descripcion: [cat?.descripcion || ''],
      icono: [this.selectedFile()],
      color: [this.selectedColor()],
      estado: [cat?.estado || 'ACTIVO'],
    });
  }

  onPreviewError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'category/default_category.svg';
    }
  }

  selectIllustration(item: CategoryIllustrationItem | null) {
    if (!item) {
      this.selectedFile.set('');
      this.form.patchValue({ icono: '' });
    } else {
      this.selectedFile.set(item.file);
      this.form.patchValue({ icono: item.file });
    }
  }

  selectColor(colorId: string) {
    this.selectedColor.set(colorId);
    this.form.patchValue({ color: colorId });
  }

  submit() {
    if (this.form.invalid) return;

    const payload = {
      ...this.form.value,
      icono: this.selectedFile(),
      color: this.selectedColor(),
    };

    if (this.isEdit) {
      this.dialogRef.close({ action: 'update', data: payload });
    } else {
      this.dialogRef.close({ action: 'create', data: payload });
    }
  }
}
