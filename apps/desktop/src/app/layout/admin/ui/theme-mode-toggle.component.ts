import { Component, computed, inject, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { Theming } from '@/app/core/theming';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'scheme-switcher',
  standalone: true,
  imports: [
    MatIcon,
    MatIconButton,
    MatTooltip,
    TranslocoPipe,
  ],
  template: `
    <button
      matIconButton
      type="button"
      (click)="toggleTheme()"
      [matTooltip]="isDark() ? ('layout.scheme.light' | transloco) : ('layout.scheme.dark' | transloco)"
      class="group relative overflow-hidden rounded-xl transition-all duration-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-90"
      [attr.aria-label]="isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    >
      <div
        class="flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        [class.rotate-[360deg]]="isDark()"
        [class.rotate-0]="!isDark()"
      >
        @if (isDark()) {

          <mat-icon
            svgIcon="sun"
            class="icon-size-5 text-amber-400 transition-all duration-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] group-hover:scale-110"
          />
        } @else {

          <mat-icon
            svgIcon="moon"
            class="icon-size-5 text-neutral-600 dark:text-neutral-300 transition-all duration-300 group-hover:scale-110"
          />
        }
      </div>
    </button>
  `,
})
export class SchemeSwitcher {
  private theming = inject(Theming);

  protected isDark = computed(() => this.theming.isDark());

  toggleTheme(): void {
    const nextScheme = this.isDark() ? 'light' : 'dark';
    this.theming.setScheme(nextScheme);
  }
}
