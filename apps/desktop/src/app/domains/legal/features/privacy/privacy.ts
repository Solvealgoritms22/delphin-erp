import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'legal-privacy',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="prose prose-blue dark:prose-invert max-w-none">
      <h1 class="text-3xl font-bold tracking-tight mb-2">{{ 'legalContent.privacy.title' | transloco }}</h1>
      <p class="text-neutral-500 mb-8">{{ 'legalPages.updated' | transloco }}</p>

      <p>{{ 'legalContent.privacy.intro' | transloco }}</p>

      <h3>{{ 'legalContent.privacy.collectionTitle' | transloco }}</h3>
      <p>{{ 'legalContent.privacy.collection' | transloco }}</p>
      <ul>
        <li>{{ 'legalContent.privacy.contact' | transloco }}</li>
        <li>{{ 'legalContent.privacy.billing' | transloco }}</li>
        <li>{{ 'legalContent.privacy.usage' | transloco }}</li>
      </ul>

      <h3>{{ 'legalContent.privacy.useTitle' | transloco }}</h3>
      <p>{{ 'legalContent.privacy.use' | transloco }}</p>

      <h3>{{ 'legalContent.privacy.sharingTitle' | transloco }}</h3>
      <p>{{ 'legalContent.privacy.sharing' | transloco }}</p>

      <h3>{{ 'legalContent.privacy.securityTitle' | transloco }}</h3>
      <p>{{ 'legalContent.privacy.security' | transloco }}</p>

      <h3>{{ 'legalContent.privacy.rightsTitle' | transloco }}</h3>
      <p>{{ 'legalContent.privacy.rights' | transloco }}</p>
    </div>
  `
})
export default class PrivacyComponent {}
