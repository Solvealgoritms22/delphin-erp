import { Component, computed, signal, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDivider } from '@angular/material/list';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { RouterOutlet, Router } from '@angular/router';
import { Media } from '@/app/core/media';
import { Assistant } from '@/app/domains/admin/layout/ui/assistant';
import { LanguageSwitcher } from '@/app/domains/admin/layout/ui/language-switcher';
import { Notifications } from '@/app/domains/admin/layout/ui/notifications';
import { SchemeSwitcher } from '@/app/domains/admin/layout/ui/scheme-switcher';
import { Shortcuts } from '@/app/domains/admin/layout/ui/shortcuts';
import { AdminSidebar } from '@/app/domains/admin/layout/ui/sidebar';
import { routeAnimations } from '@/app/core/animations/animations';
import { AuthService } from '@/app/core/auth/auth.service';
import { AuthState } from '@/app/core/auth/auth.state';
import { Empresa } from '@/app/core/auth/auth.types';
import { UpdateService } from '@/app/shared/services/update.service';

@Component({
  selector: 'admin-layout',
  host: {
    class: 'flex h-full w-full flex-1 flex-col min-h-0 overflow-hidden',
  },
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    RouterOutlet,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    AdminSidebar,
    SchemeSwitcher,
    Notifications,
    LanguageSwitcher,
    Shortcuts,
    Assistant,
    MatDivider,
  ],
  animations: [routeAnimations],
  template: `
    <mat-sidenav-container class="h-full w-full overflow-hidden flex-1 min-h-0">
      <mat-sidenav
        class="w-70 border-r border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        [disableClose]="!isMobile()"
        fixedInViewport
        #sidenav="matSidenav"
      >
        <admin-sidebar />
      </mat-sidenav>

      <mat-sidenav-content class="flex flex-col h-full min-h-0 overflow-hidden">
        <!-- Toolbar: draggable in Electron frameless mode -->
        <div
          class="flex shrink-0 items-center border-t border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 select-none"
          [style.-webkit-app-region]="isElectron ? 'drag' : null"
        >
          <button
            matIconButton
            (click)="sidenav.toggle()"
            style="-webkit-app-region: no-drag"
          >
            <mat-icon svgIcon="panel-left" />
          </button>

          <!-- Separator -->
          <div class="mx-3 h-5 border-l border-neutral-200 dark:border-neutral-800"></div>
          
           <!-- Company Selector -->
           @if (empresas().length > 1) {
             <button [matMenuTriggerFor]="companyMenu" class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer mr-2" style="-webkit-app-region: no-drag">
               @if (currentEmpresaLogo()) {
                 <div class="size-8 rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/80 dark:bg-neutral-800/50 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                   <img [src]="currentEmpresaLogo()" [alt]="currentEmpresaLabel()" class="w-full h-full object-contain select-none pointer-events-none">
                 </div>
               } @else {
                 <div class="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs select-none">
                   {{ currentEmpresaLabel().charAt(0).toUpperCase() }}
                 </div>
               }
               <div class="flex flex-col items-start gap-0.5">
                 <span class="text-[13px] font-bold text-neutral-900 dark:text-white leading-none mb-0.5">{{ currentEmpresaLabel() }}</span>
                 <span class="text-[10px] font-medium text-neutral-500 leading-none">{{ currentEmpresaRnc() }}</span>
               </div>
               <mat-icon svgIcon="chevron-down" class="icon-size-4 text-neutral-400 ml-1"></mat-icon>
             </button>
           } @else {
             <div class="flex items-center gap-2.5 px-2.5 py-1.5 mr-2" style="-webkit-app-region: no-drag">
               @if (currentEmpresaLogo()) {
                 <div class="size-8 rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/80 dark:bg-neutral-800/50 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                   <img [src]="currentEmpresaLogo()" [alt]="currentEmpresaLabel()" class="w-full h-full object-contain select-none pointer-events-none">
                 </div>
               } @else {
                 <div class="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs select-none">
                   {{ currentEmpresaLabel().charAt(0).toUpperCase() }}
                 </div>
               }
               <div class="flex flex-col items-start gap-0.5">
                 <span class="text-[13px] font-bold text-neutral-900 dark:text-white leading-none mb-0.5">{{ currentEmpresaLabel() }}</span>
                 <span class="text-[10px] font-medium text-neutral-500 leading-none">{{ currentEmpresaRnc() }}</span>
               </div>
             </div>
           }
          
          <mat-menu #companyMenu="matMenu" class="mt-2 rounded-xl">
            <div class="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
              <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Switch Company</span>
            </div>
            <div class="p-1">
              @if (loadingSwitch()) {
                <div class="flex justify-center py-3">
                  <mat-spinner diameter="24" />
                </div>
              }
              @for (empresa of empresas(); track empresa.id) {
                <button
                  mat-menu-item
                  (click)="switchTenant(empresa)"
                  [class.bg-blue-50]="currentEmpresaId() === empresa.id"
                  [class.dark:bg-blue-900]="currentEmpresaId() === empresa.id"
                  [class.dark:bg-opacity-30]="currentEmpresaId() === empresa.id"
                  class="rounded-lg mb-1 last:mb-0">
                  <div class="flex items-center gap-3">
                    @if (currentEmpresaId() === empresa.id) {
                      <mat-icon svgIcon="check" class="icon-size-4 text-blue-600 dark:text-blue-500 shrink-0"></mat-icon>
                    } @else {
                      <div class="w-4 shrink-0"></div>
                    }
                    <div class="flex flex-col">
                      <span
                        class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                        [class.font-bold]="currentEmpresaId() === empresa.id"
                        [class.text-blue-700]="currentEmpresaId() === empresa.id"
                        [class.dark:text-blue-400]="currentEmpresaId() === empresa.id">
                        {{ empresa.razonSocial }}
                      </span>
                      <span class="text-[10px] text-neutral-400">{{ empresa.rnc ? 'RNC: ' + empresa.rnc : 'Sin RNC' }}</span>
                    </div>
                  </div>
                </button>
              }
            </div>
          </mat-menu>

          <shortcuts style="-webkit-app-region: no-drag" />

          <!-- Draggable spacer across entire empty header area -->
          <div class="flex-auto h-full self-stretch min-w-8" [style.-webkit-app-region]="isElectron ? 'drag' : null"></div>

          <div class="flex items-center gap-x-2" style="-webkit-app-region: no-drag">
            <language-switcher />
            <scheme-switcher />
            <notifications />
            <mat-divider
              vertical
              class="mx-1 h-5"
            />
            <assistant />
          </div>

          <!-- Electron window controls (only in desktop app) -->
          @if (isElectron) {
            <div class="flex items-center gap-1 ml-3" style="-webkit-app-region: no-drag">
              <!-- Minimize -->
              <button
                type="button"
                (click)="windowMinimize()"
                class="flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
                title="Minimizar"
              >
                <mat-icon svgIcon="minus" class="icon-size-4 flex items-center justify-center !w-4 !h-4"></mat-icon>
              </button>
              <!-- Maximize / Restore -->
              <button
                type="button"
                (click)="windowMaximize()"
                class="flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
                [title]="isMaximized() ? 'Restaurar' : 'Maximizar'"
              >
                <mat-icon [svgIcon]="isMaximized() ? 'minimize-2' : 'maximize-2'" class="icon-size-4 flex items-center justify-center !w-4 !h-4"></mat-icon>
              </button>
              <!-- Close -->
              <button
                type="button"
                (click)="windowClose()"
                class="flex size-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-red-500 hover:text-white dark:text-neutral-400 dark:hover:bg-red-600 dark:hover:text-white transition-colors cursor-pointer"
                title="Cerrar"
              >
                <mat-icon svgIcon="x" class="icon-size-4 flex items-center justify-center !w-4 !h-4"></mat-icon>
              </button>
            </div>
          }
        </div>

        <!-- View Container -->
        <div class="relative flex-1 min-h-0 w-full overflow-hidden" [@routeAnimations]="outlet.isActivated ? outlet.activatedRoute : ''">
          <router-outlet #outlet="outlet" />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class AdminLayout implements OnInit, OnDestroy {
  // Dependencies
  private platformId = inject(PLATFORM_ID);
  private media = inject(Media);
  private router = inject(Router);
  private authService = inject(AuthService);
  private authState = inject(AuthState);
  private updateService = inject(UpdateService);

  // Electron frameless window support
  readonly isElectron = isPlatformBrowser(this.platformId) && !!(window as any).dolphinWindow;
  readonly isMaximized = signal(false);

  // Tenant State (real)
  empresas = signal<Empresa[]>([]);
  loadingSwitch = signal(false);

  // Current empresa ID from auth state
  currentEmpresaId = this.authState.empresaId;

  // Derived labels
  currentEmpresaLabel = computed(() => {
    const id = this.currentEmpresaId();
    const found = this.empresas().find(e => e.id === id);
    return found?.razonSocial ?? 'Mi Empresa';
  });

  currentEmpresaRnc = computed(() => {
    const id = this.currentEmpresaId();
    const found = this.empresas().find(e => e.id === id);
    return found?.rnc ? `RNC: ${found.rnc}` : this.authState.user()?.plan ?? '';
  });

  currentEmpresaLogo = computed(() => {
    const id = this.currentEmpresaId();
    return this.empresas().find(e => e.id === id)?.logo || '';
  });

  // State
  protected isMobile = computed(() =>
    this.media.match(`(max-width: 1023px)`)()
  );

  ngOnInit() {
    this.authService.getMyEmpresas().subscribe({
      next: (list) => this.empresas.set(list),
      error: () => { } // silently fail if not connected
    });

    if (this.updateService.isElectron()) {
      this.updateService.checkForUpdates();
    }

    // Subscribe to maximize state changes from Electron main process
    if (this.isElectron) {
      (window as any).dolphinWindow.onMaximizeChange((maximized: boolean) => {
        this.isMaximized.set(maximized);
      });
    }
  }

  ngOnDestroy() { /* nothing to clean up */ }

  switchTenant(empresa: Empresa) {
    if (empresa.id === this.currentEmpresaId()) return;
    this.loadingSwitch.set(true);
    this.authService.switchTenant(empresa.id).subscribe({
      next: () => {
        this.loadingSwitch.set(false);
        // Reload the current route to refresh data for the new tenant
        const currentUrl = this.router.url;
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate([currentUrl]);
        });
      },
      error: () => this.loadingSwitch.set(false)
    });
  }

  getRouteUrl() {
    return this.router.url;
  }

  // Window control methods (only active in Electron)
  windowMinimize() { if (this.isElectron) (window as any).dolphinWindow.minimize(); }
  windowMaximize() { if (this.isElectron) (window as any).dolphinWindow.maximize(); }
  windowClose()    { if (this.isElectron) (window as any).dolphinWindow.close(); }
}
