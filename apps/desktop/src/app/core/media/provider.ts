import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { Media } from './media';

export const provideMedia = (): EnvironmentProviders =>
  makeEnvironmentProviders([

    provideAppInitializer(() => {
      inject(Media);
    }),
  ]);
