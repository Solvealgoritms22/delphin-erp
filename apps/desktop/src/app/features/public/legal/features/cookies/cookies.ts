import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'legal-cookies',
  standalone: true,
  imports: [TranslocoPipe],
  host: { class: 'block w-full' },
  template: `
    <div class="prose prose-blue dark:prose-invert max-w-none">
      <h1 class="text-3xl font-bold tracking-tight mb-2">{{ 'legalContent.cookies.title' | transloco }}</h1>
      <p class="text-neutral-500 mb-8">{{ 'legalPages.updated' | transloco }}</p>

      <p>{{ 'legalContent.cookies.intro' | transloco }}</p>

      <h3>{{ 'legalContent.cookies.whatTitle' | transloco }}</h3>
      <p>{{ 'legalContent.cookies.what' | transloco }}</p>

      <h3>{{ 'legalContent.cookies.whyTitle' | transloco }}</h3>
      <p>{{ 'legalContent.cookies.why' | transloco }}</p>
      <ul>
        <li>{{ 'legalContent.cookies.essential' | transloco }}</li>
        <li>{{ 'legalContent.cookies.performance' | transloco }}</li>
        <li>{{ 'legalContent.cookies.functionality' | transloco }}</li>
      </ul>

      <h3>{{ 'legalContent.cookies.paymentTitle' | transloco }}</h3>
      <p>{{ 'legalContent.cookies.payment' | transloco }}</p>

      <h3>{{ 'legalContent.cookies.controlTitle' | transloco }}</h3>
      <p>{{ 'legalContent.cookies.control' | transloco }}</p>
    </div>
  `
})
export default class CookiesComponent {}
