import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'country-flag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="fi fi-{{ countryClass() }} inline-block shrink-0 shadow-2xs {{ roundedClass() }}"
      [style.width.px]="width()"
      [style.height.px]="height()"
      [attr.aria-label]="code()"
    ></span>
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

  readonly countryClass = computed(() => {
    const c = this.code() || 'do';
    return c.toLowerCase().trim();
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
