import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
   selector: 'maintenance',
   imports: [TranslocoPipe],
  template: `
    <div
      class="flex flex-auto flex-col items-center justify-center p-6 text-center sm:p-10"
    >
      <!-- Logo -->
      <div class="flex items-center justify-center gap-x-2.5">
        <img
          class="h-20 w-auto max-w-[250px] object-contain dark:hidden"
          src="/images/logo/logo_dolphin_light.png"
          alt="Dolphin ERP"
        />
        <img
          class="h-24 w-auto max-w-[250px] object-contain hidden dark:block"
          src="/images/logo/logo_dolphin_dark.png"
          alt="Dolphin ERP"
        />
      </div>

      <!-- Title -->
      <div class="mt-8 text-4xl font-bold md:text-[64px]/24">
         {{ 'maintenance.title' | transloco }}
      </div>
      <div class="mt-2 font-medium text-neutral-500 md:mt-0 md:text-lg">
         {{ 'maintenance.description' | transloco }}
      </div>
    </div>
  `,
})
export default class Maintenance {}
