import { Component, Inject, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

export interface ToastData {
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, NgClass],
  template: `
    <div
      class="flex w-full items-start gap-x-4 rounded-lg p-4 shadow-lg ring-1 ring-black/5"
      [ngClass]="{
        'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400': data.type === 'success',
        'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400': data.type === 'error',
        'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400': data.type === 'warning',
        'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400': data.type === 'info',
        'bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300': data.type === 'loading'
      }"
    >
      <mat-icon
        class="mt-0.5 shrink-0"
        [svgIcon]="getIcon()"
        [ngClass]="{
          'animate-spin': data.type === 'loading'
        }"
      />
      <div class="flex-auto">
        @if (data.title) {
          <div class="font-semibold">{{ data.title }}</div>
        }
        <div class="text-sm opacity-90">{{ data.message }}</div>
      </div>
      <button
        mat-icon-button
        class="-m-2 shrink-0"
        (click)="snackBarRef.dismiss()"
      >
        <mat-icon svgIcon="x" class="size-5" />
      </button>
    </div>
  `,
  host: {
    class: 'block w-full max-w-sm',
  }
})
export class ToastComponent {
  snackBarRef = inject(MatSnackBarRef);

  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: ToastData) {}

  getIcon(): string {
    switch (this.data.type) {
      case 'success':
        return 'check-circle-2';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert-triangle';
      case 'info':
        return 'info';
      case 'loading':
        return 'loader-2';
      default:
        return 'info';
    }
  }
}
