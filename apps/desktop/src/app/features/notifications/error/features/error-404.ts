import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'error-404',
   imports: [MatButton, RouterLink, TranslocoPipe],
  template: `
    <div
      class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-neutral-950 p-6 text-center sm:p-10"
    >
      <div class="text-[120px] md:text-[200px] font-extrabold leading-none text-primary-600">404</div>
      <div class="mt-4 text-3xl font-bold md:text-5xl">
         {{ 'errors.notFound.title' | transloco }}
      </div>
      <div class="mt-4 font-medium text-neutral-500 md:text-xl">
         {{ 'errors.notFound.description' | transloco }}
      </div>

      <div class="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <a
          matButton="filled"
          routerLink="/"
          class="px-8 py-3 text-lg"
        >
           {{ 'errors.backHome' | transloco }}
        </a>
      </div>
    </div>
  `,
})
export default class Error404 {}
