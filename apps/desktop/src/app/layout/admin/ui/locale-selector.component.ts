import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { LangDefinition, TranslocoService } from '@jsverse/transloco';

import { CountryFlagComponent } from '@shared/components/country-flag/country-flag.component';

@Component({
  selector: 'language-switcher',
  imports: [
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatPseudoCheckbox,
    CountryFlagComponent,
  ],
  template: `
    <button
      matIconButton
      [matMenuTriggerFor]="langMenu"
    >
      <country-flag
        [code]="getLangFlag(this.activeLang)"
        [width]="20"
      />
    </button>
    <mat-menu #langMenu="matMenu">
      @for (lang of availableLangs; track lang.id) {
        <button
          mat-menu-item
          (click)="setActiveLang(lang.id)"
        >
          <span class="flex items-center gap-x-3">
            <span class="flex items-center gap-x-2">
              <country-flag
                [code]="getLangFlag(lang.id)"
                [width]="20"
              />
              <span>{{ lang.label }}</span>
            </span>
            <mat-pseudo-checkbox
              appearance="minimal"
              [state]="lang.id === activeLang ? 'checked' : 'unchecked'"
            />
          </span>
        </button>
      }
    </mat-menu>
  `,
})
export class LanguageSwitcher {

  private readonly transloco = inject(TranslocoService);

  protected activeLang = this.transloco.getActiveLang();
  protected readonly availableLangs =
    this.transloco.getAvailableLangs() as LangDefinition[];

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const storedLang = localStorage.getItem('dolphin_language');
      if (storedLang && this.availableLangs.some((lang) => lang.id === storedLang)) {
        this.transloco.setActiveLang(storedLang);
      }
    }
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe((lang) => {
      this.activeLang = lang;
    });
  }

  setActiveLang(lang: string) {
    this.transloco.setActiveLang(lang);
    if (typeof localStorage !== 'undefined') localStorage.setItem('dolphin_language', lang);
  }

  getLangFlag(lang: string) {
    switch (lang) {
      case 'en': {
        return 'US';
      }
      case 'es': {
        return 'ES';
      }
      default: {
        return 'US';
      }
    }
  }
}
