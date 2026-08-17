import { Component, inject, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductsService } from '../../data/products.service';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@/app/shared/components/table-skeleton/table-skeleton.component';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-products',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
   imports: [MatButtonModule, MatIconModule, CurrencyPipe, EmptyStateComponent, TableSkeletonComponent, TranslocoPipe],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">
      
      <!-- Header -->
      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <!-- Title -->
         <div>
           <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'catalogs.products.title' | transloco }}</div>
           <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'catalogs.products.description' | transloco }}</p>
         </div>
        <!-- Actions -->
        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
          <button mat-flat-button (click)="openForm()" class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
             {{ 'catalogs.products.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main -->
      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">
            <!-- Header -->
            <div class="inventory-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
               <div>{{ 'common.code' | transloco }}</div>
               <div>{{ 'common.name' | transloco }}</div>
               <div class="hidden sm:block">{{ 'common.category' | transloco }}</div>
               <div class="hidden lg:block text-right">{{ 'common.price' | transloco }}</div>
               <div class="hidden lg:block text-right">{{ 'common.cost' | transloco }}</div>
               <div class="hidden sm:block">{{ 'common.status' | transloco }}</div>
               <div>{{ 'common.actions' | transloco }}</div>
            </div>
            
            <!-- Rows -->
            @if (productsService.isLoading()) {
              <app-table-skeleton [gridClass]="'inventory-grid'" [rows]="6" [cells]="cells7" />
            } @else if (productsService.products().length === 0) {
              <div class="flex flex-auto justify-center p-6 sm:p-10">
                <app-empty-state
                  type="no-data"
                   [title]="'catalogs.products.emptyTitle' | transloco"
                   [description]="'catalogs.products.emptyDescription' | transloco"
                   [actionLabel]="'catalogs.products.new' | transloco"
                  actionIcon="plus"
                  (action)="openForm()"
                />
              </div>
            } @else {
              @for (product of productsService.products(); track product.id) {
                <div class="inventory-grid grid items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800">
                  <div class="text-sm font-medium">{{ product.codigo }}</div>
                  <div class="font-medium text-neutral-900 dark:text-white truncate">{{ product.nombre }}</div>
                  <div class="hidden sm:block text-sm text-neutral-500">{{ product.categoria?.nombre || '-' }}</div>
                  <div class="hidden lg:block text-right font-medium">{{ product.precioVenta | currency }}</div>
                  <div class="hidden lg:block text-right font-medium">{{ product.costo | currency }}</div>
                  <div class="hidden sm:block">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {{ product.estado }}
                    </span>
                  </div>
                  <div>
                    <button mat-icon-button (click)="openForm(product.id)" class="text-neutral-500">
                       <mat-icon svgIcon="pencil" class="icon-size-5"></mat-icon>
                    </button>
                    <button mat-icon-button class="text-red-500">
                      <mat-icon svgIcon="trash" class="icon-size-5"></mat-icon>
                    </button>
                  </div>
                </div>
              }
            }
          </div>
      </div>
    </div>
  `,
  styles: [`
    .inventory-grid {
      grid-template-columns: 100px auto 120px 100px 100px 96px 96px;
    }
    @media (max-width: 1024px) {
      .inventory-grid {
        grid-template-columns: 100px auto 120px 96px 96px;
      }
    }
    @media (max-width: 640px) {
      .inventory-grid {
        grid-template-columns: 100px auto 96px;
      }
    }
  `]
})
export default class ProductsComponent implements OnInit {
  productsService = inject(ProductsService);
  router = inject(Router);

  cells7 = ['70%', '90%', '60%', '40%', '40%', '30%', '40%'];

  ngOnInit() {
    this.productsService.findAll().subscribe();
    this.productsService.loadCatalogs();
  }

  openForm(id?: string) {
    if (id) {
      this.router.navigate(['/admin/catalogs/products', id]);
    } else {
      this.router.navigate(['/admin/catalogs/products/new']);
    }
  }
}
