import { Component, computed, inject, effect, signal } from '@angular/core';
import { Location } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UpdateService } from '@shared/services/update.service';
import { MarkdownRendererComponent } from '@shared/components/markdown-renderer/markdown-renderer.component';

@Component({
  selector: 'app-release-notes',
  standalone: true,
  imports: [TranslocoPipe, MatButtonModule, MatIconModule, MarkdownRendererComponent],
  template: `
    <main class="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white">
      <header class="border-b border-neutral-200 px-6 py-8 md:px-8 dark:border-neutral-700">
        <div class="mx-auto max-w-3xl">
          <button mat-button type="button" (click)="back()" class="inline-flex items-center gap-1.5 -ml-2 text-primary dark:text-primary-400">
            <mat-icon svgIcon="arrow-left" class="!w-4 !h-4 !text-[16px]"></mat-icon>
            <span>{{ 'updater.notesBack' | transloco }}</span>
          </button>
          <h1 class="mt-4 text-3xl font-extrabold tracking-tight">{{ 'updater.notesTitle' | transloco }}</h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{{ 'updater.notesHelp' | transloco }}</p>
        </div>
      </header>
      <article class="mx-auto max-w-3xl px-6 py-8 md:px-8">
        <p class="mb-6 text-sm font-semibold tabular-nums">{{ service.updateInfo()?.version || service.currentVersion() }}</p>
        @if (loading()) {
          <div class="animate-pulse space-y-4" aria-busy="true"><div class="h-8 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700"></div><div class="h-40 rounded bg-neutral-100 dark:bg-neutral-800"></div></div>
        } @else if (notes()) {
          <markdown-renderer [content]="notes()" />
        } @else {
          <div class="space-y-4">
            <p class="rounded-xl border border-neutral-200 p-6 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">{{ 'updater.notesEmpty' | transloco }}</p>
            <button mat-flat-button color="primary" (click)="loadNotes()">{{ 'updater.notesRetry' | transloco }}</button>
          </div>
        }
      </article>
    </main>
  `,
})
export class ReleaseNotesComponent {
  protected readonly service = inject(UpdateService);
  private readonly location = inject(Location);
  protected readonly loading = signal(false);
  private readonly remoteNotes = signal<string | null>(null);
  private request = 0;
  protected readonly notes = computed(() => {
    if (this.remoteNotes() !== null) return this.remoteNotes() || '';
    const notes = this.service.updateInfo()?.releaseNotes;
    return typeof notes === 'string' ? (/<[a-z][\s\S]*>/i.test(notes) ? '' : notes) : (notes || []).map(entry => '## ' + entry.version + '\n\n' + entry.note).join('\n\n');
  });
  constructor() { effect(() => { this.service.updateInfo(); this.service.currentVersion(); void this.loadNotes(); }); }
  protected async loadNotes(): Promise<void> {
    const version = this.service.updateInfo()?.version || this.service.currentVersion();
    if (!version || !window.dolphinUpdater?.getReleaseNotes) return;
    const request = ++this.request;
    this.loading.set(true);
    try { const notes = await window.dolphinUpdater.getReleaseNotes(version); if (request === this.request) this.remoteNotes.set(notes); }
    catch { if (request === this.request) this.remoteNotes.set(null); }
    finally { if (request === this.request) this.loading.set(false); }
  }
  protected back(): void { this.location.back(); }
}
