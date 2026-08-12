import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

export type SkeletonType = 'text' | 'circle' | 'rect' | 'card';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [NgClass],
  template: `
    <div
      class="animate-pulse bg-neutral-200 dark:bg-neutral-800"
      [ngClass]="{
        'rounded': type() === 'text',
        'rounded-full': type() === 'circle',
        'rounded-xl': type() === 'card',
        'rounded-md': type() === 'rect'
      }"
      [style.width]="width()"
      [style.height]="height()"
    ></div>
  `,
  host: {
    class: 'block',
  }
})
export class SkeletonComponent {
  type = input<SkeletonType>('text');
  width = input<string>('100%');
  height = input<string>('1rem');
}
