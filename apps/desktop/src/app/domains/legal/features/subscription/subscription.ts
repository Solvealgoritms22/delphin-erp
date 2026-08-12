import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'legal-subscription',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="prose prose-blue dark:prose-invert max-w-none">
      <h1 class="text-3xl font-bold tracking-tight mb-2">{{ 'legalContent.subscription.title' | transloco }}</h1>
      <p class="text-neutral-500 mb-8">{{ 'legalPages.updated' | transloco }}</p>

      <p>{{ 'legalContent.subscription.intro' | transloco }}</p>

      <h3>{{ 'legalContent.subscription.plansTitle' | transloco }}</h3>
      <p>{{ 'legalContent.subscription.plans' | transloco }}</p>

      <h3>{{ 'legalContent.subscription.paymentsTitle' | transloco }}</h3>
      <p>{{ 'legalContent.subscription.payments' | transloco }}</p>
      <ul>
        <li>{{ 'legalContent.subscription.providers' | transloco }}</li>
        <li>{{ 'legalContent.subscription.tokenization' | transloco }}</li>
      </ul>

      <h3>{{ 'legalContent.subscription.pricesTitle' | transloco }}</h3>
      <p>{{ 'legalContent.subscription.prices' | transloco }}</p>

      <h3>{{ 'legalContent.subscription.cancellationTitle' | transloco }}</h3>
      <p>{{ 'legalContent.subscription.cancellation' | transloco }}</p>

      <h3>{{ 'legalContent.subscription.suspensionTitle' | transloco }}</h3>
      <p>{{ 'legalContent.subscription.suspension' | transloco }}</p>
    </div>
  `
})
export default class SubscriptionComponent {}
