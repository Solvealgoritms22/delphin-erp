import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChevronDownIcon, SparklesIcon } from 'ng-animated-icons';
import { ThinkingOrbComponent } from '@shared/components/thinking-orb/thinking-orb.component';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-thinking-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChevronDownIcon, SparklesIcon, ThinkingOrbComponent, TranslocoPipe],
  template: `
    @if (content() && content().trim()) {
      <div
        class="my-2.5 overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 shadow-2xs transition-all"
        [class.ring-1]="isThinking()"
        [class.ring-blue-500/30]="isThinking()"
      >

        <button
          type="button"
          (click)="toggleExpanded()"
          class="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer select-none"
        >
          <div class="flex items-center gap-2 min-w-0">
            @if (isThinking()) {
              <div class="relative flex items-center justify-center size-5 shrink-0">
                <div class="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
                <thinking-orb [size]="18" state="composing" />
              </div>
              <span class="font-semibold text-blue-600 dark:text-blue-400 truncate">
                {{ 'aiChat.reasoning' | transloco }}
              </span>
            } @else {
              <div class="flex items-center justify-center size-5 rounded-md bg-neutral-200/70 dark:bg-neutral-800 text-neutral-500 shrink-0">
                <i-sparkles [size]="13" class="text-blue-500 dark:text-blue-400" />
              </div>
              <span class="font-semibold text-neutral-700 dark:text-neutral-200 truncate">
                {{ 'aiChat.thoughtProcess' | transloco }}
              </span>
              @if (durationSeconds()) {
                <span class="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                  ({{ durationSeconds() }}s)
                </span>
              }
            }
          </div>

          <div class="flex items-center gap-1.5 shrink-0 text-neutral-400">
            <span class="text-[10px] font-medium hidden sm:inline">
              {{ (isExpanded() ? 'aiChat.hideReasoning' : 'aiChat.viewReasoning') | transloco }}
            </span>
            <div
              class="transition-transform duration-200"
              [class.rotate-180]="isExpanded()"
            >
              <i-chevron-down [size]="14" />
            </div>
          </div>
        </button>

        @if (isExpanded()) {
          <div
            class="border-t border-neutral-200/60 dark:border-neutral-800/80 px-4 py-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 font-sans bg-white/40 dark:bg-black/20"
          >
            <div class="border-l-2 border-blue-500/40 dark:border-blue-400/30 pl-3.5 whitespace-pre-wrap font-mono text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">
              {{ content() }}
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ThinkingBlockComponent {
  content = input<string>('');
  isThinking = input<boolean>(false);
  durationSeconds = input<number | null>(null);

  isExpanded = signal<boolean>(false);

  toggleExpanded() {
    this.isExpanded.update((v) => !v);
  }
}
