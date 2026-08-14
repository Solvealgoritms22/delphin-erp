import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Role } from '../../data/roles';
import { TranslocoPipe } from '@jsverse/transloco';
import { XIcon } from 'ng-animated-icons';

export interface UserDialogData {
  user?: {
    id: string;
    email: string;
    name?: string;
    roleId?: string;
    estado: string;
    empresaIds?: string[];
  };
  roles: Role[];
  companies: Array<{ id: string; razonSocial: string; rnc?: string | null }>;
  currentEmpresaId: string;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslocoPipe,
    XIcon,
  ],
  template: `
    <div class="flex flex-col w-full min-w-[320px] sm:min-w-[400px] max-h-[85vh] overflow-hidden">
      <div class="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
        <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
           {{ (isEditing ? 'settings.users.edit' : 'settings.users.create') | transloco }}
        </h2>
        <button (click)="dialogRef.close()" class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer">
          <i-x [size]="16" />
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col p-6 gap-4 overflow-y-auto flex-1">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nombre completo</mat-label>
          <input matInput formControlName="name" placeholder="Nombre y apellido" autocomplete="name" />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Correo Electrónico</mat-label>
          <input matInput formControlName="email" type="email" placeholder="usuario@empresa.com" autocomplete="off" />
          @if (form.get('email')?.hasError('required')) {
            <mat-error>El correo es requerido</mat-error>
          } @else if (form.get('email')?.hasError('email')) {
            <mat-error>Correo electrónico inválido</mat-error>
          }
        </mat-form-field>

        @if (isEditing) {
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nueva Contraseña (Opcional)</mat-label>
            <input matInput formControlName="password" type="password" placeholder="••••••••" autocomplete="new-password" />
            @if (form.get('password')?.hasError('minlength')) {
              <mat-error>Mínimo 6 caracteres</mat-error>
            }
          </mat-form-field>
        } @else {
          <div class="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
            El usuario recibirá una invitación por correo y definirá su propia contraseña al activar la cuenta.
          </div>
        }

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Rol Asignado</mat-label>
          <mat-select formControlName="roleId" placeholder="Selecciona un rol">
            @for (role of data.roles; track role.id) {
              <mat-option [value]="role.id">{{ role.nombre }}</mat-option>
            }
          </mat-select>
          @if (form.get('roleId')?.hasError('required')) {
            <mat-error>El rol es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Estado de Acceso</mat-label>
          <mat-select formControlName="estado">
            <mat-option value="ACTIVO">Activo (Permite Iniciar Sesión)</mat-option>
            <mat-option value="INACTIVO">Inactivo (Bloquea Iniciar Sesión)</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Empresas con acceso</mat-label>
          <mat-select formControlName="empresaIds" multiple placeholder="Selecciona una o más empresas">
            @for (company of data.companies; track company.id) {
              <mat-option [value]="company.id">
                {{ company.razonSocial }}{{ company.rnc ? ' · RNC: ' + company.rnc : '' }}
              </mat-option>
            }
          </mat-select>
          @if (form.get('empresaIds')?.hasError('required')) {
            <mat-error>Debes asignar al menos una empresa</mat-error>
          }
        </mat-form-field>

        <div class="flex items-center justify-end gap-3 mt-4">
          <button type="button" (click)="dialogRef.close()" class="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" [disabled]="form.invalid" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs">
            {{ isEditing ? 'Guardar Cambios' : 'Crear Usuario' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class UserDialogComponent {
  dialogRef = inject(MatDialogRef<UserDialogComponent>);
  data: UserDialogData = inject(MAT_DIALOG_DATA);
  fb = inject(FormBuilder);

  isEditing = !!this.data?.user;

  form = this.fb.group({
    name: [this.data?.user?.name || '', [Validators.required, Validators.minLength(2)]],
    email: [this.data?.user?.email || '', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    roleId: [this.data?.user?.roleId || '', [Validators.required]],
    estado: [this.data?.user?.estado || 'ACTIVO', [Validators.required]],
    empresaIds: [this.data?.user?.empresaIds || (this.data?.currentEmpresaId ? [this.data.currentEmpresaId] : []), [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    const value = this.form.value;
    if (!value.password) {
      delete value.password;
    }
    this.dialogRef.close(value);
  }
}
