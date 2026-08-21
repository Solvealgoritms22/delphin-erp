import { MediaMatcher } from '@angular/cdk/layout';
import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';

type MediaQueryObserver = {
  matches: WritableSignal<boolean>;
  handler: (event: MediaQueryListEvent) => void;
};

@Injectable({ providedIn: 'root' })
export class Media {

  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private mediaMatcher = inject(MediaMatcher);

  private matchers = new Map<string, MediaQueryObserver>();

  match(query: string): Signal<boolean> {
    const existingMatcher = this.matchers.get(query);
    if (existingMatcher) {
      return existingMatcher.matches.asReadonly();
    }

    const mql = this.mediaMatcher.matchMedia(query);

    const matches = signal(mql.matches);

    const handler = (event: MediaQueryListEvent) => {
      matches.set(event.matches);
    };

    if (this.isBrowser) {
      mql.addEventListener('change', handler);
      this.destroyRef.onDestroy(() => {
        mql.removeEventListener('change', handler);
      });
    }

    this.matchers.set(query, {
      matches,
      handler,
    });

    return matches.asReadonly();
  }
}
