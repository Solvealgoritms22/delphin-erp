import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'legal-terms',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="prose prose-blue dark:prose-invert max-w-none">
      <h1 class="text-3xl font-bold tracking-tight mb-2">{{ 'legalContent.terms.title' | transloco }}</h1>
      <p class="text-neutral-500 mb-8">{{ 'legalPages.updated' | transloco }}</p>

      <p>{{ 'legalContent.terms.intro' | transloco }}</p>

      <h3>{{ 'legalContent.terms.acceptanceTitle' | transloco }}</h3>
      <p>{{ 'legalContent.terms.acceptance' | transloco }}</p>

      <h3>{{ 'legalContent.terms.serviceTitle' | transloco }}</h3>
      <p>{{ 'legalContent.terms.service' | transloco }}</p>

      <h3>{{ 'legalContent.terms.obligationsTitle' | transloco }}</h3>
      <p>{{ 'legalContent.terms.obligations' | transloco }}</p>

      <h3>{{ 'legalContent.terms.intellectualTitle' | transloco }}</h3>
      <p>{{ 'legalContent.terms.intellectual' | transloco }}</p>

      <h3>{{ 'legalContent.terms.liabilityTitle' | transloco }}</h3>
      <p>{{ 'legalContent.terms.liability' | transloco }}</p>

      <h3>{{ 'legalContent.terms.modificationsTitle' | transloco }}</h3>
      <p>{{ 'legalContent.terms.modifications' | transloco }}</p>
    </div>
  `
})
export default class TermsComponent {}
