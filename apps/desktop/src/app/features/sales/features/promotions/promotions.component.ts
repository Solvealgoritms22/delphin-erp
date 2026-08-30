import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '@shared/components/confirm-dialog/confirm-dialog.component';
import {
  PromotionsService,
  Promocion,
  FilterPromotionsDto,
} from '../../data/promotions.service';
import { PromotionDialogComponent } from './promotion-dialog.component';

@Component({
  selector: 'app-promotions',
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
    DatePipe,
    TranslocoPipe,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatCardComponent,
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
            {{ 'commercial.promotions.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'commercial.promotions.description' | transloco }}
          </p>
        </div>

        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4 gap-3">
          <button
            mat-flat-button
            (click)="openDialog()"
            class="!rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
            {{ 'commercial.promotions.newPromotion' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Body -->
      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 md:px-8 lg:grid-cols-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <app-stat-card
            [title]="'commercial.promotions.stats.total' | transloco"
            subtitle="Campañas registradas"
            [value]="totalPromotions()"
            icon="tag"
            curvePreset="asc-sigmoid"
            color="blue"
            (refresh)="loadPromotions()"
          />

          <app-stat-card
            [title]="'commercial.promotions.stats.active' | transloco"
            subtitle="Vigentes y aplicables"
            [value]="activePromotions()"
            icon="zap"
            curvePreset="asc-sigmoid"
            color="emerald"
            (refresh)="loadPromotions()"
          />

          <app-stat-card
            [title]="'commercial.promotions.stats.scheduled' | transloco"
            subtitle="Próximo lanzamiento"
            [value]="scheduledPromotions()"
            icon="calendar"
            curvePreset="peak-wave"
            color="purple"
            (refresh)="loadPromotions()"
          />

          <app-stat-card
            [title]="'commercial.promotions.stats.expired' | transloco"
            subtitle="Fuera de vigencia"
            [value]="expiredPromotions()"
            icon="clock"
            curvePreset="trough-wave"
            color="amber"
            (refresh)="loadPromotions()"
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
                (ngModelChange)="applyFilters()"
                [placeholder]="'commercial.promotions.searchPlaceholder' | transloco"
                class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Filter by Status -->
            <button
              [matMenuTriggerFor]="statusFilterMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              <mat-icon svgIcon="sliders-horizontal" class="icon-size-4 text-neutral-500"></mat-icon>
              <span>{{ getStatusFilterLabel() }}</span>
            </button>
            <mat-menu #statusFilterMenu="matMenu">
              <button mat-menu-item (click)="setStatusFilter('TODOS')">
                {{ 'common.all' | transloco }}
              </button>
              <button mat-menu-item (click)="setStatusFilter('ACTIVO')">
                {{ 'common.active' | transloco }}
              </button>
              <button mat-menu-item (click)="setStatusFilter('PROGRAMADO')">
                {{ 'commercial.promotions.scheduled' | transloco }}
              </button>
              <button mat-menu-item (click)="setStatusFilter('PAUSADO')">
                {{ 'commercial.promotions.paused' | transloco }}
              </button>
              <button mat-menu-item (click)="setStatusFilter('EXPIRADO')">
                {{ 'commercial.promotions.expired' | transloco }}
              </button>
            </mat-menu>

            <!-- Filter by Scope -->
            <button
              [matMenuTriggerFor]="scopeFilterMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              <mat-icon svgIcon="tag" class="icon-size-4 text-neutral-500"></mat-icon>
              <span>{{ getScopeFilterLabel() }}</span>
            </button>
            <mat-menu #scopeFilterMenu="matMenu">
              <button mat-menu-item (click)="setScopeFilter('TODOS')">
                {{ 'commercial.promotions.scopes.all' | transloco }}
              </button>
              <button mat-menu-item (click)="setScopeFilter('CATEGORIA')">
                {{ 'commercial.promotions.scopes.category' | transloco }}
              </button>
              <button mat-menu-item (click)="setScopeFilter('MARCA')">
                {{ 'commercial.promotions.scopes.brand' | transloco }}
              </button>
              <button mat-menu-item (click)="setScopeFilter('PRODUCTOS')">
                {{ 'commercial.promotions.scopes.products' | transloco }}
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Promotions Table -->
        <div class="grid">
          <div
            class="promotions-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div>{{ 'commercial.promotions.table.promotion' | transloco }}</div>
            <div class="hidden sm:block">{{ 'commercial.promotions.table.benefit' | transloco }}</div>
            <div class="hidden md:block">{{ 'commercial.promotions.table.scope' | transloco }}</div>
            <div class="hidden lg:block">{{ 'commercial.promotions.table.validity' | transloco }}</div>
            <div>{{ 'common.status' | transloco }}</div>
            <div class="text-right">{{ 'common.actions' | transloco }}</div>
          </div>

          @if (promotionsService.loading()) {
            <app-table-skeleton
              [gridClass]="'promotions-grid'"
              [rows]="5"
              [cells]="cells6"
            />
          } @else if (filteredPromotions().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                type="no-data"
                [title]="'commercial.promotions.emptyTitle' | transloco"
                [description]="'commercial.promotions.emptyDescription' | transloco"
                [actionLabel]="'commercial.promotions.newPromotion' | transloco"
                actionIcon="plus"
                (action)="openDialog()"
              />
            </div>
          } @else {
            @for (promo of filteredPromotions(); track promo.id) {
              <div
                class="promotions-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
              >
                <!-- Nombre y Cupón -->
                <div class="flex flex-col min-w-0 pr-2">
                  <span class="font-bold text-neutral-900 dark:text-white truncate">
                    {{ promo.nombre }}
                  </span>
                  @if (promo.codigoCupon) {
                    <span class="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-blue-600 dark:text-blue-400">
                      <mat-icon svgIcon="tag" class="icon-size-3.5"></mat-icon>
                      {{ promo.codigoCupon }}
                    </span>
                  }
                  @if (promo.descripcion) {
                    <span class="text-xs text-neutral-400 truncate mt-0.5">
                      {{ promo.descripcion }}
                    </span>
                  }
                </div>

                <!-- Beneficio / Descuento -->
                <div class="hidden sm:flex flex-col">
                  @if (promo.tipoDescuento === 'PORCENTAJE') {
                    <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-base">
                      {{ promo.valorDescuento }}% OFF
                    </span>
                  } @else if (promo.tipoDescuento === 'MONTO_FIJO') {
                    <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      - RD$ {{ promo.valorDescuento | number:'1.2-2' }}
                    </span>
                  } @else {
                    <span class="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      Precio RD$ {{ promo.valorDescuento | number:'1.2-2' }}
                    </span>
                  }
                  @if (promo.esAcumulable) {
                    <span class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      * {{ 'commercial.promotions.cumulativeBadge' | transloco }}
                    </span>
                  }
                </div>

                <!-- Alcance -->
                <div class="hidden md:flex flex-col">
                  <span class="font-semibold text-neutral-700 dark:text-neutral-300">
                    @if (promo.alcance === 'TODOS') {
                      {{ 'commercial.promotions.scopes.all' | transloco }}
                    } @else if (promo.alcance === 'CATEGORIA') {
                      {{ promo.categoria?.nombre || 'Categoría' }}
                    } @else if (promo.alcance === 'MARCA') {
                      {{ promo.marca?.nombre || 'Marca' }}
                    } @else {
                      {{ promo._count?.productos || promo.productos?.length || 0 }} {{ 'commercial.promotions.scopes.products' | transloco }}
                    }
                  </span>
                  <span class="text-xs text-neutral-400">
                    {{ 'commercial.promotions.scopes.' + promo.alcance.toLowerCase() | transloco }}
                  </span>
                </div>

                <!-- Vigencia -->
                <div class="hidden lg:flex flex-col text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                  <span>{{ promo.fechaInicio | date:'dd/MM/yyyy' }}</span>
                  <span class="text-neutral-400">hasta {{ promo.fechaFin | date:'dd/MM/yyyy' }}</span>
                </div>

                <!-- Estado Badge Oficial -->
                <div>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                    [ngClass]="getStatusBadgeClass(promo)"
                  >
                    {{ getStatusLabel(promo) }}
                  </span>
                </div>

                <!-- Acciones -->
                <div class="flex items-center justify-end gap-1">
                  <button
                    mat-icon-button
                    (click)="openDialog(promo)"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    [matTooltip]="'common.edit' | transloco"
                  >
                    <mat-icon svgIcon="pencil" class="icon-size-4.5"></mat-icon>
                  </button>

                  <button
                    mat-icon-button
                    [matMenuTriggerFor]="itemMenu"
                    class="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                  >
                    <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4.5"></mat-icon>
                  </button>

                  <mat-menu #itemMenu="matMenu">
                    <button mat-menu-item (click)="togglePromoStatus(promo)">
                      <mat-icon [svgIcon]="promo.estado === 'ACTIVO' ? 'pause' : 'play'" class="icon-size-4"></mat-icon>
                      <span>
                        {{ promo.estado === 'ACTIVO' ? ('commercial.promotions.pause' | transloco) : ('commercial.promotions.activate' | transloco) }}
                      </span>
                    </button>
                    <button mat-menu-item (click)="deletePromo(promo)" class="!text-red-600">
                      <mat-icon svgIcon="trash" class="icon-size-4 text-red-600"></mat-icon>
                      <span>{{ 'common.delete' | transloco }}</span>
                    </button>
                  </mat-menu>
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
      .promotions-grid {
        grid-template-columns: minmax(180px, 1.8fr) minmax(120px, 1.2fr) minmax(130px, 1.2fr) minmax(120px, 1fr) minmax(100px, 0.9fr) minmax(80px, 0.8fr);
      }
      @media (max-width: 1024px) {
        .promotions-grid {
          grid-template-columns: minmax(160px, 1.8fr) minmax(120px, 1.2fr) minmax(130px, 1.2fr) minmax(100px, 0.9fr) minmax(70px, 0.8fr);
        }
      }
      @media (max-width: 768px) {
        .promotions-grid {
          grid-template-columns: minmax(150px, 2fr) minmax(110px, 1.2fr) minmax(90px, 0.9fr) minmax(70px, 0.8fr);
        }
      }
      @media (max-width: 640px) {
        .promotions-grid {
          grid-template-columns: minmax(150px, 2fr) minmax(90px, 0.9fr) minmax(60px, 0.8fr);
        }
      }
    `,
  ],
})
export class PromotionsComponent implements OnInit {
  public promotionsService = inject(PromotionsService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  searchQuery = '';
  selectedStatusFilter = 'TODOS';
  selectedScopeFilter = 'TODOS';

  cells6 = ['w-40', 'w-24', 'w-28', 'w-24', 'w-20', 'w-16'];

  totalPromotions = computed(() => this.promotionsService.promotions().length);

  activePromotions = computed(() =>
    this.promotionsService.promotions().filter((p) => p.estadoEfectivo === 'ACTIVO').length
  );

  scheduledPromotions = computed(() =>
    this.promotionsService.promotions().filter((p) => p.estadoEfectivo === 'PROGRAMADO').length
  );

  expiredPromotions = computed(() =>
    this.promotionsService.promotions().filter((p) => p.estadoEfectivo === 'EXPIRADO').length
  );

  filteredPromotions = computed(() => {
    let list = this.promotionsService.promotions();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q) ||
          p.codigoCupon?.toLowerCase().includes(q)
      );
    }

    if (this.selectedStatusFilter !== 'TODOS') {
      list = list.filter((p) => p.estadoEfectivo === this.selectedStatusFilter || p.estado === this.selectedStatusFilter);
    }

    if (this.selectedScopeFilter !== 'TODOS') {
      list = list.filter((p) => p.alcance === this.selectedScopeFilter);
    }

    return list;
  });

  ngOnInit(): void {
    this.loadPromotions();
  }

  loadPromotions(): void {
    this.promotionsService.loadAll().subscribe();
  }

  applyFilters(): void {
    // Handled reactively via filteredPromotions computed signal
  }

  setStatusFilter(status: string): void {
    this.selectedStatusFilter = status;
  }

  setScopeFilter(scope: string): void {
    this.selectedScopeFilter = scope;
  }

  getStatusFilterLabel(): string {
    switch (this.selectedStatusFilter) {
      case 'ACTIVO':
        return this.transloco.translate('common.active') || 'Activo';
      case 'PROGRAMADO':
        return this.transloco.translate('commercial.promotions.scheduled') || 'Programado';
      case 'PAUSADO':
        return this.transloco.translate('commercial.promotions.paused') || 'Pausado';
      case 'EXPIRADO':
        return this.transloco.translate('commercial.promotions.expired') || 'Expirado';
      default:
        return this.transloco.translate('common.all') || 'Todos los estados';
    }
  }

  getScopeFilterLabel(): string {
    switch (this.selectedScopeFilter) {
      case 'CATEGORIA':
        return this.transloco.translate('commercial.promotions.scopes.category') || 'Por Categoría';
      case 'MARCA':
        return this.transloco.translate('commercial.promotions.scopes.brand') || 'Por Marca';
      case 'PRODUCTOS':
        return this.transloco.translate('commercial.promotions.scopes.products') || 'Productos Específicos';
      default:
        return this.transloco.translate('commercial.promotions.scopes.all') || 'Todo el Catálogo';
    }
  }

  getStatusBadgeClass(promo: Promocion): string {
    const status = promo.estadoEfectivo || promo.estado;
    switch (status) {
      case 'ACTIVO':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20';
      case 'PROGRAMADO':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20';
      case 'PAUSADO':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20';
      case 'EXPIRADO':
      case 'INACTIVO':
      default:
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200/60 dark:border-neutral-700/50';
    }
  }

  getStatusLabel(promo: Promocion): string {
    const status = promo.estadoEfectivo || promo.estado;
    switch (status) {
      case 'ACTIVO':
        return this.transloco.translate('common.active') || 'Activo';
      case 'PROGRAMADO':
        return this.transloco.translate('commercial.promotions.scheduled') || 'Programado';
      case 'PAUSADO':
        return this.transloco.translate('commercial.promotions.paused') || 'Pausado';
      case 'EXPIRADO':
        return this.transloco.translate('commercial.promotions.expired') || 'Expirado';
      case 'INACTIVO':
      default:
        return this.transloco.translate('common.inactive') || 'Inactivo';
    }
  }

  openDialog(promotion?: Promocion): void {
    const dialogRef = this.dialog.open(PromotionDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      panelClass: '!rounded-3xl',
      data: {
        promotion: promotion || null,
        isEdit: Boolean(promotion),
      },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) {
        this.loadPromotions();
      }
    });
  }

  togglePromoStatus(promo: Promocion): void {
    this.promotionsService.toggleStatus(promo.id).subscribe({
      next: () => {
        this.snackBar.open(
          'Estado actualizado',
          this.transloco.translate('common.close') || 'Cerrar',
          { duration: 2500 }
        );
      },
    });
  }

  deletePromo(promo: Promocion): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: this.transloco.translate('commercial.promotions.deleteTitle') || 'Eliminar Promoción',
        message: this.transloco.translate('commercial.promotions.deleteConfirm') || `¿Estás seguro de que deseas eliminar la promoción "${promo.nombre}"?`,
        confirmText: this.transloco.translate('common.delete') || 'Eliminar',
        cancelText: this.transloco.translate('common.cancel') || 'Cancelar',
        isDestructive: true,
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.promotionsService.delete(promo.id).subscribe({
          next: () => {
            this.snackBar.open(
              'Promoción eliminada con éxito',
              this.transloco.translate('common.close') || 'Cerrar',
              { duration: 3000 }
            );
          },
        });
      }
    });
  }
}
