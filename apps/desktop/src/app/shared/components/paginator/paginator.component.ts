import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChevronLeftIcon, ChevronRightIcon } from 'ng-animated-icons';

export type PageChangeEvent = {
  page: number;
  limit: number;
}

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    TranslocoPipe,
    ChevronLeftIcon,
    ChevronRightIcon,
  ],
  template: `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 md:px-8 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">

      <!-- Left: page size selector + info -->
      <div class="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400">
        <span>{{ 'paginator.rowsPerPage' | transloco }}:</span>
        <button
          type="button"
          [matMenuTriggerFor]="sizeMenu"
          class="flex items-center gap-1.5 h-7 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors shadow-2xs cursor-pointer"
        >
          <span>{{ limit() }}</span>
          <mat-icon svgIcon="chevron-down" class="!h-3 !w-3 !text-[12px] text-neutral-400"></mat-icon>
        </button>
        <mat-menu #sizeMenu="matMenu" class="min-w-[80px]">
          @for (size of pageSizes(); track size) {
            <button
              mat-menu-item
              (click)="onLimitChange(size)"
              class="flex items-center justify-between !h-9 text-xs"
              [class.font-bold]="size === limit()"
            >
              <span>{{ size }}</span>
              @if (size === limit()) {
                <mat-icon svgIcon="check" class="!h-3.5 !w-3.5 !text-[14px] text-blue-600 dark:text-blue-400 ml-2"></mat-icon>
              }
            </button>
          }
        </mat-menu>
      </div>

      <!-- Center: range info -->
      <span class="text-sm text-neutral-500 dark:text-neutral-400 order-first sm:order-none">
        {{ rangeStart() }}–{{ rangeEnd() }} {{ 'paginator.of' | transloco }} {{ total() }}
      </span>

      <!-- Right: page navigation -->
      <div class="flex items-center gap-1">
        <button
          (click)="goTo(currentPage() - 1)"
          [disabled]="currentPage() <= 1"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          [attr.aria-label]="'paginator.previous' | transloco"
        >
          <i-chevron-left [size]="16" />
        </button>

        @for (pageNum of visiblePages(); track pageNum) {
          @if (pageNum === -1) {
            <span class="flex h-8 w-8 items-center justify-center text-sm text-neutral-400">…</span>
          } @else {
            <button
              (click)="goTo(pageNum)"
              [attr.aria-current]="pageNum === currentPage() ? 'page' : null"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors"
              [class]="pageNum === currentPage()
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
            >{{ pageNum }}</button>
          }
        }

        <button
          (click)="goTo(currentPage() + 1)"
          [disabled]="currentPage() >= totalPages()"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          [attr.aria-label]="'paginator.next' | transloco"
        >
          <i-chevron-right [size]="16" />
        </button>
      </div>
    </div>
  `,
})
export class PaginatorComponent {
  total = input.required<number>();
  currentPage = input.required<number>();
  limit = input.required<number>();
  pageSizes = input<number[]>([10, 25, 50, 100]);

  pageChange = output<PageChangeEvent>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));

  rangeStart = computed(() => Math.min((this.currentPage() - 1) * this.limit() + 1, this.total()));
  rangeEnd = computed(() => Math.min(this.currentPage() * this.limit(), this.total()));

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (current > 3) pages.push(-1); // ellipsis

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push(-1); // ellipsis
    pages.push(total);

    return pages;
  });

  goTo(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    if (clamped !== this.currentPage()) {
      this.pageChange.emit({ page: clamped, limit: this.limit() });
    }
  }

  onLimitChange(value: number | string): void {
    const newLimit = typeof value === 'number' ? value : parseInt(value, 10);
    this.pageChange.emit({ page: 1, limit: newLimit });
  }
}
