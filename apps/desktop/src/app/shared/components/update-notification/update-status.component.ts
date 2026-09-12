import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { XIcon } from 'ng-animated-icons';
import type { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-update-status',
  standalone: true,
  imports: [MatButtonModule, MatProgressBarModule, TranslocoPipe, XIcon],
  template: `
    <section
      class="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
    >
      <div class="p-5 sm:p-6">
        <div class="mb-4 flex items-center justify-between gap-4">
          <span
            class="text-xs font-semibold tracking-widest text-neutral-500 uppercase dark:text-neutral-400"
            >{{ 'updater.title' | transloco }}</span
          >
          @if (compact()) {
            <button
              mat-icon-button
              type="button"
              (click)="dismissed.emit()"
              [attr.aria-label]="'common.close' | transloco"
            >
              <i-x [size]="18" />
            </button>
          }
        </div>
        <div
          role="status"
          [attr.aria-live]="compact() ? null : 'polite'"
          aria-atomic="true"
        >
          <h2 class="text-xl font-bold tracking-tight">
            {{ titleKey() | transloco }}
          </h2>
          <p
            class="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300"
          >
            {{ messageKey() | transloco }}
          </p>
        </div>
        @if (service().updateInfo(); as info) {
          <div
            class="mt-4 flex flex-wrap items-center gap-2 text-sm tabular-nums"
          >
            <span
              class="rounded-md bg-neutral-100 px-2 py-1 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >{{ service().currentVersion() || '—' }}</span
            >
            <span aria-hidden="true">→</span>
            <span
              class="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
              >{{ info.version }}</span
            >
          </div>
        }
        @if (
          status() === 'checking' ||
          status() === 'available' ||
          status() === 'downloading'
        ) {
          <div class="mt-5">
            <mat-progress-bar
              [mode]="
                status() === 'downloading' && service().downloadProgress()
                  ? 'determinate'
                  : 'indeterminate'
              "
              [value]="percent()"
              [attr.aria-label]="'updater.progressLabel' | transloco"
            />
            @if (
              status() === 'downloading' && service().downloadProgress();
              as progress
            ) {
              <div
                class="mt-2 flex justify-between gap-3 text-xs text-neutral-500 tabular-nums dark:text-neutral-400"
              >
                <span>{{ percent() }}%</span>
                <span
                  >{{ megabytes(progress.transferred) }} /
                  {{ megabytes(progress.total) }} MB</span
                >
              </div>
            }
          </div>
        }
        @if (!compact() && service().lastChecked(); as checked) {
          <p class="mt-5 text-xs text-neutral-500 dark:text-neutral-400">
            {{ 'updater.lastCheck' | transloco }}: {{ formatCheck(checked) }}
          </p>
        }
      </div>
      @if (compact() || status() === 'ready' || service().canCheckUpdates()) {
        <div
          class="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-950"
        >
          @if (compact()) {
            <button
              mat-button
              type="button"
              (click)="dismissed.emit()"
            >
              {{
                (status() === 'ready'
                  ? 'updater.later'
                  : 'updater.continueWorking'
                ) | transloco
              }}
            </button>
          }
          @if (status() === 'ready') {
            <button
              mat-flat-button
              type="button"
              (click)="service().installAndRestart()"
            >
              {{ 'updater.restart' | transloco }}
            </button>
          } @else if (service().canCheckUpdates()) {
            <button
              mat-flat-button
              type="button"
              (click)="service().checkForUpdates()"
            >
              {{
                (status() === 'error'
                  ? 'updater.retry'
                  : 'updater.checkManually'
                ) | transloco
              }}
            </button>
          }
        </div>
      }
    </section>
  `,
})
export class UpdateStatusComponent {
  private readonly transloco = inject(TranslocoService);
  protected formatCheck(date: Date): string {
    return date.toLocaleString(
      this.transloco.getActiveLang() === 'es' ? 'es-DO' : 'en-US'
    );
  }
  readonly service = input.required<UpdateService>();
  readonly compact = input(false);
  readonly dismissed = output<void>();
  protected readonly status = computed(() => this.service().status());
  protected readonly percent = computed(() => {
    const value = this.service().downloadProgress()?.percent ?? 0;
    return Number.isFinite(value)
      ? Math.round(Math.min(100, Math.max(0, value)))
      : 0;
  });
  protected readonly titleKey = computed(() => {
    if (!this.service().isElectron()) return 'updater.title';
    const keys = {
      idle: 'updater.checkManually',
      checking: 'updater.checking',
      available: 'updater.available',
      downloading: 'updater.downloadTitle',
      ready: 'updater.ready',
      error: 'updater.checkFailed',
      'up-to-date': 'updater.upToDate',
    };
    return keys[this.status()];
  });
  protected readonly messageKey = computed(() => {
    if (!this.service().isElectron()) return 'updater.notElectron';
    const keys = {
      idle: 'updater.automaticHelp',
      checking: 'updater.checkingHelp',
      available: 'updater.preparingHelp',
      downloading: 'updater.backgroundHelp',
      ready: 'updater.readyHelp',
      error: 'updater.errorHelp',
      'up-to-date': 'updater.currentHelp',
    };
    return keys[this.status()];
  });
  protected megabytes(bytes: number): string {
    return (Number.isFinite(bytes) ? Math.max(0, bytes) / 1048576 : 0).toFixed(
      1
    );
  }
}
