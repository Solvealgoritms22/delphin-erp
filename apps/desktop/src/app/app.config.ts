import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { provideIcons } from '@/app/core/icons/provider';
import { provideTheming } from '@/app/core/theming';
import { TranslocoHttpLoader } from '@/app/core/transloco/transloco-http-loader';
import { routes } from './app.routes';

import { authInterceptor } from '@/app/core/auth/auth.interceptor';
import { errorInterceptor } from '@/app/core/http/error.interceptor';
import { provideAngularQuery, QueryClient } from '@tanstack/angular-query-experimental';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideAngularQuery(new QueryClient()),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor])
    ),

    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),

    // Material
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        subscriptSizing: 'dynamic',
      },
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        enterAnimationDuration: '280ms',
        exitAnimationDuration: '240ms',
      },
    },
    provideNativeDateAdapter(),

    // Core
    provideIcons(),
    provideTheming({
      scheme: 'system',
      primary: '#0079b8',
      error: '#dc2626',
    }),

    // Third-party
    provideTransloco({
      config: {
        availableLangs: [
          {
            id: 'en',
            label: 'English',
          },
          {
            id: 'es',
            label: 'Español',
          },
        ],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      const storedLang = typeof localStorage !== 'undefined'
        ? localStorage.getItem('dolphin_language')
        : null;
      const lang = storedLang === 'es' ? 'es' : 'en';
      transloco.setActiveLang(lang);
      return transloco.load(lang);
    }),
  ],
};
