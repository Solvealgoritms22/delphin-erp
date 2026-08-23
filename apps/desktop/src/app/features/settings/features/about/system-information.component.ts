import { Component, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { UpdateService } from '@shared/services/update.service';
import { RefreshCwIcon, MonitorCheckIcon, CircleCheckBigIcon, CircleAlertIcon, DownloadIcon, RotateCwIcon } from 'ng-animated-icons';

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
    RefreshCwIcon,
    MonitorCheckIcon,
    CircleCheckBigIcon,
    CircleAlertIcon,
    DownloadIcon,
    RotateCwIcon,
  ],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">

      <div class="shrink-0 p-6 sm:py-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-transparent">
        <div class="w-full max-w-3xl mx-auto">
          <h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {{ 'updater.currentVersion' | transloco }}
          </h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'nav.systemDescription' | transloco }}
          </p>
        </div>
      </div>

      <div class="flex-auto min-h-0 overflow-y-auto p-4 sm:p-6 pb-12">
        <div class="w-full max-w-3xl mx-auto">

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

          <mat-card appearance="outlined" class="overflow-hidden">
            <mat-card-header>
              <mat-card-title class="text-lg font-semibold">
                {{ 'updater.checkManually' | transloco }}
              </mat-card-title>
              <mat-card-subtitle>
                {{ 'updater.checkManuallySubtitle' | transloco }}
              </mat-card-subtitle>
            </mat-card-header>
        <mat-card-content class="pt-4">
          <div class="flex flex-col sm:flex-row gap-4">
            <button
              mat-flat-button
              color="primary"
              (click)="checkForUpdates()"
              [disabled]="checking() || downloading() || !isElectron()"
              class="flex-1"
            >
              <i-refresh-cw [size]="18" class="mr-2" [animate]="checking() || downloading()" />
              {{ checking() ? ('updater.checking' | transloco) : (downloading() ? ('updater.downloading' | transloco : { progress: roundedPercent() }) : ('updater.checkManually' | transloco)) }}
            </button>

            @if (!isElectron()) {
              <span class="flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-2">
                <i-monitor-check [size]="16" class="mr-2" />
                {{ 'updater.notElectron' | transloco }}
              </span>
            }
          </div>

          @if (isUpToDate()) {
            <div class="mt-4 p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center">
              <i-circle-check-big [size]="16" class="mr-2 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span class="font-medium text-sm">{{ 'updater.upToDate' | transloco }}</span>
            </div>
          }

          @if (lastCheck()) {
            <div class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
              {{ 'updater.lastCheck' | transloco }}: {{ lastCheck() }}
            </div>
          }

          @if (updateError()) {
            <div class="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 flex items-center">
              <i-circle-alert [size]="16" class="mr-2 shrink-0 text-red-600" />
              <span>{{ updateError() }}</span>
            </div>
          }

          @if (updateAvailable()) {
            <div class="mt-4 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <div class="font-semibold text-emerald-800 dark:text-emerald-400 mb-2">
                {{ 'updater.available' | transloco }}
              </div>
              <div class="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                {{ 'updater.versionAvailable' | transloco : { version: updateInfo()?.version } }}
              </div>
              <button
                mat-flat-button
                color="primary"
                (click)="installUpdate()"
                class="text-white"
              >
                <i-download [size]="16" class="mr-2" />
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
                <i-rotate-cw [size]="16" class="mr-2" />
                {{ 'updater.restart' | transloco }}
              </button>
            </div>
          }
        </mat-card-content>
      </mat-card>

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
      </div>
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
  protected downloading = computed(() => this.updateService.status() === 'downloading');
  protected isUpToDate = computed(() => this.updateService.status() === 'up-to-date');
  protected updateAvailable = computed(() => this.updateService.status() === 'available');
  protected updateDownloaded = computed(() => this.updateService.status() === 'ready');
  protected updateError = computed(() => this.updateService.error());
  protected updateInfo = computed(() => this.updateService.updateInfo());
  protected roundedPercent = computed(() => Math.round(this.updateService.downloadProgress()?.percent ?? 0));

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