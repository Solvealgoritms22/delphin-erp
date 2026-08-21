import { Component, inject, OnInit, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { AuthState } from '@/app/core/auth/auth.state';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Navigation } from '@/app/layout/admin/ui/nav-tree.component';
import { User } from '@/app/layout/admin/ui/user-profile-menu.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { SearchIcon, XIcon, TriangleAlertIcon, ArrowRightIcon, ClockIcon, SparklesIcon, ArrowUpRightIcon } from 'ng-animated-icons';

@Component({
  selector: 'admin-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Navigation,
    User,
    MatButton,
    TranslocoPipe,
    SearchIcon,
    XIcon,
    TriangleAlertIcon,
    ArrowRightIcon,
    ClockIcon,
    SparklesIcon,
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
        @if (trialExpired()) {

          <div class="m-4 mb-2 shrink-0 rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 p-4">
            <div class="flex items-center gap-2 mb-1">
              <i-triangle-alert [size]="16" class="text-red-500 shrink-0" />
               <div class="text-sm font-bold text-red-700 dark:text-red-400">{{ 'layout.sidebar.trialExpired' | transloco }}</div>
            </div>
            <div class="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
               {{ 'layout.sidebar.trialExpiredDescription' | transloco }}
            </div>
            <button
              (click)="goToPlans()"
              matButton="filled"
              class="small mt-3 w-full cursor-pointer !bg-red-600 hover:!bg-red-700 flex items-center justify-center gap-2"
            >
               {{ 'layout.sidebar.selectPlan' | transloco }}
              <i-arrow-right [size]="16" />
            </button>
          </div>
        } @else if (trialDaysLeft() <= 3) {

          <div class="m-4 mb-2 shrink-0 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 p-4">
            <div class="flex items-center gap-2 mb-1">
              <i-clock [size]="16" class="text-amber-600 shrink-0" />
               <div class="text-sm font-bold text-amber-700 dark:text-amber-400">{{ 'layout.sidebar.trialEnding' | transloco }}</div>
            </div>
            <div class="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
               {{ 'layout.sidebar.trialDaysLeft' | transloco: { days: trialDaysLeft() } }}
            </div>
            <button
              (click)="goToPlans()"
              matButton="filled"
              class="small mt-3 w-full cursor-pointer flex items-center justify-center gap-2"
            >
               {{ 'layout.sidebar.updatePlan' | transloco }}
              <i-arrow-right [size]="16" />
            </button>
          </div>
        } @else {

          <div class="m-4 mb-2 shrink-0 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10 p-4">
            <div class="flex items-center gap-2 mb-1">
              <i-sparkles [size]="16" class="text-blue-500 shrink-0" />
               <div class="text-sm font-bold text-blue-700 dark:text-blue-400">{{ 'layout.sidebar.freeTrial' | transloco }}</div>
            </div>
            <div class="text-xs text-blue-600 dark:text-blue-400 mt-1 leading-relaxed">
               {{ 'layout.sidebar.freeTrialDescription' | transloco: { days: trialDaysLeft() } }}
            </div>
            <button
              (click)="goToPlans()"
              matButton="outlined"
              class="small mt-3 w-full cursor-pointer flex items-center justify-center gap-2"
            >
               {{ 'layout.sidebar.viewPlans' | transloco }}
              <i-arrow-right [size]="16" />
            </button>
           </div>
         }
       } @else if (isFree()) {
         <div class="m-4 mb-2 shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
           <div class="flex items-center gap-2 mb-1">
              <i-arrow-up-right [size]="16" class="text-neutral-500 shrink-0" />
             <div class="text-sm font-bold text-neutral-700 dark:text-neutral-300">{{ 'layout.sidebar.freePlan' | transloco }}</div>
           </div>
           <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
             {{ 'layout.sidebar.freePlanDescription' | transloco }}
           </div>
           <button (click)="goToPlans()" matButton="outlined" class="small mt-3 w-full cursor-pointer flex items-center justify-center gap-2">
             {{ 'layout.sidebar.upgradePlan' | transloco }}
             <i-arrow-right [size]="16" class="ml-1" />
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
    this.http.get<any>(`${environment.apiUrl}/empresas/subscription`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sub) => {
          const planName = String(sub?.plan?.nombre || this.authState.user()?.plan || '').toLowerCase();
          if (sub?.estado === 'TRIAL') {
            this.isTrial.set(true);
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
          }
        },
        error: () => { } // Silently ignore
      });
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
