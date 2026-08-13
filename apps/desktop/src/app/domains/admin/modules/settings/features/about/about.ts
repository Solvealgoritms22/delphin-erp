import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { UpdateService } from '@/app/shared/services/update.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslocoModule,
  ],
  template: `
    <div class="w-full max-w-3xl mx-auto mt-4 p-4">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          {{ 'updater.currentVersion' | transloco }}
        </h1>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {{ 'nav.systemDescription' | transloco }}
        </p>
      </div>

      <!-- Version Card -->
      <mat-card class="mb-6" appearance="outlined">
        <mat-card-content class="p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-4xl font-bold text-neutral-900 dark:text-white font-mono">
                {{ currentVersion() || '—' }}
              </div>
              <div class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Dolphin ERP Desktop
              </div>
            </div>
            <div class="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 p-2">
              <img
                src="/images/logo/logo_dolphin_light.png"
                alt="Dolphin ERP"
                class="w-full h-full object-contain dark:hidden"
              />
              <img
                src="/images/logo/logo_dolphin_dark.png"
                alt="Dolphin ERP"
                class="w-full h-full object-contain hidden dark:block"
              />
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Update Actions Card -->
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title class="text-lg font-semibold">
            {{ 'updater.checkManually' | transloco }}
          </mat-card-title>
          <mat-card-subtitle>
            Comprueba manualmente si hay una nueva versión disponible
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <div class="flex flex-col sm:flex-row gap-4">
            <button
              mat-flat-button
              color="primary"
              (click)="checkForUpdates()"
              [disabled]="checking() || !isElectron()"
              class="flex-1"
            >
              <mat-icon svgIcon="refresh-cw" class="icon-size-5 mr-2" [class.animate-spin]="checking()"></mat-icon>
              {{ checking() ? ('updater.downloading' | transloco : {progress: 0}) : ('updater.checkManually' | transloco) }}
            </button>

            @if (!isElectron()) {
              <span class="flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-2">
                <mat-icon svgIcon="monitor" class="icon-size-4 mr-2"></mat-icon>
                {{ 'updater.notElectron' | transloco }}
              </span>
            }
          </div>

          @if (lastCheck()) {
            <div class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              Última comprobación: {{ lastCheck() }}
            </div>
          }

          @if (updateError()) {
            <div class="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 flex items-center">
              <mat-icon svgIcon="circle-alert" class="icon-size-4 mr-2 shrink-0"></mat-icon>
              <span>{{ updateError() }}</span>
            </div>
          }

          @if (updateAvailable()) {
            <div class="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div class="font-semibold text-emerald-800 dark:text-emerald-400 mb-2">
                {{ 'updater.available' | transloco }}
              </div>
              <div class="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                Versión {{ updateInfo()?.version }} disponible
              </div>
              <button
                mat-flat-button
                color="primary"
                (click)="installUpdate()"
                class="text-white"
              >
                <mat-icon svgIcon="download" class="icon-size-4 mr-2"></mat-icon>
                {{ 'updater.installNow' | transloco }}
              </button>
            </div>
          }

          @if (updateDownloaded()) {
            <div class="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div class="font-semibold text-blue-800 dark:text-blue-400 mb-2">
                {{ 'updater.ready' | transloco }}
              </div>
              <div class="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Versión {{ updateInfo()?.version }} descargada. Reinicia la aplicación para aplicar.
              </div>
              <button
                mat-flat-button
                color="primary"
                (click)="restartApp()"
                class="text-white"
              >
                <mat-icon svgIcon="rotate-cw" class="icon-size-4 mr-2"></mat-icon>
                {{ 'updater.restart' | transloco }}
              </button>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Info Card -->
      <mat-card appearance="outlined" class="mt-6">
        <mat-card-header>
          <mat-card-title class="text-lg font-semibold">
            Información de la aplicación
          </mat-card-title>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt class="text-neutral-500 dark:text-neutral-400">Framework</dt>
              <dd class="font-medium text-neutral-900 dark:text-white">Electron 43</dd>
            </div>
            <div>
              <dt class="text-neutral-500 dark:text-neutral-400">Canal de actualizaciones</dt>
              <dd class="font-medium text-neutral-900 dark:text-white">GitHub Releases</dd>
            </div>
            <div>
              <dt class="text-neutral-500 dark:text-neutral-400">Instalador</dt>
              <dd class="font-medium text-neutral-900 dark:text-white">NSIS for Windows</dd>
            </div>
            <div>
              <dt class="text-neutral-500 dark:text-neutral-400">Actualizaciones automáticas</dt>
              <dd class="font-medium text-neutral-900 dark:text-white">Al iniciar la app</dd>
            </div>
          </dl>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class AboutComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly updateService = inject(UpdateService);
  private readonly transloco = inject(TranslocoService);

  protected currentVersion = this.updateService.currentVersion;
  protected isElectron = this.updateService.isElectron;
  protected checking = computed(() => this.updateService.status() === 'checking');
  protected updateAvailable = computed(() => this.updateService.status() === 'available');
  protected updateDownloaded = computed(() => this.updateService.status() === 'ready');
  protected updateError = computed(() => this.updateService.error());
  protected updateInfo = computed(() => this.updateService.updateInfo());

  protected lastCheck = signal<string | null>(null);

  protected checkForUpdates(): void {
    this.updateService.checkForUpdates();
    this.lastCheck.set(new Date().toLocaleString());
  }

  protected installUpdate(): void {
    this.updateService.installAndRestart();
  }

  protected restartApp(): void {
    this.updateService.installAndRestart();
  }
}