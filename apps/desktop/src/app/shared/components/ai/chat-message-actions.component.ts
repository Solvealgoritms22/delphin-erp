import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { RotateCwIcon, CheckIcon } from 'ng-animated-icons';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-chat-message-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatTooltip, RotateCwIcon, CheckIcon, MatIcon, TranslocoPipe],
  template: `
    <div class="flex items-center gap-1 mt-2 text-neutral-400 select-none">

      <button
        type="button"
        (click)="copyText()"
        class="flex items-center gap-1 size-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors justify-center cursor-pointer"
        [matTooltip]="(copied() ? 'aiChat.copied' : 'aiChat.copyResponse') | transloco"
      >
        @if (copied()) {
          <i-check [size]="13" class="text-emerald-600 dark:text-emerald-400" />
        } @else {
          <mat-icon svgIcon="copy" class="size-3.5" />
        }
      </button>

      <button
        type="button"
        (click)="retry.emit()"
        class="flex items-center gap-1 size-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors justify-center cursor-pointer"
        [matTooltip]="'aiChat.regenerateResponse' | transloco"
      >
        <i-rotate-cw [size]="13" />
      </button>

      <button
        type="button"
        (click)="rate(1)"
        class="flex items-center gap-1 size-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors justify-center cursor-pointer"
        [class.text-blue-600]="rating() === 1"
        [class.dark:text-blue-400]="rating() === 1"
        [class.text-neutral-400]="rating() !== 1"
        [matTooltip]="'aiChat.helpful' | transloco"
      >
        <mat-icon svgIcon="thumbs-up" class="size-3.5" />
      </button>

      <button
        type="button"
        (click)="rate(-1)"
        class="flex items-center gap-1 size-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors justify-center cursor-pointer"
        [class.text-red-600]="rating() === -1"
        [class.dark:text-red-400]="rating() === -1"
        [class.text-neutral-400]="rating() !== -1"
        [matTooltip]="'aiChat.unhelpful' | transloco"
      >
        <mat-icon svgIcon="thumbs-down" class="size-3.5" />
      </button>
    </div>
  `,
})
export class ChatMessageActionsComponent {
  content = input<string>('');
  retry = output<void>();
  feedback = output<number>();

  copied = signal<boolean>(false);
  rating = signal<number>(0);

  copyText() {
    const text = this.content();
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  rate(value: number) {
    if (this.rating() === value) {
      this.rating.set(0);
      this.feedback.emit(0);
    } else {
      this.rating.set(value);
      this.feedback.emit(value);
    }
  }
}
