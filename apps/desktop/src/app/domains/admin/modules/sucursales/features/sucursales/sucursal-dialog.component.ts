import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-sucursal-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
     MatSelectModule,
     TranslocoPipe
  ],
  template: `
    <div class="flex flex-col w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
           {{ (isEdit ? 'branches.edit' : 'branches.new') | transloco }}
        </h2>
        <button mat-icon-button (click)="dialogRef.close()" class="text-neutral-500 hover:text-neutral-700">
          <mat-icon svgIcon="x" class="icon-size-5"></mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col p-6 overflow-y-auto">
        <div class="grid grid-cols-1 gap-4">
          <!-- Nombre -->
          <mat-form-field class="w-full">
             <mat-label>{{ 'branches.name' | transloco }}</mat-label>
             <input matInput formControlName="nombre" [placeholder]="'branches.namePlaceholder' | transloco" />
            @if (form.get('nombre')?.hasError('required')) {
               <mat-error>{{ 'branches.nameRequired' | transloco }}</mat-error>
            }
          </mat-form-field>

          <!-- Ciudad -->
          <mat-form-field class="w-full">
             <mat-label>{{ 'branches.city' | transloco }}</mat-label>
             <input matInput formControlName="ciudad" [placeholder]="'branches.cityPlaceholder' | transloco" />
          </mat-form-field>

          <!-- Dirección -->
          <mat-form-field class="w-full">
             <mat-label>{{ 'branches.address' | transloco }}</mat-label>
             <textarea matInput formControlName="direccion" rows="2" [placeholder]="'branches.addressPlaceholder' | transloco"></textarea>
          </mat-form-field>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Teléfono -->
            <mat-form-field class="w-full">
               <mat-label>{{ 'branches.phone' | transloco }}</mat-label>
               <input matInput formControlName="telefono" placeholder="(809) 555-0000" />
            </mat-form-field>

            <!-- Email -->
            <mat-form-field class="w-full">
               <mat-label>{{ 'auth.fields.email' | transloco }}</mat-label>
              <input matInput formControlName="email" placeholder="sucursal@empresa.com" type="email" />
              @if (form.get('email')?.hasError('email')) {
                 <mat-error>{{ 'branches.emailInvalid' | transloco }}</mat-error>
              }
            </mat-form-field>
          </div>

          <!-- Estado -->
          <mat-form-field class="w-full">
           <mat-label>{{ 'common.status' | transloco }}</mat-label>
            <mat-select formControlName="estado">
               <mat-option value="ACTIVO">{{ 'common.active' | transloco }}</mat-option>
               <mat-option value="INACTIVO">{{ 'common.inactive' | transloco }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="flex items-center justify-end gap-3 mt-6">
           <button mat-button type="button" (click)="dialogRef.close()">{{ 'common.cancel' | transloco }}</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
             {{ 'common.save' | transloco }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class SucursalDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<SucursalDialogComponent>);
  data = inject(MAT_DIALOG_DATA);
  fb = inject(FormBuilder);

  isEdit = false;
  form!: FormGroup;

  ngOnInit() {
    this.isEdit = !!this.data?.sucursal;
    this.form = this.fb.group({
      nombre: [this.data?.sucursal?.nombre || '', Validators.required],
      ciudad: [this.data?.sucursal?.ciudad || ''],
      direccion: [this.data?.sucursal?.direccion || ''],
      telefono: [this.data?.sucursal?.telefono || ''],
      email: [this.data?.sucursal?.email || '', Validators.email],
      estado: [this.data?.sucursal?.estado || 'ACTIVO']
    });
  }

  submit() {
    if (this.form.invalid) return;

    if (this.isEdit) {
      this.dialogRef.close({ action: 'update', data: this.form.value });
    } else {
      this.dialogRef.close({ action: 'create', data: this.form.value });
    }
  }
}
