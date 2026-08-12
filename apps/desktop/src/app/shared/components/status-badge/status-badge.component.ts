import { Component, input, computed } from '@angular/core';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-1.5 font-medium rounded-full"
      [class]="classes()"
    >
      @if (dot()) {
        <span class="h-1.5 w-1.5 rounded-full" [class]="dotClass()"></span>
      }
      <ng-content />
    </span>
  `,
})
export class StatusBadgeComponent {
  variant = input<BadgeVariant>('neutral');
  size = input<BadgeSize>('md');
  dot = input<boolean>(false);

  classes = computed(() => {
    const sizeMap: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm',
    };

    const variantMap: Record<BadgeVariant, string> = {
      success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400',
      danger:  'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
      info:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
      neutral: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300',
      purple:  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
    };

    return `${sizeMap[this.size()]} ${variantMap[this.variant()]}`;
  });

  dotClass = computed(() => {
    const dotMap: Record<BadgeVariant, string> = {
      success: 'bg-emerald-500',
      danger:  'bg-red-500',
      warning: 'bg-amber-500',
      info:    'bg-blue-500',
      neutral: 'bg-neutral-500',
      purple:  'bg-purple-500',
    };
    return dotMap[this.variant()];
  });
}
