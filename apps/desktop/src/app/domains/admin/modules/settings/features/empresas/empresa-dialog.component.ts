import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-empresa-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
     MatIconModule,
     TranslocoPipe
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
        <mat-icon svgIcon="briefcase" class="icon-size-5"></mat-icon>
      </div>
       <span class="text-xl font-bold">{{ (data ? 'companies.edit' : 'companies.new') | transloco }}</span>
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-4">

        <!-- Company logo -->
        <div class="flex items-center gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-4">
          <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm">
             <img *ngIf="logoPreview()" [src]="logoPreview()" [alt]="'companies.logoAlt' | transloco" class="h-full w-full object-contain p-2">
            <mat-icon *ngIf="!logoPreview()" svgIcon="briefcase" class="icon-size-8"></mat-icon>
          </div>
          <div class="flex min-w-0 flex-col gap-2">
             <span class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{{ 'companies.logo' | transloco }}</span>
             <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ 'companies.logoHint' | transloco }}</span>
            <div class="flex items-center gap-2">
              <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700">
                <mat-icon svgIcon="upload" class="icon-size-4"></mat-icon>
                 {{ 'companies.uploadLogo' | transloco }}
                <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onLogoSelected($event)" class="hidden">
              </label>
              <button *ngIf="logoPreview()" type="button" mat-stroked-button class="!rounded-lg !text-xs" (click)="removeLogo()">
                <mat-icon svgIcon="trash" class="icon-size-4 mr-1"></mat-icon>
                 {{ 'companies.removeLogo' | transloco }}
              </button>
            </div>
            <span *ngIf="logoError()" class="text-xs font-medium text-red-600 dark:text-red-400">{{ logoError() }}</span>
          </div>
        </div>
        
        <mat-form-field appearance="outline" class="w-full">
           <mat-label>{{ 'companies.legalName' | transloco }}</mat-label>
           <input matInput formControlName="razonSocial" [placeholder]="'companies.legalNamePlaceholder' | transloco" required>
          <mat-error *ngIf="form.get('razonSocial')?.hasError('required')">
             {{ 'companies.legalNameRequired' | transloco }}
          </mat-error>
        </mat-form-field>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <mat-form-field appearance="outline" class="w-full">
             <mat-label>{{ 'companies.taxId' | transloco }}</mat-label>
            <input matInput formControlName="rnc" placeholder="130204394">
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
             <mat-label>{{ 'companies.phone' | transloco }}</mat-label>
            <input matInput formControlName="telefono" placeholder="+1 809 555 5555">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="w-full">
           <mat-label>{{ 'companies.email' | transloco }}</mat-label>
          <input matInput type="email" formControlName="email" placeholder="contacto@empresa.com">
          <mat-error *ngIf="form.get('email')?.hasError('email')">
             {{ 'companies.emailInvalid' | transloco }}
          </mat-error>
        </mat-form-field>

      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="p-6">
       <button mat-button mat-dialog-close>{{ 'common.cancel' | transloco }}</button>
      <button mat-flat-button class="bg-blue-600 hover:bg-blue-700 text-white ml-2 rounded-full px-6" (click)="save()" [disabled]="form.invalid || isSaving">
         <span *ngIf="!isSaving">{{ (data ? 'common.saveChanges' : 'companies.create') | transloco }}</span>
        <span *ngIf="isSaving" class="flex items-center gap-2">
          <mat-icon class="animate-spin icon-size-4" svgIcon="refresh"></mat-icon>
           {{ 'common.saving' | transloco }}
        </span>
      </button>
    </mat-dialog-actions>
  `
})
export class EmpresaDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<EmpresaDialogComponent>);
  public data = inject(MAT_DIALOG_DATA, { optional: true });
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private transloco = inject(TranslocoService);

  form: FormGroup;
  isSaving = false;

  constructor() {
    this.form = this.fb.group({
      razonSocial: ['', Validators.required],
      rnc: [''],
      telefono: [''],
      email: ['', Validators.email],
      logo: ['']
    });
  }

  logoPreview = signal<string>('');
  logoError = signal<string>('');

  ngOnInit() {
    if (this.data) {
      this.form.patchValue(this.data);
      this.logoPreview.set(this.data.logo || '');
    }
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.logoError.set('');
    if (file.size > 2 * 1024 * 1024) {
       this.logoError.set(this.transloco.translate('companies.logoTooLarge'));
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const logo = reader.result as string;
      this.logoPreview.set(logo);
      this.form.patchValue({ logo });
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.logoPreview.set('');
    this.form.patchValue({ logo: null });
  }

  save() {
    if (this.form.invalid) return;

    this.isSaving = true;

    const request = this.data
      ? this.http.patch(`${environment.apiUrl}/empresas/${this.data.id}`, this.form.value)
      : this.http.post(`${environment.apiUrl}/empresas`, this.form.value);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }
}
