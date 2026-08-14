import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { TrashIcon, TriangleAlertIcon, CheckIcon, XIcon } from 'ng-animated-icons';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  destructive?: boolean;
  requireMatchString?: string;
  matchPlaceholder?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    TrashIcon,
    TriangleAlertIcon,
    CheckIcon,
    XIcon,
  ],
  template: `
    <div class="flex flex-col w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 items-center justify-center rounded-full"
            [class.bg-red-100]="data.destructive"
            [class.text-red-600]="data.destructive"
            [class.bg-blue-100]="!data.destructive"
            [class.text-blue-600]="!data.destructive"
          >
            @if (data.destructive) {
              <i-trash [size]="20" />
            } @else {
              <i-triangle-alert [size]="20" />
            }
          </div>
          <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
            {{ data.title || (data.destructive ? '¿Confirmar acción?' : 'Aviso') }}
          </h2>
        </div>
        <button mat-icon-button (click)="dialogRef.close(false)" class="text-neutral-500 hover:text-neutral-700">
          <i-x [size]="18" />
        </button>
      </div>

      <div class="flex flex-col px-6 py-6">
        <p class="text-neutral-600 dark:text-neutral-400" [innerHTML]="data.message"></p>

        <!-- Match String Input -->
        <div *ngIf="data.requireMatchString" class="mt-6">
          <mat-form-field appearance="outline" class="w-full mb-0">
            <mat-label>{{ data.matchPlaceholder || 'Escribe la palabra exacta para confirmar' }}</mat-label>
            <input matInput [(ngModel)]="matchValue" autocomplete="off">
          </mat-form-field>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 pb-6">
        <button mat-button (click)="dialogRef.close(false)">
          {{ data.cancelLabel || 'Cancelar' }}
        </button>
        <button
          mat-flat-button
          (click)="dialogRef.close(true)"
          class="rounded-xl"
          [disabled]="isConfirmDisabled()"
          [class.bg-red-600]="data.destructive"
          [class.hover:bg-red-700]="data.destructive"
          [class.text-white]="data.destructive"
          [class.bg-blue-600]="!data.destructive"
          [class.hover:bg-blue-700]="!data.destructive"
        >
          @if (data.destructive) {
            <i-trash [size]="16" class="mr-2" />
          } @else {
            <i-check [size]="16" class="mr-2" />
          }
          {{ data.confirmLabel || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  
  matchValue = '';

  isConfirmDisabled(): boolean {
    if (this.data.requireMatchString) {
      return this.matchValue !== this.data.requireMatchString;
    }
    return false;
  }
}
