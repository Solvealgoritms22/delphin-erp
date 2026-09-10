import { Component, inject, OnInit, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { AuthState } from '@core/auth/auth.state';
import { Navigation } from '@layout/admin/ui/nav-tree.component';
import { User } from '@layout/admin/ui/user-profile-menu.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { SearchIcon, XIcon, TriangleAlertIcon, ArrowRightIcon, ClockIcon, ArrowUpRightIcon } from 'ng-animated-icons';

@Component({
  selector: 'admin-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Navigation,
    User,
    TranslocoPipe,
    SearchIcon,
    XIcon,
    TriangleAlertIcon,
    ArrowRightIcon,
    ClockIcon,
    ArrowUpRightIcon
  ],
  host: {
    class: 'flex w-full h-full flex-col overflow-hidden border-t border-neutral-200 dark:border-neutral-800',
  },
  template: `

    <div class="relative flex shrink-0 items-center gap-x-2.5 pt-5 pr-4 pb-0 pl-6 h-16 select-none" style="-webkit-app-region: drag">

      <img
        src="/images/logo/logo_dolphin_light.png"
        class="h-8 w-auto max-w-[200px] object-contain object-left pointer-events-none select-none dark:hidden"
        alt="Dolphin ERP"
      />
      <img
        src="/images/logo/logo_dolphin_dark.png"
        class="h-12 w-auto max-w-[200px] object-contain object-left pointer-events-none select-none hidden dark:block"
        alt="Dolphin logo"
      />

      <div class="flex flex-col ml-1 pointer-events-none select-none">
        <div class="text-neutral-900 dark:text-white text-lg leading-none font-extrabold tracking-widest uppercase">
          Dolphin
        </div>
        <div class="text-blue-600 dark:text-blue-400 text-[10px] leading-3 font-bold tracking-[0.2em] mt-0.5">
          ERP
        </div>
      </div>
    </div>

    <div class="relative shrink-0 px-4 pt-4 pb-1">
      <div class="relative">
        <i-search
          [size]="16"
          class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="text"
          [value]="searchQuery()"
          (input)="onSearch($event)"
           [placeholder]="'layout.sidebar.search' | transloco"
          class="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pr-8 pl-8 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-600 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white dark:focus:bg-neutral-800 dark:focus:border-blue-500"
        />
        @if (searchQuery()) {
          <button
            type="button"
            (click)="clearSearch()"
            class="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <i-x [size]="14" />
          </button>
        }
      </div>
    </div>

    <div
      class="flex flex-col flex-auto overflow-y-auto"
      style="mask-image: linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent); -webkit-mask-image: linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent);"
    >

      <navigation [searchQuery]="searchQuery()" class="mt-4 mb-4 shrink-0" />

      <div class="flex-auto"></div>

        @if (isTrial()) {
          @if (trialDaysLeft() <= 0) {
            <div class="relative overflow-hidden m-3.5 mb-2 shrink-0 rounded-2xl border border-red-200 dark:border-red-500/25 bg-gradient-to-b from-red-50/90 via-white to-red-50/50 dark:from-red-950/40 dark:via-neutral-900/60 dark:to-neutral-900/80 p-4 shadow-xs transition-all hover:shadow-md group/card">
              <div class="relative flex items-center gap-2.5 mb-1.5">
                <div class="w-8 h-8 rounded-xl bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-center justify-center shrink-0">
                  <i-triangle-alert [size]="16" class="text-red-500" />
                </div>
                <div class="text-sm font-bold text-red-700 dark:text-red-400 leading-tight">
                  {{ 'layout.sidebar.trialExpired' | transloco }}
                </div>
              </div>
              <div class="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                {{ 'layout.sidebar.trialExpiredDescription' | transloco }}
              </div>
              <button
                (click)="goToPlans()"
                class="group/btn relative mt-3 w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-2xs transition-all duration-200 cursor-pointer"
              >
                <span>{{ 'layout.sidebar.selectPlan' | transloco }}</span>
                <i-arrow-right [size]="14" class="transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" />
              </button>
            </div>
          } @else if (trialDaysLeft() <= 3) {
            <div class="relative overflow-hidden m-3.5 mb-2 shrink-0 rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-gradient-to-b from-amber-50/90 via-white to-amber-50/50 dark:from-amber-950/40 dark:via-neutral-900/60 dark:to-neutral-900/80 p-4 shadow-xs transition-all hover:shadow-md group/card">
              <div class="relative flex items-center gap-2.5 mb-1.5">
                <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center shrink-0">
                  <i-clock [size]="16" class="text-amber-600 dark:text-amber-400" />
                </div>
                <div class="text-sm font-bold text-amber-700 dark:text-amber-400 leading-tight">
                  {{ 'layout.sidebar.trialEnding' | transloco }}
                </div>
              </div>
              <div class="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                {{ 'layout.sidebar.trialDaysLeft' | transloco: { days: trialDaysLeft() } }}
              </div>
              <button
                (click)="goToPlans()"
                class="group/btn relative mt-3 w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition-all duration-200 cursor-pointer"
              >
                <span>{{ 'layout.sidebar.updatePlan' | transloco }}</span>
                <i-arrow-right [size]="14" class="transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" />
              </button>
            </div>
          } @else {
            <div class="relative overflow-hidden m-3.5 mb-2 shrink-0 rounded-2xl border border-blue-200/80 dark:border-blue-500/25 bg-gradient-to-b from-blue-50/90 via-indigo-50/30 to-white dark:from-blue-950/40 dark:via-neutral-900/60 dark:to-neutral-900/80 p-4 shadow-xs transition-all duration-300 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 group/card">
              <!-- Ambient Glow -->
              <div class="absolute -top-6 -right-6 w-24 h-24 bg-blue-400/20 dark:bg-blue-500/15 rounded-full blur-xl pointer-events-none"></div>

              <div class="relative flex items-center gap-3 mb-2">
                <div class="relative w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-500/30 shadow-2xs">
                  <img src="/images/trial-star-3d.png" alt="3D Star" class="w-8 h-8 object-contain select-none transition-transform duration-300 group-hover/card:scale-110" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-1.5">
                    <div class="text-sm font-bold text-neutral-900 dark:text-white tracking-tight leading-tight">
                      {{ 'layout.sidebar.freeTrial' | transloco }}
                    </div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                      {{ trialDaysLeft() }}d
                    </span>
                  </div>
                  <div class="text-[11px] font-medium text-blue-600 dark:text-blue-400 leading-tight mt-0.5">
                    Full Access
                  </div>
                </div>
              </div>

              <p class="relative text-xs text-neutral-600 dark:text-neutral-300 mt-2 leading-relaxed">
                {{ 'layout.sidebar.freeTrialDescription' | transloco: { days: trialDaysLeft() } }}
              </p>

              <button
                (click)="goToPlans()"
                class="group/btn btn-standard-hover relative mt-3.5 w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs hover:text-white hover:border-transparent transition-all duration-200 cursor-pointer"
              >
                <span>{{ 'layout.sidebar.viewPlans' | transloco }}</span>
                <i-arrow-right [size]="14" class="transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" />
              </button>
            </div>
          }
        } @else if (isFree()) {
          <div class="relative overflow-hidden m-3.5 mb-2 shrink-0 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50/80 dark:bg-neutral-800/40 p-4 shadow-xs">
            <div class="flex items-center gap-2.5 mb-1.5">
              <i-arrow-up-right [size]="16" class="text-neutral-500 shrink-0" />
              <div class="text-sm font-bold text-neutral-800 dark:text-neutral-200">{{ 'layout.sidebar.freePlan' | transloco }}</div>
            </div>
            <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
              {{ 'layout.sidebar.freePlanDescription' | transloco }}
            </div>
            <button
              (click)="goToPlans()"
              class="group/btn btn-standard-hover relative mt-3 w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-white hover:border-transparent shadow-2xs transition-all duration-200 cursor-pointer"
            >
              <span>{{ 'layout.sidebar.upgradePlan' | transloco }}</span>
              <i-arrow-right [size]="14" class="transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" />
            </button>
          </div>
        }
    </div>

    <div class="shrink-0 p-2">
      <user />
    </div>
  `,
})
export class AdminSidebar implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private authState = inject(AuthState);
  private destroyRef = inject(DestroyRef);

  searchQuery = signal('');
  isTrial = signal(false);
  isFree = signal(false);
  trialDaysLeft = signal(0);
  trialExpired = signal(false);

  ngOnInit() {
    const cachedSubStr = localStorage.getItem('cached_company_subscription');
    if (cachedSubStr) {
      try {
        const cachedSub = JSON.parse(cachedSubStr);
        this.processSubscription(cachedSub);
      } catch {}
    }

    this.http.get<any>(`${environment.apiUrl}/empresas/subscription`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sub) => {
          if (sub) {
            localStorage.setItem('cached_company_subscription', JSON.stringify(sub));
            this.processSubscription(sub);
          }
        },
        error: () => { } // Silently ignore offline errors, maintain cached state
      });
  }

  private processSubscription(sub: any) {
    const planName = String(sub?.plan?.nombre || this.authState.user()?.plan || '').toLowerCase();
    if (sub?.estado === 'TRIAL') {
      this.isTrial.set(true);
      this.isFree.set(false);
      const expiry = sub.fechaRenovacion ? new Date(sub.fechaRenovacion) : null;
      if (expiry) {
        const diffMs = expiry.getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) {
          this.trialDaysLeft.set(0);
          this.trialExpired.set(true);
        } else {
          this.trialDaysLeft.set(diffDays);
          this.trialExpired.set(false);
        }
      } else {
        this.trialExpired.set(true);
      }
    } else if (planName === 'free' || planName.includes('gratuito')) {
      this.isFree.set(true);
      this.isTrial.set(false);
    } else {
      this.isFree.set(false);
      this.isTrial.set(false);
    }
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  goToPlans() {
    this.router.navigate(['/admin/plans']);
  }
}
