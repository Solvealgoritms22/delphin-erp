import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-pos-note-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col p-6 min-w-[360px] max-w-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-2xl">
      <!-- Header Limpio -->
      <div class="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ 'pos.noteTitle' | transloco }}</h2>
        <button mat-icon-button (click)="dialogRef.close()" class="!w-8 !h-8 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
          <mat-icon svgIcon="circle-x" class="!w-4 !h-4"></mat-icon>
        </button>
      </div>

      <div class="py-5 space-y-2">
        <label class="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          {{ 'pos.noteLabel' | transloco }}
        </label>
        <textarea
          rows="4"
          [(ngModel)]="note"
          [placeholder]="'pos.notePlaceholder' | transloco"
          class="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 p-3 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white outline-none focus:border-primary-500 transition-all placeholder:text-neutral-400 resize-none"
          cdkFocusInitial
        ></textarea>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
        <button mat-button (click)="dialogRef.close()" class="!rounded-xl !text-xs !text-neutral-400 hover:!text-neutral-600 dark:hover:!text-neutral-200 !px-3">
          {{ 'common.cancel' | transloco }}
        </button>
        <button mat-flat-button color="primary" (click)="save()" class="!rounded-xl !px-6 !text-xs !font-bold">
          {{ 'common.save' | transloco }}
        </button>
      </div>
    </div>
  `,
})
export class PosNoteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<PosNoteDialogComponent>);
  readonly initialNote: string = inject(MAT_DIALOG_DATA) || '';

  note = this.initialNote;

  save(): void {
    this.dialogRef.close(this.note.trim());
  }
}
