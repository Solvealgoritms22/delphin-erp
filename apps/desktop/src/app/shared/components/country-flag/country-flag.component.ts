import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'country-flag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      [src]="flagSrc()"
      [alt]="code()"
      class="inline-block shrink-0 shadow-2xs {{ roundedClass() }} object-cover select-none pointer-events-none"
      [style.width.px]="width()"
      [style.height.px]="height()"
      loading="lazy"
    />
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      vertical-align: middle;
    }
  `],
})
export class CountryFlagComponent {
  /** ISO 3166-1 alpha-2 country code (e.g., 'DO', 'US', 'ES') */
  readonly code = input<string>('DO');
  /** Size in width pixels. Aspect ratio is preserved 4:3 */
  readonly width = input<number>(20);
  /** Shape: 'rounded' (default), 'circle', 'square' */
  readonly shape = input<'rounded' | 'circle' | 'square'>('rounded');

  readonly flagSrc = computed(() => {
    const c = (this.code() || 'do').toLowerCase().trim();
    return `flags/${c}.svg`;
  });

  readonly height = computed(() => {
    return Math.round((this.width() * 3) / 4);
  });

  readonly roundedClass = computed(() => {
    switch (this.shape()) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded-none';
      default:
        return 'rounded-[2px]';
    }
  });
}
