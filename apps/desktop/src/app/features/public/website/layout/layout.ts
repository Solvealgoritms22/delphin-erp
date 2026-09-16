import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'web-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="scheme-light light text-neutral-900 bg-[#fafaf8] min-h-screen w-full" style="color-scheme: light;">
      <router-outlet />
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class WebLayout {}
