import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { UpdateService } from '@shared/services/update.service';
import { UpdateStatusComponent } from '@shared/components/update-notification/update-status.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [TranslocoPipe, UpdateStatusComponent],
  template: `
    <div
      class="flex h-full w-full min-w-0 flex-col bg-white dark:bg-neutral-900"
    >
      <header
        class="shrink-0 border-b border-neutral-200 px-6 py-8 md:px-8 dark:border-neutral-700"
      >
        <h1
          class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
        >
          {{ 'updater.title' | transloco }}
        </h1>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {{ 'updater.pageHelp' | transloco }}
        </p>
      </header>
      <div class="min-h-0 flex-auto overflow-y-auto px-6 py-8 md:px-8">
        <div class="mx-auto max-w-3xl">
          <div
            class="mb-6 flex items-center justify-between gap-6 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-700"
          >
            <div>
              <p
                class="text-sm font-medium text-neutral-500 dark:text-neutral-400"
              >
                {{ 'updater.currentVersion' | transloco }}
              </p>
              <p
                class="mt-2 text-4xl font-bold tracking-tight text-neutral-900 dark:text-white"
              >
                {{ service.currentVersion() || '—' }}
              </p>
              <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Dolphin ERP
              </p>
            </div>
            <img
              src="images/logo/logo_dolphin_light.png"
              alt=""
              class="size-16 object-contain dark:hidden"
            />
            <img
              src="images/logo/logo_dolphin_dark.png"
              alt=""
              class="hidden size-16 object-contain dark:block"
            />
          </div>
          <app-update-status [service]="service" />
          <p
            class="mt-5 text-sm leading-6 text-neutral-500 dark:text-neutral-400"
          >
            {{ 'updater.restartHelp' | transloco }}
          </p>
        </div>
      </div>
    </div>
  `,
})
export class AboutComponent {
  protected readonly service = inject(UpdateService);
}
