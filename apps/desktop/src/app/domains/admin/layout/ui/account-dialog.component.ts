import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { AuthState } from '@/app/core/auth/auth.state';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-account-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col w-full min-w-[340px] sm:min-w-[440px] max-h-[85vh] overflow-hidden bg-white dark:bg-neutral-900 rounded-3xl">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
        <div class="flex items-center gap-2">
          <mat-icon svgIcon="user-round" class="!w-5 !h-5 !text-[20px] text-blue-600 dark:text-blue-400"></mat-icon>
           <h2 class="text-xl font-bold text-neutral-900 dark:text-white">{{ 'account.title' | transloco }}</h2>
        </div>
        <button (click)="dialogRef.close()" class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
          <mat-icon svgIcon="x" class="!w-4 !h-4 !text-[16px]"></mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 flex flex-col gap-6 overflow-y-auto flex-1">
        
        <!-- Avatar / Photo Profile Section -->
        <div class="flex flex-col items-center justify-center gap-3">
          <div class="relative group">
            <div class="w-24 h-24 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-2xl flex items-center justify-center border-2 border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
              @if (avatarUrl()) {
                <img [src]="avatarUrl()" [alt]="'account.avatar' | transloco" class="w-full h-full object-cover select-none" />
              } @else {
                {{ initials() }}
              }
            </div>
            <label class="absolute bottom-0 right-0 w-8 h-8 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white border-2 border-white dark:border-neutral-900 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-all hover:scale-110" title="Actualizar foto">
              <mat-icon svgIcon="camera" class="!w-4 !h-4 !text-[16px]"></mat-icon>
              <input type="file" (change)="onFileSelected($event)" accept="image/*" class="hidden" />
            </label>
          </div>
          <div class="flex flex-col items-center text-center">
            <span class="text-base font-bold text-neutral-900 dark:text-white">{{ displayName() }}</span>
            <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ user()?.email }}</span>
          </div>
        </div>

        <!-- Account Info Badges -->
        <div class="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
          <div class="flex flex-col gap-1">
           <span class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{{ 'account.systemRole' | transloco }}</span>
            @if (isOwner()) {
              <span class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <mat-icon svgIcon="crown" class="!w-3.5 !h-3.5 !text-[14px] text-amber-500"></mat-icon>
                 {{ 'account.owner' | transloco }}
              </span>
            } @else {
              <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                 {{ roleName() || ('account.member' | transloco) }}
              </span>
            }
          </div>
          <div class="flex flex-col gap-1">
             <span class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{{ 'account.status' | transloco }}</span>
            <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
               {{ 'account.active' | transloco }}
            </span>
          </div>
        </div>

        <!-- Form fields -->
        <form [formGroup]="form" class="flex flex-col gap-4">
          <mat-form-field appearance="outline" class="w-full">
             <mat-label>{{ 'account.fullName' | transloco }}</mat-label>
             <input matInput formControlName="name" [placeholder]="'account.namePlaceholder' | transloco" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
             <mat-label>{{ 'auth.fields.email' | transloco }}</mat-label>
            <input matInput formControlName="email" type="email" [readonly]="true" class="opacity-75" />
            <mat-icon matSuffix svgIcon="lock" class="!w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
          </mat-form-field>

          <!-- SMTP Global para Propietarios -->
          @if (isOwner()) {
            <div class="mt-2 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="text-sm font-bold text-emerald-950 dark:text-emerald-200">Servidor de Correo (SMTP)</span>
                  <span class="text-xs text-neutral-500">Usado globalmente para enviar correos desde tus empresas</span>
                </div>
                <mat-slide-toggle formControlName="smtpEnabled" color="primary"></mat-slide-toggle>
              </div>

              @if (form.get('smtpEnabled')?.value) {
                <div class="flex flex-col gap-4 pt-2">
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
                  <div class="grid grid-cols-1 gap-4 items-center">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Dirección "De" (From)</mat-label>
                      <input matInput formControlName="smtpFrom" placeholder="Dolphin ERP &lt;no-reply@empresa.com&gt;">
                      <mat-hint>Si se omite, se usa el usuario SMTP</mat-hint>
                    </mat-form-field>
                    <div class="flex items-center gap-3 mt-1">
                      <mat-slide-toggle formControlName="smtpSecure" color="primary"></mat-slide-toggle>
                      <span class="text-sm text-neutral-600 dark:text-neutral-400">Conexión TLS/SSL</span>
                    </div>
                  </div>

                  <!-- Resultado del test TCP -->
                  @if (smtpTestResult()) {
                    <div [class]="'flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium ' + (smtpTestResult()!.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/30')">
                      <mat-icon [svgIcon]="smtpTestResult()!.success ? 'check-circle' : 'alert-triangle'" class="icon-size-4 shrink-0 mt-0.5"></mat-icon>
                      <div class="flex flex-col">
                        <span>{{ smtpTestResult()!.message }}</span>
                        @if (smtpTestResult()!.latencyMs) {
                          <span class="text-xs opacity-70">Latencia: {{ smtpTestResult()!.latencyMs }}ms</span>
                        }
                      </div>
                    </div>
                  }

                  <button type="button" (click)="testSmtp()" [disabled]="testingSmtp()" 
                    class="self-start flex items-center gap-2 h-9 px-4 rounded-xl border border-emerald-300 dark:border-emerald-700 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    <mat-icon [svgIcon]="testingSmtp() ? 'loader' : 'wifi'" class="icon-size-4" [class.animate-spin]="testingSmtp()"></mat-icon>
                    {{ testingSmtp() ? 'Probando...' : 'Probar conexión TCP' }}
                  </button>
                  <p class="text-xs text-neutral-400">Guarda tu perfil primero si has hecho cambios antes de probar la conexión.</p>
                </div>
              }
            </div>
          }

        </form>

      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900">
        <button (click)="dialogRef.close()" class="px-5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
           {{ 'common.close' | transloco }}
        </button>
        <button (click)="save()" [disabled]="form.invalid || isSaving()" class="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-xs flex items-center gap-2">
          @if (isSaving()) {
             <span>{{ 'common.saving' | transloco }}</span>
          } @else {
             <span>{{ 'account.save' | transloco }}</span>
          }
        </button>
      </div>
    </div>
  `,
})
export class AccountDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<AccountDialogComponent>);
  private authState = inject(AuthState);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  user = this.authState.user;
  avatarUrl = signal<string>(this.user()?.avatar || '');
  isOwner = signal<boolean>(false);
  roleName = signal<string>('');
  isSaving = signal<boolean>(false);

  form = this.fb.group({
    name: [this.user()?.name || '', [Validators.required]],
    email: [{ value: this.user()?.email || '', disabled: true }],

    smtpEnabled: [false],
    smtpHost: [''],
    smtpPort: [587],
    smtpUser: [''],
    smtpPass: [''],
    smtpFrom: [''],
    smtpSecure: [true],
  });

  testingSmtp = signal(false);
  smtpTestResult = signal<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  displayName = computed(() => {
    const u = this.user();
    if (!u) return '';
    return this.form.get('name')?.value || u.name || u.email.split('@')[0];
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
    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (userData) => {
        if (userData) {
          this.form.patchValue({
            smtpEnabled: userData.smtpEnabled || false,
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

  save() {
    if (this.form.invalid) return;
    this.isSaving.set(true);
    const updatedData: any = {
      name: this.form.value.name,
      avatar: this.avatarUrl(),
    };

    if (this.isOwner()) {
      updatedData.smtpEnabled = this.form.value.smtpEnabled;
      updatedData.smtpHost = this.form.value.smtpHost;
      updatedData.smtpPort = this.form.value.smtpPort;
      updatedData.smtpUser = this.form.value.smtpUser;
      updatedData.smtpPass = this.form.value.smtpPass;
      updatedData.smtpFrom = this.form.value.smtpFrom;
      updatedData.smtpSecure = this.form.value.smtpSecure;
    }

    this.http.patch(`${environment.apiUrl}/auth/profile`, updatedData).subscribe({
      next: () => {
        // Update local state and close
        if (this.user()) {
          const current = this.user()!;
          this.authState.setUser({
            ...current,
            name: updatedData.name || current.name,
            avatar: updatedData.avatar || current.avatar,
          });
        }
        this.isSaving.set(false);
        this.dialogRef.close(updatedData);
      },
      error: () => {
        this.isSaving.set(false);
      }
    });
  }

  testSmtp(): void {
    if (this.form.dirty) {
      this.smtpTestResult.set({ success: false, message: 'Guarda los cambios antes de probar la conexión.' });
      return;
    }

    this.testingSmtp.set(true);
    this.smtpTestResult.set(null);
    this.http.post<{ success: boolean; message: string; latencyMs?: number }>(
      `${environment.apiUrl}/auth/profile/test-smtp`, {}
    ).subscribe({
      next: (res) => { this.testingSmtp.set(false); this.smtpTestResult.set(res); },
      error: (err) => { this.testingSmtp.set(false); this.smtpTestResult.set({ success: false, message: err.error?.message || 'Error al probar conexión' }); },
    });
  }
}
