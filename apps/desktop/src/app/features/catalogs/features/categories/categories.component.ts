import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { CategoriesService, Category } from '../../data/categories.service';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { CategoryDialogComponent } from './category-dialog.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { PlusIcon, PencilIcon } from 'ng-animated-icons';

const KNOWN_ILLUSTRATIONS_MAP: Record<string, string> = {
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
  // Mapeo retrocompatible
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

@Component({
  selector: 'app-categories',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    MatButtonToggleModule,
    FormsModule,
    EmptyStateComponent,
    TableSkeletonComponent,
    TranslocoPipe,
    PlusIcon,
    PencilIcon,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">
      <!-- Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-start sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 gap-4"
      >
        <div class="flex flex-col gap-4">
          <div>
            <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {{ 'catalogs.categories.title' | transloco }}
            </div>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {{ 'catalogs.categories.description' | transloco }}
            </p>
          </div>

          <!-- Tipo Filter (Debajo del subtítulo) -->
          <div class="flex items-center">
            <mat-button-toggle-group
              [value]="tipoFilter()"
              (change)="tipoFilter.set($event.value)"
              aria-label="Filtrar por tipo"
              class="!border !border-neutral-200 dark:!border-neutral-700 !rounded-xl overflow-hidden !h-9"
            >
              <mat-button-toggle value="TODOS" class="!text-xs !font-medium !px-3">
                {{ 'catalogs.categories.typeAll' | transloco }}
              </mat-button-toggle>
              <mat-button-toggle value="PRODUCTO" class="!text-xs !font-medium !px-3">
                {{ 'catalogs.categories.typeProducts' | transloco }}
              </mat-button-toggle>
              <mat-button-toggle value="SERVICIO" class="!text-xs !font-medium !px-3">
                {{ 'catalogs.categories.typeServices' | transloco }}
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>
        </div>

        <div class="flex shrink-0 items-center sm:self-start">
          <button
            mat-flat-button
            (click)="openDialog()"
            class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer !h-10"
          >
            <i-plus [size]="18" class="mr-2" />
            {{ 'catalogs.categories.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Content / Table Grid -->
      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">
          <!-- Table Header -->
          <div
            class="inventory-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div>{{ 'common.name' | transloco }}</div>
            <div>{{ 'catalogs.categories.appliesTo' | transloco }}</div>
            <div class="hidden sm:block">{{ 'common.description' | transloco }}</div>
            <div>{{ 'common.status' | transloco }}</div>
            <div>{{ 'common.actions' | transloco }}</div>
          </div>

          <!-- Skeleton Loading -->
          @if (categoriesService.isLoading()) {
            <app-table-skeleton [gridClass]="'inventory-grid'" [rows]="6" [cells]="cells4" />
          } @else if (filteredCategories().length === 0) {
            <!-- Empty State -->
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                type="no-data"
                [title]="'catalogs.categories.emptyTitle' | transloco"
                [description]="'catalogs.categories.emptyDescription' | transloco"
                [actionLabel]="'catalogs.categories.new' | transloco"
                actionIcon="plus"
                (action)="openDialog()"
              />
            </div>
          } @else {
            <!-- Table Rows -->
            @for (cat of filteredCategories(); track cat.id) {
              <div
                class="inventory-grid grid items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
              >
                <!-- Name with Representative 3D Illustration -->
                <div class="flex items-center gap-3.5 min-w-0">
                  <div
                    class="flex size-11 shrink-0 items-center justify-center rounded-xl border p-1.5 shadow-xs transition-transform duration-200 hover:scale-105"
                    [ngClass]="getCategoryBadgeClass(cat.color)"
                  >
                    <img
                      [src]="getCategoryIllustration(cat.icono)"
                      [alt]="cat.nombre"
                      (error)="onImgError($event)"
                      class="size-8 object-contain drop-shadow-xs"
                      loading="lazy"
                    />
                  </div>
                  <div class="min-w-0">
                    <div class="font-medium text-neutral-900 dark:text-white truncate">
                      {{ cat.nombre }}
                    </div>
                    <div class="sm:hidden text-xs text-neutral-400 truncate">
                      {{ cat.descripcion || '-' }}
                    </div>
                  </div>
                </div>

                <!-- Tipo / Aplica a -->
                <div>
                  @if (cat.tipo === 'PRODUCTO') {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {{ 'catalogs.categories.typeProductsShort' | transloco }}
                    </span>
                  } @else if (cat.tipo === 'SERVICIO') {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {{ 'catalogs.categories.typeServicesShort' | transloco }}
                    </span>
                  } @else {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {{ 'catalogs.categories.typeAllShort' | transloco }}
                    </span>
                  }
                </div>

                <!-- Description -->
                <div class="hidden sm:block text-sm text-neutral-500 dark:text-neutral-400 truncate">
                  {{ cat.descripcion || '-' }}
                </div>

                <!-- Status -->
                <div>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    [ngClass]="
                      cat.estado === 'ACTIVO'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                    "
                  >
                    {{ cat.estado }}
                  </span>
                </div>

                <!-- Actions -->
                <div>
                  <button
                    mat-icon-button
                    (click)="openDialog(cat)"
                    class="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                    [matTooltip]="'common.edit' | transloco"
                  >
                    <i-pencil [size]="18" />
                  </button>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .inventory-grid {
        grid-template-columns: auto 130px 30% 100px 96px;
      }
      @media (max-width: 640px) {
        .inventory-grid {
          grid-template-columns: auto 100px 100px 96px;
        }
      }
    `,
  ],
})
export default class CategoriesComponent implements OnInit {
  categoriesService = inject(CategoriesService);
  dialog = inject(MatDialog);

  cells4 = ['90%', '70%', '40%', '50%'];
  readonly tipoFilter = signal<string>('TODOS');

  readonly filteredCategories = computed(() => {
    const all = this.categoriesService.categories();
    const filter = this.tipoFilter();
    if (filter === 'TODOS') return all;
    return all.filter((c) => c.tipo === filter);
  });

  ngOnInit() {
    this.categoriesService.findAll().subscribe();
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.src.includes('default_category.svg')) {
      img.src = 'category/default_category.svg';
    }
  }

  getCategoryIllustration(iconName?: string): string {
    if (!iconName || iconName.trim() === '') {
      return 'category/default_category.svg';
    }

    const clean = iconName.replace(/^(\/?category\/)/, '').replace(/\.png$/, '').toLowerCase().trim();

    if (KNOWN_ILLUSTRATIONS_MAP[clean]) {
      return `category/${KNOWN_ILLUSTRATIONS_MAP[clean]}`;
    }

    if (iconName.endsWith('.png') || iconName.endsWith('.svg')) {
      return iconName.startsWith('category/') ? iconName : `category/${iconName}`;
    }

    return `category/${clean}.png`;
  }

  getCategoryBadgeClass(color?: string): string {
    switch (color) {
      case 'amber':
        return 'bg-amber-50 border-amber-200/60 dark:bg-amber-500/10 dark:border-amber-800/40 text-amber-600 dark:text-amber-400';
      case 'rose':
        return 'bg-rose-50 border-rose-200/60 dark:bg-rose-500/10 dark:border-rose-800/40 text-rose-600 dark:text-rose-400';
      case 'blue':
        return 'bg-blue-50 border-blue-200/60 dark:bg-blue-500/10 dark:border-blue-800/40 text-blue-600 dark:text-blue-400';
      case 'purple':
        return 'bg-purple-50 border-purple-200/60 dark:bg-purple-500/10 dark:border-purple-800/40 text-purple-600 dark:text-purple-400';
      case 'neutral':
        return 'bg-neutral-100 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300';
      case 'emerald':
      default:
        return 'bg-emerald-50 border-emerald-200/60 dark:bg-emerald-500/10 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400';
    }
  }

  openDialog(category?: Category) {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      data: { category },
      width: '100%',
      maxWidth: '34rem',
      panelClass: 'dialog-panel-no-padding',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'create') {
        this.categoriesService.create(result.data).subscribe();
      } else if (result?.action === 'update' && category?.id) {
        this.categoriesService.update(category.id, result.data).subscribe();
      }
    });
  }
}
