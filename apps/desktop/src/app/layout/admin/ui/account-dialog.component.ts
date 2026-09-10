import { MfaSettingsComponent } from './mfa-settings.component';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '@/environments/environment';
import { AuthState } from '@core/auth/auth.state';
import { SessionMonitorService } from '@core/auth/session-monitor.service';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  UserRoundIcon,
  XIcon,
  UploadIcon,
  TrashIcon,
  TriangleAlertIcon,
  CheckIcon,
} from 'ng-animated-icons';

type AccountTab = 'profile' | 'security' | 'smtp' | 'danger';

@Component({
  selector: 'app-account-dialog',
  standalone: true,
  imports: [
    MfaSettingsComponent,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    TranslocoPipe,
    UserRoundIcon,
    XIcon,
    UploadIcon,
    TrashIcon,
    TriangleAlertIcon,
    CheckIcon,
  ],
  template: `
    <div class="relative flex flex-col w-full max-w-4xl min-h-[560px] max-h-[90vh] overflow-hidden bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900">
        <div class="flex flex-col">
          <h2 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            {{ 'account.title' | transloco }}
          </h2>
          <span class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Administra tu identidad, credenciales de seguridad, correos y ciclo de vida de la cuenta.
          </span>
        </div>
        <button (click)="dialogRef.close()" class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer">
          <i-x [size]="16" />
        </button>
      </div>

      <!-- Stepper / Tabs Bar -->
      <div class="flex items-center gap-1 sm:gap-2 px-6 sm:px-8 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 overflow-x-auto shrink-0 select-none">
        <button type="button" (click)="activeTab.set('profile')"
          [class]="'flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ' +
          (activeTab() === 'profile'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white/60 dark:bg-neutral-800/50'
            : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300')">
          <i-user-round [size]="16" />
          <span>{{ 'account.tabs.profile' | transloco }}</span>
        </button>

        <button type="button" (click)="activeTab.set('security')"
          [class]="'flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ' +
          (activeTab() === 'security'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white/60 dark:bg-neutral-800/50'
            : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300')">
          <mat-icon svgIcon="shield" class="!w-4 !h-4 !text-[16px]"></mat-icon>
          <span>{{ 'account.tabs.security' | transloco }}</span>
        </button>

        @if (isOwner()) {
          <button type="button" (click)="activeTab.set('smtp')"
            [class]="'flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ' +
            (activeTab() === 'smtp'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white/60 dark:bg-neutral-800/50'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300')">
            <mat-icon svgIcon="mail" class="!w-4 !h-4 !text-[16px]"></mat-icon>
            <span>{{ 'account.tabs.smtp' | transloco }}</span>
          </button>
        }

        <button type="button" (click)="activeTab.set('danger')"
          [class]="'flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ml-auto ' +
          (activeTab() === 'danger'
            ? 'border-rose-600 text-rose-600 dark:text-rose-400 font-bold bg-rose-50/50 dark:bg-rose-950/20'
            : 'border-transparent text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400')">
          <i-triangle-alert [size]="15" class="text-rose-500" />
          <span>{{ 'account.tabs.danger' | transloco }}</span>
        </button>
      </div>

      <!-- Main Step Content Container -->
      <div class="flex-1 overflow-y-auto p-6 sm:p-8">

        <!-- ============================================================ -->
        <!-- TAB 1: PERFIL (Profile Information)                          -->
        <!-- ============================================================ -->
        @if (activeTab() === 'profile') {
          <div class="grid grid-cols-1 md:grid-cols-12 gap-8">

            <!-- Columna Izquierda: Tarjeta de Identidad -->
            <div class="md:col-span-4 flex flex-col items-center p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-center gap-4">
              <div class="relative group">
                <div class="w-28 h-28 rounded-full bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 font-bold text-3xl flex items-center justify-center border-4 border-neutral-200 dark:border-neutral-700 shadow-md overflow-hidden select-none">
                  @if (avatarUrl()) {
                    <img [src]="avatarUrl()" alt="Avatar" class="w-full h-full object-cover" />
                  } @else {
                    {{ initials() }}
                  }
                </div>
                <label class="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110 border-2 border-white dark:border-neutral-900" title="Subir foto">
                  <i-upload [size]="16" />
                  <input type="file" (change)="onFileSelected($event)" accept="image/png,image/jpeg,image/webp" class="hidden" />
                </label>
              </div>

              <div class="flex flex-col items-center">
                <span class="text-base font-bold text-neutral-900 dark:text-white leading-snug">{{ displayName() }}</span>
                <span class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 break-all">{{ user()?.email }}</span>
              </div>

              @if (avatarUrl()) {
                <button type="button" (click)="removeAvatar()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 rounded-lg border border-red-200 dark:border-red-900/40 transition cursor-pointer">
                  <i-trash [size]="13" />
                  Eliminar foto
                </button>
              }

              <!-- Badges de Rol y Estado -->
              <div class="w-full pt-4 border-t border-neutral-200 dark:border-neutral-700/60 flex flex-col gap-2.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-neutral-500 dark:text-neutral-400">{{ 'account.systemRole' | transloco }}:</span>
                  @if (isOwner()) {
                    <span class="font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                      <mat-icon svgIcon="crown" class="!w-3.5 !h-3.5 !text-[14px]"></mat-icon>
                      Propietario
                    </span>
                  } @else {
                    <span class="font-bold text-neutral-700 dark:text-neutral-300">
                      {{ roleName() || ('account.member' | transloco) }}
                    </span>
                  }
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-neutral-500 dark:text-neutral-400">{{ 'account.status' | transloco }}:</span>
                  <span class="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    {{ 'account.active' | transloco }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Columna Derecha: Formulario de Perfil -->
            <div class="md:col-span-8 flex flex-col gap-5 justify-between">
              <form [formGroup]="profileForm" class="flex flex-col gap-4">
                <div>
                  <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-1">Información Básica</h3>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400">Actualiza los datos personales que se muestran en el sistema y comprobantes.</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'account.fullName' | transloco }} *</mat-label>
                    <input matInput formControlName="name" [placeholder]="'account.namePlaceholder' | transloco" autocomplete="name" />
                    @if (profileForm.get('name')?.hasError('required')) {
                      <mat-error>El nombre completo es requerido</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'account.profession' | transloco }}</mat-label>
                    <input matInput formControlName="oficio" [placeholder]="'account.professionPlaceholder' | transloco" />
                    <mat-icon matSuffix svgIcon="briefcase" class="!w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
                  </mat-form-field>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'auth.fields.email' | transloco }}</mat-label>
                    <input matInput [value]="user()?.email" type="email" [readonly]="true" [disabled]="true" class="opacity-75" />
                    <mat-icon matSuffix svgIcon="lock" class="!w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>{{ 'account.phone' | transloco }}</mat-label>
                    <input matInput formControlName="telefono" [placeholder]="'account.phonePlaceholder' | transloco" autocomplete="tel" />
                    <mat-icon matSuffix svgIcon="phone" class="!w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>{{ 'account.identityDocument' | transloco }}</mat-label>
                  <input matInput formControlName="documentoIdentidad" [placeholder]="'account.identityDocumentPlaceholder' | transloco" />
                  <mat-icon matSuffix svgIcon="id-card" class="!w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
                  <mat-hint class="text-xs text-neutral-500 dark:text-neutral-400">{{ 'account.identityDocumentHint' | transloco }}</mat-hint>
                </mat-form-field>
              </form>

              <div class="pt-4 flex items-center justify-end">
                <button type="button" (click)="saveProfile()" [disabled]="profileForm.invalid || isSavingProfile()"
                  class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs flex items-center gap-2 cursor-pointer">
                  @if (isSavingProfile()) {
                    <span>{{ 'common.saving' | transloco }}</span>
                  } @else {
                    <mat-icon svgIcon="save" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                    <span>Guardar Datos de Perfil</span>
                  }
                </button>
              </div>
            </div>

          </div>
        }

        <!-- ============================================================ -->
        <!-- TAB 2: SEGURIDAD Y CONTRASEÑA                                -->
        <!-- ============================================================ -->
        @if (activeTab() === 'security') {
          <div class="flex flex-col gap-8">

            <!-- Subsección 1: Actualizar Contraseña -->
            <div class="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/30 flex flex-col gap-5">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <mat-icon svgIcon="lock" class="!w-5 !h-5 !text-[20px]"></mat-icon>
                </div>
                <div>
                  <h3 class="text-base font-bold text-neutral-900 dark:text-white">{{ 'account.security.changePassword' | transloco }}</h3>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Elige una contraseña robusta de al menos 6 caracteres para proteger tu cuenta.</p>
                </div>
              </div>

              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>{{ 'account.security.currentPassword' | transloco }}</mat-label>
                  <input matInput [type]="showCurrentPassword() ? 'text' : 'password'" formControlName="currentPassword" autocomplete="current-password" placeholder="••••••••" />
                  <button type="button" mat-icon-button matSuffix (click)="showCurrentPassword.set(!showCurrentPassword())">
                    <mat-icon [svgIcon]="showCurrentPassword() ? 'eye-off' : 'eye'" class="!w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
                  </button>
                  @if (passwordForm.get('currentPassword')?.hasError('required') && passwordForm.get('currentPassword')?.touched) {
                    <mat-error>Requerida</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>{{ 'account.security.newPassword' | transloco }}</mat-label>
                  <input matInput [type]="showNewPassword() ? 'text' : 'password'" formControlName="newPassword" autocomplete="new-password" placeholder="••••••••" />
                  <button type="button" mat-icon-button matSuffix (click)="showNewPassword.set(!showNewPassword())">
                    <mat-icon [svgIcon]="showNewPassword() ? 'eye-off' : 'eye'" class="!w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
                  </button>
                  @if (passwordForm.get('newPassword')?.hasError('minlength')) {
                    <mat-error>Mínimo 6 caracteres</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>{{ 'account.security.confirmPassword' | transloco }}</mat-label>
                  <input matInput [type]="showConfirmPassword() ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password" placeholder="••••••••" />
                  <button type="button" mat-icon-button matSuffix (click)="showConfirmPassword.set(!showConfirmPassword())">
                    <mat-icon [svgIcon]="showConfirmPassword() ? 'eye-off' : 'eye'" class="!w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
                  </button>
                </mat-form-field>

                @if (passwordChangeError()) {
                  <div class="sm:col-span-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-900/40">
                    {{ passwordChangeError() }}
                  </div>
                }

                @if (passwordChangeSuccess()) {
                  <div class="sm:col-span-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-2">
                    <i-check [size]="14" />
                    {{ passwordChangeSuccess() }}
                  </div>
                }

                <div class="sm:col-span-3 flex justify-end">
                  <button type="submit" [disabled]="passwordForm.invalid || isChangingPassword()"
                    class="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-2">
                    @if (isChangingPassword()) {
                      <span>Actualizando...</span>
                    } @else {
                      <mat-icon svgIcon="save" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                      <span>{{ 'account.security.updatePasswordBtn' | transloco }}</span>
                    }
                  </button>
                </div>
              </form>
            </div>

            <!-- Subsección 2: Autenticación de Dos Factores (2FA) -->
            <div>
              <app-mfa-settings />
            </div>

          </div>
        }

        <!-- ============================================================ -->
        <!-- TAB 3: SERVIDOR SMTP (Exclusivo para Owners)                -->
        <!-- ============================================================ -->
        @if (activeTab() === 'smtp' && isOwner()) {
          <div class="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-5">
            <div class="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/30 pb-4">
              <div class="flex flex-col">
                <span class="text-base font-bold text-emerald-950 dark:text-emerald-200">Servidor de Correo Saliente (SMTP Global)</span>
                <span class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Utilizado para enviar invitaciones de usuarios, comprobantes y notificaciones del sistema.</span>
              </div>
              <mat-slide-toggle [formControl]="smtpEnabledControl" color="primary"></mat-slide-toggle>
            </div>

            @if (smtpEnabledControl.value) {
              <form [formGroup]="smtpForm" class="flex flex-col gap-4 pt-2">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <mat-form-field appearance="outline" class="sm:col-span-2 w-full">
                    <mat-label>Host SMTP</mat-label>
                    <input matInput formControlName="smtpHost" placeholder="smtp.gmail.com">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Puerto</mat-label>
                    <input matInput type="number" formControlName="smtpPort" placeholder="587">
                  </mat-form-field>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Usuario SMTP</mat-label>
                    <input matInput formControlName="smtpUser" placeholder="usuario@empresa.com">
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Contraseña SMTP</mat-label>
                    <input matInput type="password" formControlName="smtpPass" placeholder="••••••••">
                  </mat-form-field>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Dirección "De" (From)</mat-label>
                    <input matInput formControlName="smtpFrom" placeholder="Dolphin ERP &lt;no-reply@empresa.com&gt;">
                    <mat-hint>Si se omite, se usa el usuario SMTP</mat-hint>
                  </mat-form-field>
                  <div class="flex items-center gap-3 pl-2">
                    <mat-slide-toggle formControlName="smtpSecure" color="primary"></mat-slide-toggle>
                    <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Conexión Segura (TLS/SSL)</span>
                  </div>
                </div>

                @if (smtpTestResult()) {
                  <div [class]="'flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ' + (smtpTestResult()!.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/30')">
                    <mat-icon [svgIcon]="smtpTestResult()!.success ? 'check-circle' : 'alert-triangle'" class="!w-4 !h-4 !text-[16px] shrink-0 mt-0.5"></mat-icon>
                    <div class="flex flex-col">
                      <span>{{ smtpTestResult()!.message }}</span>
                      @if (smtpTestResult()!.latencyMs) {
                        <span class="text-xs opacity-75">Latencia: {{ smtpTestResult()!.latencyMs }}ms</span>
                      }
                    </div>
                  </div>
                }

                <div class="flex items-center justify-between pt-2">
                  <button type="button" (click)="testSmtp()" [disabled]="testingSmtp()"
                    class="flex items-center gap-2 h-9 px-4 rounded-xl border border-emerald-400 dark:border-emerald-700 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50 cursor-pointer">
                    <mat-icon [svgIcon]="testingSmtp() ? 'loader' : 'wifi'" class="!w-4 !h-4 !text-[16px]" [class.animate-spin]="testingSmtp()"></mat-icon>
                    {{ testingSmtp() ? 'Probando...' : 'Probar conexión TCP' }}
                  </button>

                  <button type="button" (click)="saveSmtp()" [disabled]="isSavingSmtp()"
                    class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-2">
                    @if (isSavingSmtp()) {
                      <span>Guardando...</span>
                    } @else {
                      <mat-icon svgIcon="save" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                      <span>Guardar Configuración SMTP</span>
                    }
                  </button>
                </div>
              </form>
            }
          </div>
        }

        <!-- ============================================================ -->
        <!-- TAB 4: ZONA DE PELIGRO (Danger Zone)                         -->
        <!-- ============================================================ -->
        @if (activeTab() === 'danger') {
          <div class="flex flex-col gap-6">

            <div class="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10 flex flex-col gap-6">
              <div>
                <h3 class="text-base font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
                  <i-triangle-alert [size]="18" class="text-rose-600 dark:text-rose-400" />
                  {{ 'account.dangerZone.title' | transloco }}
                </h3>
                <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {{ 'account.dangerZone.subtitle' | transloco }}
                </p>
              </div>

              <!-- Tarjeta 1: Eliminar Toda Mi Data -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 gap-4">
                <div class="flex flex-col max-w-lg">
                  <span class="text-sm font-bold text-neutral-900 dark:text-white">{{ 'account.dangerZone.wipeDataTitle' | transloco }}</span>
                  <span class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    {{ 'account.dangerZone.wipeDataDesc' | transloco }}
                  </span>
                </div>
                <button type="button" (click)="openDestructiveConfirmation('wipe')"
                  class="shrink-0 px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold text-xs transition cursor-pointer">
                  {{ 'account.dangerZone.wipeDataBtn' | transloco }}
                </button>
              </div>

              <!-- Tarjeta 2: Eliminar Cuenta Definitivamente -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl bg-white dark:bg-neutral-900 border border-red-300 dark:border-red-900/60 gap-4">
                <div class="flex flex-col max-w-lg">
                  <span class="text-sm font-bold text-red-700 dark:text-red-400">{{ 'account.dangerZone.deleteAccountTitle' | transloco }}</span>
                  <span class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                    {{ 'account.dangerZone.deleteAccountDesc' | transloco }}
                  </span>
                </div>
                <button type="button" (click)="openDestructiveConfirmation('delete')"
                  class="shrink-0 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm">
                  {{ 'account.dangerZone.deleteAccountBtn' | transloco }}
                </button>
              </div>
            </div>

          </div>
        }

      </div>

      <!-- Footer / Step Navigation Controls -->
      <div class="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900">
        <div>
          @if (activeTab() !== 'profile') {
            <button type="button" (click)="navigatePrevious()" class="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer">
              Anterior
            </button>
          }
        </div>

        <div class="flex items-center gap-3">
          <button type="button" (click)="dialogRef.close()" class="px-5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer">
            {{ 'common.close' | transloco }}
          </button>

          @if (hasNextStep()) {
            <button type="button" (click)="navigateNext()" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs">
              Siguiente
            </button>
          }
        </div>
      </div>

      <!-- ============================================================ -->
      <!-- OVERLAY DE CONFIRMACIÓN DE SEGURIDAD DESTRUCTIVA             -->
      <!-- ============================================================ -->
      @if (confirmingAction()) {
        <div class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs rounded-3xl">
          <div class="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">

            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <i-triangle-alert [size]="20" />
              </div>
              <div class="flex flex-col">
                <h4 class="text-base font-bold text-neutral-900 dark:text-white">
                  {{ confirmingAction() === 'wipe' ? '¿Restablecer toda tu data?' : '¿Eliminar tu cuenta definitivamente?' }}
                </h4>
                <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Esta acción no se puede deshacer y borrará permanentemente la información seleccionada.
                </p>
              </div>
            </div>

            <!-- Información Condicional de 2FA -->
            @if (mfaEnabled()) {
              <div class="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 flex flex-col gap-1.5">
                <div class="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                  <mat-icon svgIcon="shield" class="!w-4 !h-4 !text-[16px] text-blue-600 dark:text-blue-400"></mat-icon>
                  Autenticación en Dos Pasos (2FA) Activa
                </div>
                <p class="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                  Por seguridad, proporciona el código de 6 dígitos de tu aplicación autenticadora o un código de recuperación.
                </p>
              </div>

              <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                <mat-label>Código 2FA o de Recuperación *</mat-label>
                <input matInput [(ngModel)]="destructiveMfaCode" placeholder="123456" autocomplete="one-time-code" />
              </mat-form-field>
            } @else {
              <div class="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex flex-col gap-1.5">
                <div class="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <mat-icon svgIcon="lock" class="!w-4 !h-4 !text-[16px] text-amber-600 dark:text-amber-400"></mat-icon>
                  Confirmación de Credenciales Requerida
                </div>
                <p class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Debes confirmar tu correo electrónico y tu contraseña actual para autorizar esta operación crítica.
                </p>
              </div>

              <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                <mat-label>Correo Electrónico *</mat-label>
                <input matInput [(ngModel)]="destructiveEmail" placeholder="usuario@empresa.com" autocomplete="email" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                <mat-label>Contraseña Actual *</mat-label>
                <input matInput type="password" [(ngModel)]="destructivePassword" placeholder="••••••••" autocomplete="current-password" />
              </mat-form-field>
            }

            <!-- Frase de confirmación -->
            <div class="flex flex-col gap-1 mt-1">
              <span class="text-xs text-neutral-600 dark:text-neutral-400">
                Escribe <code class="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-bold text-red-600 dark:text-red-400">{{ expectedPhrase() }}</code> para confirmar:
              </span>
              <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                <input matInput [(ngModel)]="destructivePhrase" [placeholder]="expectedPhrase()" />
              </mat-form-field>
            </div>

            @if (destructiveError()) {
              <div class="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg border border-red-200 dark:border-red-900/40">
                {{ destructiveError() }}
              </div>
            }

            <div class="flex items-center justify-end gap-3 pt-2">
              <button type="button" (click)="cancelDestructiveConfirmation()" [disabled]="isProcessingDestructive()"
                class="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer">
                Cancelar
              </button>
              <button type="button" (click)="executeDestructiveAction()" [disabled]="!canExecuteDestructive() || isProcessingDestructive()"
                class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-sm">
                {{ isProcessingDestructive() ? 'Procesando...' : (confirmingAction() === 'wipe' ? 'Restablecer Datos' : 'Eliminar Cuenta') }}
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `,
})
export class AccountDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<AccountDialogComponent>);
  private matDialog = inject(MatDialog);
  private authState = inject(AuthState);
  private sessionMonitor = inject(SessionMonitorService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  user = this.authState.user;
  avatarUrl = signal<string>(this.user()?.avatar || '');
  isOwner = signal<boolean>(false);
  roleName = signal<string>('');
  mfaEnabled = signal<boolean>(false);

  activeTab = signal<AccountTab>('profile');

  // Perfil
  isSavingProfile = signal<boolean>(false);
  profileForm = this.fb.group({
    name: [this.user()?.name || '', [Validators.required]],
    oficio: [this.user()?.oficio || ''],
    telefono: [this.user()?.telefono || ''],
    documentoIdentidad: [this.user()?.documentoIdentidad || ''],
  });

  // Contraseña
  isChangingPassword = signal<boolean>(false);
  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  passwordChangeError = signal<string>('');
  passwordChangeSuccess = signal<string>('');
  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  // SMTP
  isSavingSmtp = signal<boolean>(false);
  testingSmtp = signal<boolean>(false);
  smtpTestResult = signal<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  smtpEnabledControl = this.fb.control(false);
  smtpForm = this.fb.group({
    smtpHost: [''],
    smtpPort: [587],
    smtpUser: [''],
    smtpPass: [''],
    smtpFrom: [''],
    smtpSecure: [true],
  });

  // Zona de peligro
  confirmingAction = signal<'wipe' | 'delete' | null>(null);
  destructiveEmail = '';
  destructivePassword = '';
  destructiveMfaCode = '';
  destructivePhrase = '';
  isProcessingDestructive = signal<boolean>(false);
  destructiveError = signal<string>('');

  expectedPhrase = computed(() => {
    return this.confirmingAction() === 'wipe' ? 'ELIMINAR DATOS' : 'ELIMINAR CUENTA';
  });

  displayName = computed(() => {
    const u = this.user();
    if (!u) return '';
    return this.profileForm.get('name')?.value || u.name || u.email.split('@')[0];
  });

  initials = computed(() => {
    const name = this.displayName();
    if (!name) return 'U';
    return name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  });

  ngOnInit() {
    this.loadUserData();
    this.loadMfaStatus();
  }

  loadMfaStatus(): void {
    this.http.get<{ enabled: boolean }>(`${environment.apiUrl}/auth/mfa`).subscribe({
      next: (res) => this.mfaEnabled.set(res.enabled),
      error: () => this.mfaEnabled.set(false),
    });
  }

  loadUserData(): void {
    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (userData) => {
        if (userData) {
          this.profileForm.patchValue({
            name: userData.nombre || userData.name || '',
            oficio: userData.oficio || '',
            telefono: userData.telefono || '',
            documentoIdentidad: userData.documentoIdentidad || '',
          });
          this.avatarUrl.set(userData.avatar || '');
          this.smtpEnabledControl.setValue(userData.smtpEnabled || false);
          this.smtpForm.patchValue({
            smtpHost: userData.smtpHost || '',
            smtpPort: userData.smtpPort || 587,
            smtpUser: userData.smtpUser || '',
            smtpPass: userData.smtpPass || '',
            smtpFrom: userData.smtpFrom || '',
            smtpSecure: userData.smtpSecure ?? true,
          });
        }
      }
    });

    this.http.get<any>(`${environment.apiUrl}/empresas/current`).subscribe({
      next: (data) => {
        const u = this.user();
        if (data?.propietarioId && u?.id && data.propietarioId === u.id) {
          this.isOwner.set(true);
        }
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar(): void {
    this.avatarUrl.set('');
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.isSavingProfile.set(true);
    const formVal = this.profileForm.getRawValue();
    const payload = {
      name: formVal.name,
      avatar: this.avatarUrl(),
      oficio: formVal.oficio?.trim() || null,
      telefono: formVal.telefono?.trim() || null,
      documentoIdentidad: formVal.documentoIdentidad?.trim() || null,
    };

    this.http.patch<any>(`${environment.apiUrl}/auth/profile`, payload).subscribe({
      next: () => {
        if (this.user()) {
          const current = this.user()!;
          this.authState.setUser({
            ...current,
            name: payload.name || current.name,
            avatar: payload.avatar || current.avatar,
            oficio: payload.oficio,
            telefono: payload.telefono,
            documentoIdentidad: payload.documentoIdentidad,
          });
        }
        this.isSavingProfile.set(false);
        this.snackBar.open('Perfil actualizado exitosamente', 'Cerrar', { duration: 2500 });
      },
      error: (err) => {
        this.isSavingProfile.set(false);
        this.snackBar.open(err?.error?.message || 'Error al actualizar perfil', 'Cerrar', { duration: 4000 });
      }
    });
  }

  changePassword(): void {
    this.passwordChangeError.set('');
    this.passwordChangeSuccess.set('');

    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.passwordChangeError.set('Las contraseñas no coinciden.');
      return;
    }

    this.isChangingPassword.set(true);
    this.http.patch(`${environment.apiUrl}/auth/password`, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.passwordChangeSuccess.set('Contraseña actualizada exitosamente.');
        this.passwordForm.reset();
        this.snackBar.open('Contraseña actualizada exitosamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.isChangingPassword.set(false);
        this.passwordChangeError.set(err?.error?.message || 'Error al cambiar contraseña.');
      }
    });
  }

  saveSmtp(): void {
    this.isSavingSmtp.set(true);
    const payload = {
      smtpEnabled: this.smtpEnabledControl.value,
      ...this.smtpForm.value,
    };

    this.http.patch(`${environment.apiUrl}/auth/profile`, payload).subscribe({
      next: () => {
        this.isSavingSmtp.set(false);
        this.snackBar.open('Configuración SMTP guardada', 'Cerrar', { duration: 2500 });
      },
      error: (err) => {
        this.isSavingSmtp.set(false);
        this.snackBar.open(err?.error?.message || 'Error al guardar SMTP', 'Cerrar', { duration: 4000 });
      }
    });
  }

  testSmtp(): void {
    this.testingSmtp.set(true);
    this.smtpTestResult.set(null);
    this.http.post<{ success: boolean; message: string; latencyMs?: number }>(
      `${environment.apiUrl}/auth/profile/test-smtp`, {}
    ).subscribe({
      next: (res) => {
        this.testingSmtp.set(false);
        this.smtpTestResult.set(res);
      },
      error: (err) => {
        this.testingSmtp.set(false);
        this.smtpTestResult.set({ success: false, message: err?.error?.message || 'Error al probar conexión SMTP' });
      },
    });
  }

  // Stepper controls
  hasNextStep(): boolean {
    const tab = this.activeTab();
    if (tab === 'profile') return true;
    if (tab === 'security') return true;
    if (tab === 'smtp') return true;
    return false;
  }

  navigateNext(): void {
    const tab = this.activeTab();
    if (tab === 'profile') {
      this.activeTab.set('security');
    } else if (tab === 'security') {
      if (this.isOwner()) {
        this.activeTab.set('smtp');
      } else {
        this.activeTab.set('danger');
      }
    } else if (tab === 'smtp') {
      this.activeTab.set('danger');
    }
  }

  navigatePrevious(): void {
    const tab = this.activeTab();
    if (tab === 'danger') {
      if (this.isOwner()) {
        this.activeTab.set('smtp');
      } else {
        this.activeTab.set('security');
      }
    } else if (tab === 'smtp') {
      this.activeTab.set('security');
    } else if (tab === 'security') {
      this.activeTab.set('profile');
    }
  }

  // Zona de peligro
  openDestructiveConfirmation(action: 'wipe' | 'delete'): void {
    this.confirmingAction.set(action);
    this.destructivePhrase = '';
    this.destructiveMfaCode = '';
    this.destructiveEmail = '';
    this.destructivePassword = '';
    this.destructiveError.set('');
    this.loadMfaStatus();
  }

  cancelDestructiveConfirmation(): void {
    this.confirmingAction.set(null);
    this.destructiveError.set('');
  }

  canExecuteDestructive(): boolean {
    if (this.destructivePhrase.trim() !== this.expectedPhrase()) {
      return false;
    }
    if (this.mfaEnabled()) {
      return this.destructiveMfaCode.trim().length >= 6;
    } else {
      return this.destructiveEmail.trim().length > 0 && this.destructivePassword.length >= 1;
    }
  }

  executeDestructiveAction(): void {
    if (!this.canExecuteDestructive()) return;
    this.isProcessingDestructive.set(true);
    this.destructiveError.set('');

    const credentials: any = {};
    if (this.mfaEnabled()) {
      credentials.mfaCode = this.destructiveMfaCode.trim();
    } else {
      credentials.email = this.destructiveEmail.trim();
      credentials.password = this.destructivePassword;
    }

    const action = this.confirmingAction();

    if (action === 'wipe') {
      this.http.post<{ success: boolean; message: string }>(
        `${environment.apiUrl}/auth/account/wipe-data`,
        credentials,
      ).subscribe({
        next: (res) => {
          this.isProcessingDestructive.set(false);
          this.confirmingAction.set(null);
          this.dialogRef.close();
          this.snackBar.open(res.message || 'Todos los datos comerciales fueron restablecidos', 'Cerrar', { duration: 3500 });
          setTimeout(() => {
            window.location.reload();
          }, 800);
        },
        error: (err) => {
          this.isProcessingDestructive.set(false);
          this.destructiveError.set(err?.error?.message || 'Error al restablecer los datos.');
        },
      });
    } else if (action === 'delete') {
      this.http.request<{ success: boolean; message: string }>(
        'delete',
        `${environment.apiUrl}/auth/account`,
        { body: credentials },
      ).subscribe({
        next: (res) => {
          this.isProcessingDestructive.set(false);
          this.confirmingAction.set(null);
          this.matDialog.closeAll();
          this.sessionMonitor.stop();
          this.authState.clearSession();
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('cached_my_empresas');
            localStorage.removeItem('cached_company_subscription');
          }
          if (typeof window !== 'undefined') {
            window.location.replace('/auth/sign-in?account=deleted');
          } else {
            this.router.navigate(['/auth/sign-in'], { queryParams: { account: 'deleted' } });
          }
        },
        error: (err) => {
          this.isProcessingDestructive.set(false);
          this.destructiveError.set(err?.error?.message || 'Error al eliminar la cuenta.');
        },
      });
    }
  }
}
