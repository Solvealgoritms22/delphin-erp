import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export type EmptyStateType = 'no-data' | 'no-results' | 'no-permissions' | 'error';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center p-8 text-center sm:p-12">
      @if (illustration()) {
        <div class="mb-4 flex items-center justify-center">
          <img
            [src]="'illustrations/' + illustration()"
            [alt]="title()"
            class="h-44 w-auto max-w-full select-none object-contain drop-shadow-sm"
            [class.dark:hidden]="illustrationDark()"
          />
          @if (illustrationDark()) {
            <img
              [src]="'illustrations/' + illustrationDark()"
              [alt]="title()"
              class="hidden h-44 w-auto max-w-full select-none object-contain drop-shadow-sm dark:block"
            />
          }
        </div>
      } @else {
        <div
          class="flex size-24 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
        >
          <mat-icon class="size-12" [svgIcon]="getIcon()" />
        </div>
      }

      <div class="mt-4 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {{ title() }}
      </div>

      <div class="mt-2 max-w-md text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
        {{ description() }}
      </div>

      @if (actionLabel()) {
        <button
          mat-stroked-button
          class="mt-6 !rounded-xl !h-10 !px-4"
          (click)="onAction()"
        >
          <mat-icon class="icon-size-4 mr-2" [svgIcon]="actionIcon()" />
          <span>{{ actionLabel() }}</span>
        </button>
      }
    </div>
  `,
  host: {
    class: 'block w-full',
  }
})
export class EmptyStateComponent {
  type = input<EmptyStateType>('no-data');
  title = input.required<string>();
  description = input<string>('There is nothing to show here at the moment.');

  illustration = input<string>();
  illustrationDark = input<string>();
  icon = input<string>();
  actionLabel = input<string>();
  actionIcon = input<string>('plus');
  action = output<void>();
  actionClick = output<void>();

  onAction(): void {
    this.action.emit();
    this.actionClick.emit();
  }

  getIcon(): string {
    if (this.icon()) {
      return this.icon()!;
    }
    switch (this.type()) {
      case 'no-results':
        return 'search';
      case 'no-permissions':
        return 'lock';
      case 'error':
        return 'alert-triangle';
      case 'no-data':
      default:
        return 'inbox';
    }
  }
}
