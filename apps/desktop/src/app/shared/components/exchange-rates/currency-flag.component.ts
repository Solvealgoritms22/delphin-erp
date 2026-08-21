import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'currency-flag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="relative flex items-center justify-center shrink-0 rounded-full overflow-hidden shadow-xs border border-neutral-200/60 dark:border-neutral-700/60 select-none"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      @switch (code().toUpperCase()) {

        @case ('EUR') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#003399" />
            <g fill="#FFCC00" transform="translate(16,16) scale(0.65)">
              <circle cx="0" cy="-14" r="1.3" />
              <circle cx="7" cy="-12" r="1.3" />
              <circle cx="12" cy="-7" r="1.3" />
              <circle cx="14" cy="0" r="1.3" />
              <circle cx="12" cy="7" r="1.3" />
              <circle cx="7" cy="12" r="1.3" />
              <circle cx="0" cy="14" r="1.3" />
              <circle cx="-7" cy="12" r="1.3" />
              <circle cx="-12" cy="7" r="1.3" />
              <circle cx="-14" cy="0" r="1.3" />
              <circle cx="-12" cy="-7" r="1.3" />
              <circle cx="-7" cy="-12" r="1.3" />
            </g>
          </svg>
        }

        @case ('USD') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="circleClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#circleClip)">

              <rect x="0" y="0" width="32" height="32" fill="#B22234" />
              <rect x="0" y="4.5" width="32" height="4.5" fill="#FFFFFF" />
              <rect x="0" y="13.5" width="32" height="4.5" fill="#FFFFFF" />
              <rect x="0" y="22.5" width="32" height="4.5" fill="#FFFFFF" />

              <rect x="0" y="0" width="16" height="17" fill="#3C3B6E" />

              <circle cx="4" cy="4" r="0.9" fill="#FFF" />
              <circle cx="8" cy="4" r="0.9" fill="#FFF" />
              <circle cx="12" cy="4" r="0.9" fill="#FFF" />
              <circle cx="6" cy="8" r="0.9" fill="#FFF" />
              <circle cx="10" cy="8" r="0.9" fill="#FFF" />
              <circle cx="4" cy="12" r="0.9" fill="#FFF" />
              <circle cx="8" cy="12" r="0.9" fill="#FFF" />
              <circle cx="12" cy="12" r="0.9" fill="#FFF" />
            </g>
          </svg>
        }

        @case ('GBP') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="ukClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#ukClip)">
              <rect width="32" height="32" fill="#012169" />
              <path d="M0 0 L32 32 M32 0 L0 32" stroke="#FFFFFF" stroke-width="5.5" />
              <path d="M0 0 L32 32 M32 0 L0 32" stroke="#C8102E" stroke-width="2.5" />
              <path d="M16 0 V32 M0 16 H32" stroke="#FFFFFF" stroke-width="8" />
              <path d="M16 0 V32 M0 16 H32" stroke="#C8102E" stroke-width="4.5" />
            </g>
          </svg>
        }

        @case ('CAD') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="cadClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#cadClip)">
              <rect width="32" height="32" fill="#FFFFFF" />
              <rect x="0" y="0" width="8" height="32" fill="#D80621" />
              <rect x="24" y="0" width="8" height="32" fill="#D80621" />

              <path
                d="M16 8l1.5 4 3-1-1.5 3.5 3.5.5-2.5 2 2.5 3-4.5.5.5 3-2-1.5-2 1.5.5-3-4.5-.5 2.5-3-2.5-2 3.5-.5-1.5-3.5 3 1z"
                fill="#D80621"
              />
            </g>
          </svg>
        }

        @case ('SEK') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="sekClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#sekClip)">
              <rect width="32" height="32" fill="#006AA7" />
              <path d="M11 0 V32 M0 16 H32" stroke="#FECC00" stroke-width="5" />
            </g>
          </svg>
        }

        @case ('NOK') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="nokClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#nokClip)">
              <rect width="32" height="32" fill="#BA0C2F" />
              <path d="M11 0 V32 M0 16 H32" stroke="#FFFFFF" stroke-width="6.5" />
              <path d="M11 0 V32 M0 16 H32" stroke="#00205B" stroke-width="3" />
            </g>
          </svg>
        }

        @case ('DKK') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="dkkClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#dkkClip)">
              <rect width="32" height="32" fill="#C8102E" />
              <path d="M11 0 V32 M0 16 H32" stroke="#FFFFFF" stroke-width="4.5" />
            </g>
          </svg>
        }

        @case ('DOP') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="dopClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#dopClip)">
              <rect x="0" y="0" width="16" height="16" fill="#002B7F" />
              <rect x="16" y="0" width="16" height="16" fill="#CE1126" />
              <rect x="0" y="16" width="16" height="16" fill="#CE1126" />
              <rect x="16" y="16" width="16" height="16" fill="#002B7F" />
              <path d="M16 0 V32 M0 16 H32" stroke="#FFFFFF" stroke-width="4" />
              <circle cx="16" cy="16" r="2.5" fill="#002B7F" />
            </g>
          </svg>
        }

        @case ('CHF') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="chfClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#chfClip)">
              <rect width="32" height="32" fill="#D52B1E" />
              <path d="M16 9 V23 M9 16 H23" stroke="#FFFFFF" stroke-width="5" stroke-linecap="square" />
            </g>
          </svg>
        }

        @case ('JPY') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <circle cx="16" cy="16" r="16" fill="#FFFFFF" />
            <circle cx="16" cy="16" r="7" fill="#BC002D" />
          </svg>
        }

        @case ('BRL') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="brlClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#brlClip)">
              <rect width="32" height="32" fill="#009C3B" />
              <polygon points="16,5 28,16 16,27 4,16" fill="#FFDF00" />
              <circle cx="16" cy="16" r="5.5" fill="#002776" />
            </g>
          </svg>
        }

        @case ('MXN') {
          <svg viewBox="0 0 32 32" class="w-full h-full">
            <clipPath id="mxnClip">
              <circle cx="16" cy="16" r="16" />
            </clipPath>
            <g clip-path="url(#mxnClip)">
              <rect x="0" y="0" width="10.6" height="32" fill="#006847" />
              <rect x="10.6" y="0" width="10.6" height="32" fill="#FFFFFF" />
              <rect x="21.2" y="0" width="10.8" height="32" fill="#CE1126" />
              <circle cx="16" cy="16" r="2.5" fill="#8B4513" />
            </g>
          </svg>
        }

        @default {
          <div class="w-full h-full flex items-center justify-center bg-neutral-200 dark:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200">
            {{ code().substring(0, 2) }}
          </div>
        }
      }
    </div>
  `,
})
export class CurrencyFlagComponent {
  code = input<string>('USD');
  size = input<number>(34);
}
