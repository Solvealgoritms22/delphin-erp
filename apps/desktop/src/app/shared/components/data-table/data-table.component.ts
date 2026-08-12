import {
  AfterViewInit,
  Component,
  computed,
  effect,
  input,
  output,
  ViewChild,
} from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SelectionModel } from '@angular/cdk/collections';
import { FormsModule } from '@angular/forms';

export interface TableColumn<T> {
  key: Extract<keyof T, string>;
  label: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'custom';
  sortable?: boolean;
}

export interface TableAction<T> {
  id: string;
  label: string;
  icon?: string;
  action: (row: T) => void;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
  ],
  template: `
    <div class="flex flex-col bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <!-- Header / Toolbar -->
      <div class="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800">
        <!-- Search -->
        <mat-form-field class="fuse-mat-dense fuse-mat-rounded w-full sm:w-72" subscriptSizing="dynamic">
          <mat-icon
            matPrefix
            class="icon-size-5 text-neutral-500"
            svgIcon="search"
          ></mat-icon>
          <input
            matInput
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilter($event)"
            placeholder="Search..."
          />
        </mat-form-field>
        
        <!-- Toolbar Actions -->
        <div class="flex items-center gap-2">
           <ng-content select="[toolbar]"></ng-content>
        </div>
      </div>

      <!-- Table Container -->
      <div class="overflow-x-auto">
        <table mat-table [dataSource]="dataSource" matSort class="w-full">
          
          <!-- Checkbox Column -->
          @if (selectable()) {
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef class="w-12 px-4">
                <mat-checkbox
                  (change)="$event ? toggleAllRows() : null"
                  [checked]="selection.hasValue() && isAllSelected()"
                  [indeterminate]="selection.hasValue() && !isAllSelected()"
                  aria-label="Select all"
                >
                </mat-checkbox>
              </th>
              <td mat-cell *matCellDef="let row" class="w-12 px-4">
                <mat-checkbox
                  (click)="$event.stopPropagation()"
                  (change)="$event ? toggleSelection(row) : null"
                  [checked]="selection.isSelected(row)"
                  aria-label="Select row"
                >
                </mat-checkbox>
              </td>
            </ng-container>
          }

          <!-- Data Columns -->
          @for (col of columns(); track col.key) {
            <ng-container [matColumnDef]="col.key">
              @if (col.sortable !== false) {
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="whitespace-nowrap px-4 py-3 font-semibold text-neutral-500">
                  {{ col.label }}
                </th>
              } @else {
                <th mat-header-cell *matHeaderCellDef class="whitespace-nowrap px-4 py-3 font-semibold text-neutral-500">
                  {{ col.label }}
                </th>
              }
              <td mat-cell *matCellDef="let row" class="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                <!-- Custom cell slot can be handled via ng-template in real implementation, for now simple text -->
                {{ row[col.key] }}
              </td>
            </ng-container>
          }

          <!-- Actions Column -->
          @if (actions().length > 0) {
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-16 px-4"></th>
              <td mat-cell *matCellDef="let row" class="w-16 px-4 text-right">
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon svgIcon="ellipsis-vertical" class="icon-size-5"></mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  @for (action of actions(); track action.id) {
                    <button mat-menu-item (click)="action.action(row)">
                      @if (action.icon) {
                        <mat-icon [svgIcon]="action.icon"></mat-icon>
                      }
                      <span>{{ action.label }}</span>
                    </button>
                  }
                </mat-menu>
              </td>
            </ng-container>
          }

          <tr mat-header-row *matHeaderRowDef="displayedColumns()"></tr>
          <tr 
            mat-row 
            *matRowDef="let row; columns: displayedColumns();"
            class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
            (click)="rowClick.emit(row)"
          ></tr>

          <!-- No Data Row -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell px-6 py-8 text-center text-neutral-500" [attr.colspan]="displayedColumns().length">
              No matching records found.
            </td>
          </tr>
        </table>
      </div>

      <!-- Paginator -->
      <mat-paginator
        class="border-t border-neutral-200 dark:border-neutral-800"
        [pageSizeOptions]="pageSizeOptions()"
        [pageSize]="defaultPageSize()"
        showFirstLastButtons
      ></mat-paginator>
    </div>
  `,
})
export class DataTableComponent<T> implements AfterViewInit {
  // Inputs
  data = input<T[]>([]);
  columns = input<TableColumn<T>[]>([]);
  selectable = input<boolean>(false);
  actions = input<TableAction<T>[]>([]);
  pageSizeOptions = input<number[]>([10, 25, 50, 100]);
  defaultPageSize = input<number>(10);

  // Outputs
  selectionChange = output<T[]>();
  rowClick = output<T>();

  // View Childs
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // State
  dataSource = new MatTableDataSource<T>([]);
  selection = new SelectionModel<T>(true, []);
  searchQuery = '';

  displayedColumns = computed(() => {
    const cols = this.columns().map(c => c.key as string);
    if (this.selectable()) cols.unshift('select');
    if (this.actions().length > 0) cols.push('actions');
    return cols;
  });

  constructor() {
    effect(() => {
      this.dataSource.data = this.data();
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Selection Logic
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      this.selectionChange.emit([]);
      return;
    }
    this.selection.select(...this.dataSource.data);
    this.selectionChange.emit(this.selection.selected);
  }

  toggleSelection(row: T) {
    this.selection.toggle(row);
    this.selectionChange.emit(this.selection.selected);
  }
}
