import { Component, input } from '@angular/core';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div aria-hidden="true" class="select-none animate-pulse">
      @for (row of rowsList(); track $index) {
        <div
          class="grid grid-cols-1 items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800"
          [class]="gridClass()"
        >
          @for (cell of cells(); track $index) {
            <app-skeleton type="text" [width]="cell" height="16px" />
          }
        </div>
      }
    </div>
  `,
})
export class TableSkeletonComponent {
  rows = input<number>(5);
  gridClass = input<string>('');
  cells = input<string[]>(['70%', '90%', '50%', '40%', '30%', '20%']);
  rowsList(): number[] {
    return Array.from({ length: this.rows() });
  }
}