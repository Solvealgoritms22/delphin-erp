import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeatherConditionType } from '@/app/core/weather/weather.types';

@Component({
  selector: 'weather-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="weather-icon-wrapper relative flex items-center justify-center select-none"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      @switch (condition()) {
        <!-- Partly Cloudy Day (Sun + Cloud) -->
        @case ('partly-cloudy-day') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFB300" />
                <stop offset="100%" stop-color="#FF8F00" />
              </linearGradient>
              <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop offset="100%" stop-color="#E2E8F0" />
              </linearGradient>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.2" />
              </filter>
            </defs>

            <!-- Sun behind cloud -->
            <g class="anim-sun-group" transform="translate(34, 22)">
              <!-- Sun Rays -->
              <g class="anim-sun-rays">
                <line x1="0" y1="-14" x2="0" y2="-17" stroke="#FFA000" stroke-width="2.5" stroke-linecap="round" />
                <line x1="10" y1="-10" x2="12" y2="-12" stroke="#FFA000" stroke-width="2.5" stroke-linecap="round" />
                <line x1="14" y1="0" x2="17" y2="0" stroke="#FFA000" stroke-width="2.5" stroke-linecap="round" />
                <line x1="10" y1="10" x2="12" y2="12" stroke="#FFA000" stroke-width="2.5" stroke-linecap="round" />
                <line x1="-10" y1="-10" x2="-12" y2="-12" stroke="#FFA000" stroke-width="2.5" stroke-linecap="round" />
                <line x1="-14" y1="0" x2="-17" y2="0" stroke="#FFA000" stroke-width="2.5" stroke-linecap="round" />
                <line x1="0" y1="14" x2="0" y2="17" stroke="#FFA000" stroke-width="2.5" stroke-linecap="round" />
                <line x1="-10" y1="10" x2="-12" y2="12" stroke="#FFA000" stroke-width="2.5" stroke-linecap="round" />
              </g>
              <!-- Sun Body -->
              <circle cx="0" cy="0" r="10" fill="url(#sunGradient)" />
            </g>

            <!-- Puffy Cloud in front -->
            <g class="anim-cloud" filter="url(#softShadow)">
              <path
                d="M44 48H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 26.3 22.3 22 28 22c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#cloudGradient)"
                stroke="#CBD5E1"
                stroke-width="1"
              />
            </g>
          </svg>
        }

        <!-- Clear Sun / Sunny Day -->
        @case ('clear-day') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="fullSunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFCA28" />
                <stop offset="50%" stop-color="#FFA000" />
                <stop offset="100%" stop-color="#FF6F00" />
              </linearGradient>
            </defs>
            <g class="anim-sun-spin" transform="translate(32, 32)">
              <!-- Outer Rays -->
              <g class="anim-sun-rays">
                <line x1="0" y1="-20" x2="0" y2="-25" stroke="#FFA000" stroke-width="3" stroke-linecap="round" />
                <line x1="14" y1="-14" x2="18" y2="-18" stroke="#FFA000" stroke-width="3" stroke-linecap="round" />
                <line x1="20" y1="0" x2="25" y2="0" stroke="#FFA000" stroke-width="3" stroke-linecap="round" />
                <line x1="14" y1="14" x2="18" y2="18" stroke="#FFA000" stroke-width="3" stroke-linecap="round" />
                <line x1="0" y1="20" x2="0" y2="25" stroke="#FFA000" stroke-width="3" stroke-linecap="round" />
                <line x1="-14" y1="14" x2="-18" y2="18" stroke="#FFA000" stroke-width="3" stroke-linecap="round" />
                <line x1="-20" y1="0" x2="-25" y2="0" stroke="#FFA000" stroke-width="3" stroke-linecap="round" />
                <line x1="-14" y1="-14" x2="-18" y2="-18" stroke="#FFA000" stroke-width="3" stroke-linecap="round" />
              </g>
              <circle cx="0" cy="0" r="14" fill="url(#fullSunGrad)" class="anim-sun-pulse" />
            </g>
          </svg>
        }

        <!-- Clear Night (Centered Crescent Moon + Stars) -->
        @case ('clear-night') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFE082" />
                <stop offset="100%" stop-color="#FFB300" />
              </linearGradient>
            </defs>
            <g class="anim-moon" transform="translate(6, 2)">
              <path
                d="M30 10c-1.5 0-3 .2-4.4.7 8.5 3.4 14.5 11.7 14.5 21.3s-6 17.9-14.5 21.3c1.4.5 2.9.7 4.4.7 12.6 0 22.8-10.2 22.8-22.8S42.6 10 30 10z"
                fill="url(#moonGrad)"
              />
            </g>
            <!-- Stars -->
            <circle cx="14" cy="20" r="2.2" fill="#FFE082" class="anim-star-1" />
            <circle cx="22" cy="12" r="1.6" fill="#FFF59D" class="anim-star-2" />
            <circle cx="15" cy="40" r="1.8" fill="#FFE082" class="anim-star-3" />
          </svg>
        }

        <!-- Partly Cloudy Night -->
        @case ('partly-cloudy-night') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="nightMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFE082" />
                <stop offset="100%" stop-color="#FFB300" />
              </linearGradient>
              <linearGradient id="nightCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop offset="100%" stop-color="#CBD5E1" />
              </linearGradient>
            </defs>
            <!-- Moon behind -->
            <g class="anim-moon" transform="translate(6, -2)">
              <path
                d="M32 14c-1.2 0-2.3.2-3.4.5 6.5 2.6 11.1 9 11.1 16.5s-4.6 13.9-11.1 16.5c1.1.3 2.2.5 3.4.5 9.7 0 17.5-7.8 17.5-17.5S41.7 14 32 14z"
                fill="url(#nightMoonGrad)"
              />
            </g>
            <!-- Cloud in front -->
            <g class="anim-cloud">
              <path
                d="M44 48H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 26.3 22.3 22 28 22c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#nightCloudGrad)"
                stroke="#94A3B8"
                stroke-width="0.8"
              />
            </g>
          </svg>
        }

        <!-- Cloudy -->
        @case ('cloudy') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="backCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#E2E8F0" />
                <stop offset="100%" stop-color="#94A3B8" />
              </linearGradient>
              <linearGradient id="frontCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop offset="100%" stop-color="#CBD5E1" />
              </linearGradient>
            </defs>
            <g class="anim-cloud-back">
              <path
                d="M48 38H26c-3.3 0-6-2.7-6-6 0-3 2.2-5.5 5.1-5.9C25.8 21.2 29.5 18 34 18c4.2 0 7.7 2.9 8.6 7 1.2-.6 2.5-1 3.9-1 4.1 0 7.5 3.4 7.5 7.5 0 3.6-2.7 6.5-6 6.5z"
                fill="url(#backCloudGrad)"
              />
            </g>
            <g class="anim-cloud">
              <path
                d="M42 50H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 28.3 22.3 24 28 24c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#frontCloudGrad)"
                stroke="#CBD5E1"
                stroke-width="0.8"
              />
            </g>
          </svg>
        }

        <!-- Overcast -->
        @case ('overcast') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="overcastGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#CBD5E1" />
                <stop offset="100%" stop-color="#64748B" />
              </linearGradient>
            </defs>
            <g class="anim-cloud">
              <path
                d="M44 48H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 26.3 22.3 22 28 22c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#overcastGrad)"
              />
            </g>
          </svg>
        }

        <!-- Rain -->
        @case ('rain') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="rainCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#E2E8F0" />
                <stop offset="100%" stop-color="#64748B" />
              </linearGradient>
            </defs>
            <g class="anim-cloud">
              <path
                d="M44 40H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 18.3 22.3 14 28 14c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#rainCloudGrad)"
              />
            </g>
            <line x1="20" y1="44" x2="17" y2="52" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" class="anim-drop-1" />
            <line x1="30" y1="44" x2="27" y2="54" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" class="anim-drop-2" />
            <line x1="40" y1="44" x2="37" y2="52" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" class="anim-drop-3" />
          </svg>
        }

        <!-- Drizzle -->
        @case ('drizzle') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="drizzleCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#F1F5F9" />
                <stop offset="100%" stop-color="#94A3B8" />
              </linearGradient>
            </defs>
            <g class="anim-cloud">
              <path
                d="M44 40H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 18.3 22.3 14 28 14c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#drizzleCloudGrad)"
              />
            </g>
            <circle cx="20" cy="46" r="1.5" fill="#38BDF8" class="anim-drop-1" />
            <circle cx="30" cy="48" r="1.5" fill="#38BDF8" class="anim-drop-2" />
            <circle cx="40" cy="46" r="1.5" fill="#38BDF8" class="anim-drop-3" />
          </svg>
        }

        <!-- Heavy Rain -->
        @case ('heavy-rain') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="heavyRainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#94A3B8" />
                <stop offset="100%" stop-color="#475569" />
              </linearGradient>
            </defs>
            <g class="anim-cloud">
              <path
                d="M44 38H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 16.3 22.3 12 28 12c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#heavyRainGrad)"
              />
            </g>
            <line x1="18" y1="42" x2="14" y2="54" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" class="anim-drop-1" />
            <line x1="26" y1="42" x2="22" y2="56" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" class="anim-drop-2" />
            <line x1="34" y1="42" x2="30" y2="54" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" class="anim-drop-3" />
            <line x1="42" y1="42" x2="38" y2="56" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" class="anim-drop-1" />
          </svg>
        }

        <!-- Thunderstorm -->
        @case ('thunderstorm') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="stormGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#64748B" />
                <stop offset="100%" stop-color="#334155" />
              </linearGradient>
            </defs>
            <g class="anim-cloud">
              <path
                d="M44 36H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 14.3 22.3 10 28 10c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#stormGrad)"
              />
            </g>
            <polygon
              points="30,36 24,47 29,47 26,58 36,44 31,44"
              fill="#FBBF24"
              stroke="#F59E0B"
              stroke-width="1"
              class="anim-lightning"
            />
          </svg>
        }

        <!-- Snow -->
        @case ('snow') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="snowCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop offset="100%" stop-color="#E2E8F0" />
              </linearGradient>
            </defs>
            <g class="anim-cloud">
              <path
                d="M44 38H18c-4.4 0-8-3.6-8-8 0-3.9 2.8-7.2 6.7-7.9C17.5 16.3 22.3 12 28 12c5.5 0 10.1 4 11 9.4 1.6-.9 3.4-1.4 5.3-1.4 5.4 0 9.7 4.3 9.7 9.7 0 4.6-3.7 8.3-8.3 8.3z"
                fill="url(#snowCloudGrad)"
                stroke="#CBD5E1"
                stroke-width="1"
              />
            </g>
            <circle cx="20" cy="46" r="2" fill="#93C5FD" class="anim-snow-1" />
            <circle cx="30" cy="50" r="2.2" fill="#93C5FD" class="anim-snow-2" />
            <circle cx="40" cy="46" r="1.8" fill="#93C5FD" class="anim-snow-3" />
          </svg>
        }

        <!-- Fog -->
        @case ('fog') {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full overflow-visible">
            <line x1="14" y1="24" x2="50" y2="24" stroke="#94A3B8" stroke-width="3" stroke-linecap="round" class="anim-fog-1" />
            <line x1="18" y1="32" x2="46" y2="32" stroke="#94A3B8" stroke-width="3" stroke-linecap="round" class="anim-fog-2" />
            <line x1="12" y1="40" x2="52" y2="40" stroke="#94A3B8" stroke-width="3" stroke-linecap="round" class="anim-fog-1" />
            <line x1="20" y1="48" x2="44" y2="48" stroke="#94A3B8" stroke-width="3" stroke-linecap="round" class="anim-fog-2" />
          </svg>
        }

        <!-- Default -->
        @default {
          <svg [attr.viewBox]="'0 0 64 64'" class="w-full h-full">
            <circle cx="32" cy="32" r="16" fill="#FFA000" />
          </svg>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      /* Cloud floating animation */
      .anim-cloud {
        animation: float-cloud 3.5s ease-in-out infinite alternate;
        transform-origin: center;
      }

      .anim-cloud-back {
        animation: float-cloud-back 4.5s ease-in-out infinite alternate;
        transform-origin: center;
      }

      @keyframes float-cloud {
        0% {
          transform: translateY(0px) translateX(0px);
        }
        100% {
          transform: translateY(-2px) translateX(1.5px);
        }
      }

      @keyframes float-cloud-back {
        0% {
          transform: translateY(0px) translateX(0px);
        }
        100% {
          transform: translateY(-1.5px) translateX(-2px);
        }
      }

      /* Sun ray spinning / pulse */
      .anim-sun-group {
        animation: pulse-sun 4s ease-in-out infinite alternate;
      }

      .anim-sun-rays {
        animation: spin-rays 24s linear infinite;
        transform-origin: 0 0;
      }

      .anim-sun-spin {
        animation: spin-sun-slow 20s linear infinite;
        transform-origin: center;
      }

      .anim-sun-pulse {
        animation: pulse-sun-body 3s ease-in-out infinite alternate;
        transform-origin: center;
      }

      @keyframes spin-rays {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes spin-sun-slow {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes pulse-sun {
        0% {
          transform: translate(34px, 22px) scale(0.96);
        }
        100% {
          transform: translate(34px, 22px) scale(1.04);
        }
      }

      @keyframes pulse-sun-body {
        0% {
          transform: scale(0.95);
        }
        100% {
          transform: scale(1.05);
        }
      }

      /* Moon glow & float */
      .anim-moon {
        animation: float-moon 4s ease-in-out infinite alternate;
        transform-origin: center;
      }

      @keyframes float-moon {
        0% {
          transform: translate(6px, 2px) rotate(-3deg);
        }
        100% {
          transform: translate(6px, 0px) rotate(3deg);
        }
      }

      /* Stars twinkling */
      .anim-star-1 {
        animation: twinkle 2s ease-in-out infinite alternate;
      }
      .anim-star-2 {
        animation: twinkle 2.5s ease-in-out 0.5s infinite alternate;
      }
      .anim-star-3 {
        animation: twinkle 1.8s ease-in-out 1s infinite alternate;
      }

      @keyframes twinkle {
        0% {
          opacity: 0.3;
          transform: scale(0.7);
        }
        100% {
          opacity: 1;
          transform: scale(1.3);
        }
      }

      /* Rain drops falling */
      .anim-drop-1 {
        animation: raindrop 1.1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      .anim-drop-2 {
        animation: raindrop 1.3s cubic-bezier(0.4, 0, 0.6, 1) 0.3s infinite;
      }
      .anim-drop-3 {
        animation: raindrop 1.2s cubic-bezier(0.4, 0, 0.6, 1) 0.6s infinite;
      }

      @keyframes raindrop {
        0% {
          opacity: 0;
          transform: translateY(-4px);
        }
        40% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translateY(8px);
        }
      }

      /* Snow falling */
      .anim-snow-1 {
        animation: snowfall 1.8s ease-in-out infinite;
      }
      .anim-snow-2 {
        animation: snowfall 2.1s ease-in-out 0.5s infinite;
      }
      .anim-snow-3 {
        animation: snowfall 1.9s ease-in-out 0.9s infinite;
      }

      @keyframes snowfall {
        0% {
          opacity: 0;
          transform: translateY(-3px) translateX(0);
        }
        40% {
          opacity: 0.9;
        }
        100% {
          opacity: 0;
          transform: translateY(9px) translateX(-2px);
        }
      }

      /* Lightning flash */
      .anim-lightning {
        animation: lightning-flash 3s ease-in-out infinite;
      }

      @keyframes lightning-flash {
        0%,
        88%,
        100% {
          opacity: 0;
        }
        90%,
        94% {
          opacity: 1;
          filter: drop-shadow(0 0 6px #f59e0b);
        }
        92% {
          opacity: 0.3;
        }
      }

      /* Fog drifting */
      .anim-fog-1 {
        animation: fog-drift 4s ease-in-out infinite alternate;
      }
      .anim-fog-2 {
        animation: fog-drift 3.5s ease-in-out infinite alternate-reverse;
      }

      @keyframes fog-drift {
        0% {
          transform: translateX(-3px);
          opacity: 0.7;
        }
        100% {
          transform: translateX(3px);
          opacity: 1;
        }
      }
    `,
  ],
})
export class WeatherIconComponent {
  condition = input<WeatherConditionType>('partly-cloudy-day');
  size = input<number>(24);
}
