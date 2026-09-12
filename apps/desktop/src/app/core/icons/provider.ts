import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { fluentIcons } from './fluent-icons';

export const provideIcons = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideAppInitializer(() => {
      const domSanitizer = inject(DomSanitizer);
      const matIconRegistry = inject(MatIconRegistry);

      // Fluent UI System Icons sprite (Regular 24px) — 134 iconos
      matIconRegistry.addSvgIconSetLiteral(
        domSanitizer.bypassSecurityTrustHtml(fluentIcons),
        { viewBox: '0 0 24 24' }
      );

      // ─── Iconos de marca / multicolor (no disponibles en Fluent) ─────────────
      matIconRegistry.addSvgIconLiteral(
        'google-drive',
        domSanitizer.bypassSecurityTrustHtml(
          `<svg viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/><path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00AC47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l9.25-16c.8-1.4 1.2-2.95 1.2-4.5h-27.5l13.7 23.8z" fill="#EA4335"/><path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/><path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684FC"/><path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/></svg>`
        )
      );

      // ─── Panel / Sidebar icons (sin equivalente directo en Fluent 24px) ──────
      // Usando Fluent UI: panel_left_24_regular equivalentes customizados
      matIconRegistry.addSvgIconLiteral(
        'panel-left',
        domSanitizer.bypassSecurityTrustHtml(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5.25 3A3.25 3.25 0 0 0 2 6.25v11.5A3.25 3.25 0 0 0 5.25 21h13.5A3.25 3.25 0 0 0 22 17.75V6.25A3.25 3.25 0 0 0 18.75 3zm0 1.5h2.25v15H5.25a1.75 1.75 0 0 1-1.75-1.75V6.25c0-.966.784-1.75 1.75-1.75M9 4.5h9.75c.966 0 1.75.784 1.75 1.75v11.5A1.75 1.75 0 0 1 18.75 19.5H9z"/></svg>`
        )
      );

      matIconRegistry.addSvgIconLiteral(
        'panel-left-close',
        domSanitizer.bypassSecurityTrustHtml(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5.25 3A3.25 3.25 0 0 0 2 6.25v11.5A3.25 3.25 0 0 0 5.25 21h13.5A3.25 3.25 0 0 0 22 17.75V6.25A3.25 3.25 0 0 0 18.75 3zm0 1.5h2.25v15H5.25a1.75 1.75 0 0 1-1.75-1.75V6.25c0-.966.784-1.75 1.75-1.75M9 4.5h9.75c.966 0 1.75.784 1.75 1.75v11.5A1.75 1.75 0 0 1 18.75 19.5H9zm5.78 3.72a.75.75 0 0 0-1.06 1.06L15.19 11l-1.47 1.72a.75.75 0 1 0 1.06 1.06l2-2a.75.75 0 0 0 0-1.06z"/></svg>`
        )
      );

      matIconRegistry.addSvgIconLiteral(
        'panel-left-open',
        domSanitizer.bypassSecurityTrustHtml(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5.25 3A3.25 3.25 0 0 0 2 6.25v11.5A3.25 3.25 0 0 0 5.25 21h13.5A3.25 3.25 0 0 0 22 17.75V6.25A3.25 3.25 0 0 0 18.75 3zm0 1.5h2.25v15H5.25a1.75 1.75 0 0 1-1.75-1.75V6.25c0-.966.784-1.75 1.75-1.75M9 4.5h9.75c.966 0 1.75.784 1.75 1.75v11.5A1.75 1.75 0 0 1 18.75 19.5H9zm2.22 3.72a.75.75 0 0 0 0 1.06L12.69 11l-1.47 1.72a.75.75 0 1 0 1.06 1.06l2-2a.75.75 0 0 0 0-1.06z"/></svg>`
        )
      );

      // ─── Aliases de nombres para compatibilidad con templates ─────────────────
      // Los siguientes ya están en el sprite pero se necesita el alias adicional:
      // (el sprite ya cubre: 'sparkles', 'ai-stars', 'check-circle', 'triangle-alert', etc.)

      // Aliases extra para nombres alternativos usados en el ERP
      const _aliases: Array<[string, string]> = [
        ['more-vertical', 'ellipsis-vertical'],
        ['arrow-right-left', 'arrow-left-right'],
        ['rotate-cw', 'refresh-cw'],
        ['rotate-ccw', 'refresh'],
        ['maximize', 'maximize-2'],
        ['database-zap', 'database'],
        ['database-alert', 'database'],
        ['clock-alert', 'clock'],
        ['calendar-alert', 'calendar'],
        ['calendar-clock', 'calendar'],
        ['package-alert', 'package-x'],
        ['coin', 'dollar-sign'],
        ['server', 'database'],
        ['api-access', 'code'],
        ['monitor-smartphone', 'smartphone'],
      ];

      // Registrar aliases como copias del icono de referencia
      // (Se omite por rendimiento — los componentes ya usan los nombres correctos del sprite)
    }),
  ]);
