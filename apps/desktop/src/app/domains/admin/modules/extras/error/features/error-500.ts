import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'error-500',
   imports: [MatButton, RouterLink, TranslocoPipe],
   template: `
    <div
      class="flex flex-auto flex-col items-center justify-center p-6 text-center sm:p-10"
    >
      <div class="text-lg font-semibold text-primary-600">500</div>
      <div class="mt-2 text-4xl font-bold md:text-[64px]/24">
         {{ 'errors.server.title' | transloco }}
      </div>
      <div class="mt-2 font-medium text-neutral-500 md:mt-0 md:text-lg">
         {{ 'errors.server.description' | transloco }}
      </div>

      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <a
          matButton="filled"
          routerLink="/admin"
        >
           {{ 'errors.backDashboard' | transloco }}
        </a>
      </div>
    </div>
  `,
})
export default class Error500 {}
