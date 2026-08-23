import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { lucideIcons } from './lucide';

export const provideIcons = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideAppInitializer(() => {
      const domSanitizer = inject(DomSanitizer);
      const matIconRegistry = inject(MatIconRegistry);

      matIconRegistry.addSvgIconSetLiteral(
        domSanitizer.bypassSecurityTrustHtml(lucideIcons),
        { viewBox: '0 0 24 24' }
      );

      matIconRegistry.addSvgIconLiteral(
        'google-drive',
        domSanitizer.bypassSecurityTrustHtml(
          `<svg viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/><path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00AC47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l9.25-16c.8-1.4 1.2-2.95 1.2-4.5h-27.5l13.7 23.8z" fill="#EA4335"/><path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/><path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC"/><path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/></svg>`
        )
      );

      const aiSparklesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10 3C10 7.97 5.97 12 1 12C5.97 12 10 16.03 10 21C10 16.03 14.03 12 19 12C14.03 12 10 7.97 10 3Z"/><path d="M19 1C19 3.21 17.21 5 15 5C17.21 5 19 6.79 19 9C19 6.79 20.79 5 23 5C20.79 5 19 3.21 19 1Z"/></svg>`;
      matIconRegistry.addSvgIconLiteral(
        'sparkles',
        domSanitizer.bypassSecurityTrustHtml(aiSparklesSvg)
      );
      matIconRegistry.addSvgIconLiteral(
        'ai-stars',
        domSanitizer.bypassSecurityTrustHtml(aiSparklesSvg)
      );

      const panelLeftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>`;
      const panelLeftCloseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>`;
      const panelLeftOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>`;

      matIconRegistry.addSvgIconLiteral(
        'panel-left',
        domSanitizer.bypassSecurityTrustHtml(panelLeftSvg)
      );
      matIconRegistry.addSvgIconLiteral(
        'panel-left-close',
        domSanitizer.bypassSecurityTrustHtml(panelLeftCloseSvg)
      );
      matIconRegistry.addSvgIconLiteral(
        'panel-left-open',
        domSanitizer.bypassSecurityTrustHtml(panelLeftOpenSvg)
      );

      const xCircleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
      matIconRegistry.addSvgIconLiteral(
        'x-circle',
        domSanitizer.bypassSecurityTrustHtml(xCircleSvg)
      );
      matIconRegistry.addSvgIconLiteral(
        'circle-x',
        domSanitizer.bypassSecurityTrustHtml(xCircleSvg)
      );
    }),
  ]);
