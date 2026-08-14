import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Role } from '../../data/roles';
import { TranslocoPipe } from '@jsverse/transloco';
import { XIcon, UploadIcon, TrashIcon, UserRoundIcon } from 'ng-animated-icons';

export interface UserDialogData {
  user?: {
    id: string;
    email: string;
    name?: string;
    roleId?: string;
    estado: string;
    avatar?: string;
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
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslocoPipe,
    XIcon,
    UploadIcon,
    TrashIcon,
    UserRoundIcon,
  ],
  template: `
    <div class="flex flex-col w-full min-w-[320px] sm:min-w-[420px] max-h-[88vh] overflow-hidden">
      <div class="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
        <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
           {{ (isEditing ? 'settings.users.edit' : 'settings.users.create') | transloco }}
        </h2>
        <button (click)="dialogRef.close()" class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer">
          <i-x [size]="16" />
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col p-6 gap-4 overflow-y-auto flex-1">
        
        <!-- Profile Picture Upload -->
        <div class="flex items-center gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-4">
          <div class="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm">
            @if (avatarPreview()) {
              <img [src]="avatarPreview()" alt="Foto de perfil" class="h-full w-full object-cover">
            } @else if (form.get('name')?.value || form.get('email')?.value) {
              <div class="w-full h-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xl">
                {{ getInitial() }}
              </div>
            } @else {
              <i-user-round [size]="28" class="text-neutral-400" />
            }
          </div>
          <div class="flex min-w-0 flex-col gap-1.5">
            <span class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Foto de perfil</span>
            <span class="text-xs text-neutral-500 dark:text-neutral-400">PNG, JPG o WEBP (máx. 2MB)</span>
            <div class="flex items-center gap-2 mt-0.5">
              <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 shadow-xs">
                <i-upload [size]="14" />
                {{ avatarPreview() ? 'Cambiar foto' : 'Subir foto' }}
                <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onAvatarSelected($event)" class="hidden">
              </label>
              @if (avatarPreview()) {
                <button type="button" (click)="removeAvatar()" class="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition cursor-pointer">
                  <i-trash [size]="13" />
                  Eliminar
                </button>
              }
            </div>
            @if (avatarError()) {
              <span class="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{{ avatarError() }}</span>
            }
          </div>
        </div>

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
          <button type="button" (click)="dialogRef.close()" class="px-5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="submit" [disabled]="form.invalid" class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs cursor-pointer">
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
  avatarPreview = signal<string>(this.data?.user?.avatar || '');
  avatarError = signal<string>('');

  form = this.fb.group({
    name: [this.data?.user?.name || '', [Validators.required, Validators.minLength(2)]],
    email: [this.data?.user?.email || '', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    roleId: [this.data?.user?.roleId || '', [Validators.required]],
    estado: [this.data?.user?.estado || 'ACTIVO', [Validators.required]],
    avatar: [this.data?.user?.avatar || null],
    empresaIds: [this.data?.user?.empresaIds || (this.data?.currentEmpresaId ? [this.data.currentEmpresaId] : []), [Validators.required]],
  });

  getInitial(): string {
    const name = this.form.get('name')?.value || this.form.get('email')?.value || '';
    return name.charAt(0).toUpperCase();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.avatarError.set('');
    if (file.size > 2 * 1024 * 1024) {
      this.avatarError.set('La imagen supera el límite máximo de 2MB');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const avatar = reader.result as string;
      this.avatarPreview.set(avatar);
      this.form.patchValue({ avatar });
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarPreview.set('');
    this.form.patchValue({ avatar: null });
  }

  submit(): void {
    if (this.form.invalid) return;
    const value = this.form.value;
    if (!value.password) {
      delete value.password;
    }
    this.dialogRef.close(value);
  }
}
