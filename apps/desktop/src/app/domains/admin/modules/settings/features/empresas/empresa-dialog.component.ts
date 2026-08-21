import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import {
  BriefcaseIcon,
  UploadIcon,
  TrashIcon,
  RefreshCwIcon,
} from 'ng-animated-icons';

import { CountryFlagComponent } from '@/app/shared/components/country-flag/country-flag.component';

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
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    TranslocoPipe,
    BriefcaseIcon,
    UploadIcon,
    TrashIcon,
    RefreshCwIcon,
    CountryFlagComponent,
  ],
  template: `
    <h2
      mat-dialog-title
      class="flex items-center gap-2"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"
      >
        <i-briefcase [size]="20" />
      </div>
      <span class="text-xl font-bold">{{
        (data ? 'companies.edit' : 'companies.new') | transloco
      }}</span>
    </h2>

    <mat-dialog-content class="!max-h-[75vh]">
      <form
        [formGroup]="form"
        class="mt-4 flex flex-col gap-4"
      >

        <div
          class="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
        >
          <div
            class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-blue-600 shadow-sm dark:bg-neutral-900 dark:text-blue-400"
          >
            <img
              *ngIf="logoPreview()"
              [src]="logoPreview()"
              [alt]="'companies.logoAlt' | transloco"
              class="h-full w-full object-contain p-2"
            />
            <i-briefcase
              *ngIf="!logoPreview()"
              [size]="32"
            />
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <span
              class="text-sm font-semibold text-neutral-800 dark:text-neutral-200"
              >{{ 'companies.logo' | transloco }}</span
            >
            <span class="text-xs text-neutral-500 dark:text-neutral-400">{{
              'companies.logoHint' | transloco
            }}</span>
            <div class="flex items-center gap-2">
              <label
                class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
              >
                <i-upload [size]="16" />
                {{ 'companies.uploadLogo' | transloco }}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  (change)="onLogoSelected($event)"
                  class="hidden"
                />
              </label>
              <button
                *ngIf="logoPreview()"
                type="button"
                mat-stroked-button
                class="!rounded-lg !text-xs"
                (click)="removeLogo()"
              >
                <i-trash
                  [size]="16"
                  class="mr-1 text-red-500"
                />
                {{ 'companies.removeLogo' | transloco }}
              </button>
            </div>
            <span
              *ngIf="logoError()"
              class="text-xs font-medium text-red-600 dark:text-red-400"
              >{{ logoError() }}</span
            >
          </div>
        </div>

        <mat-form-field
          appearance="outline"
          class="w-full"
        >
          <mat-label>{{ 'companies.legalName' | transloco }}</mat-label>
          <input
            matInput
            formControlName="razonSocial"
            [placeholder]="'companies.legalNamePlaceholder' | transloco"
            required
          />
          <mat-error *ngIf="form.get('razonSocial')?.hasError('required')">
            {{ 'companies.legalNameRequired' | transloco }}
          </mat-error>
        </mat-form-field>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <mat-form-field
            appearance="outline"
            class="w-full"
          >
            <mat-label
              >{{ 'companies.taxId' | transloco }} (RNC / Cédula)</mat-label
            >
            <input
              matInput
              formControlName="rnc"
              placeholder="130204394"
            />
          </mat-form-field>

          <mat-form-field
            appearance="outline"
            class="w-full"
          >
            <mat-label>País</mat-label>
            <mat-select formControlName="pais">
              @for (c of countries; track c.code) {
                <mat-option
                  [value]="c.code"
                  [disabled]="c.disabled"
                >
                  <span class="inline-flex items-center gap-2">
                    <country-flag
                      [code]="c.code"
                      [width]="20"
                    />
                    <span>{{ c.label }}</span>
                    @if (c.disabled) {
                      <span
                        class="text-xs text-neutral-400 dark:text-neutral-500"
                        >(próximamente)</span
                      >
                    }
                  </span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field
          appearance="outline"
          class="w-full"
        >
          <mat-label>Dirección</mat-label>
          <input
            matInput
            formControlName="direccion"
            placeholder="Av. Principal #123, Ensanche Naco, Santo Domingo"
          />
        </mat-form-field>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <mat-form-field
            appearance="outline"
            class="w-full"
          >
            <mat-label>{{ 'companies.phone' | transloco }}</mat-label>
            <input
              matInput
              formControlName="telefono"
              placeholder="+1 809 555 5555"
            />
          </mat-form-field>

          <mat-form-field
            appearance="outline"
            class="w-full"
          >
            <mat-label>{{ 'companies.email' | transloco }}</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              placeholder="contacto@empresa.com"
            />
            <mat-error *ngIf="form.get('email')?.hasError('email')">
              {{ 'companies.emailInvalid' | transloco }}
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field
          appearance="outline"
          class="w-full"
        >
          <mat-label>Página Web</mat-label>
          <input
            matInput
            formControlName="paginaWeb"
            placeholder="https://www.empresa.com"
          />
        </mat-form-field>

        <mat-form-field
          appearance="outline"
          class="w-full"
        >
          <mat-label>Descripción</mat-label>
          <textarea
            matInput
            formControlName="descripcion"
            rows="2"
            placeholder="Breve descripción del negocio o actividad económica..."
          ></textarea>
        </mat-form-field>

        <div
          class="mt-4 flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/50 dark:bg-blue-950/20 mb-2"
        >
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-sm font-bold text-blue-950 dark:text-blue-200"
                >Facturación Electrónica FiscalBridge (e-CF DGII)</span
              >
              <span class="text-xs text-neutral-500"
                >Transmisión automática de facturas a la DGII conforme a la Ley
                32-23</span
              >
            </div>
            <mat-slide-toggle
              formControlName="fiscalbridgeEnabled"
              color="primary"
            ></mat-slide-toggle>
          </div>

          <div
            *ngIf="form.get('fiscalbridgeEnabled')?.value"
            class="flex flex-col gap-4 pt-2"
          >
            <mat-form-field
              appearance="outline"
              class="w-full"
            >
              <mat-label>URL de API FiscalBridge</mat-label>
              <input
                matInput
                formControlName="fiscalbridgeUrl"
                placeholder="https://api.fiscalbridge.com/v1"
              />
            </mat-form-field>

            <mat-form-field
              appearance="outline"
              class="w-full"
              *ngIf="data?.id"
            >
              <mat-label>URL del webhook para FiscalBridge</mat-label>
              <input
                matInput
                [value]="webhookUrl()"
                readonly
              />
              <mat-hint
                >Copia esta URL en FiscalBridge → Configuración →
                Webhooks.</mat-hint
              >
            </mat-form-field>

            <mat-form-field
              appearance="outline"
              class="w-full"
              *ngIf="data?.id"
            >
              <mat-label>Secreto de firma del webhook</mat-label>
              <input
                matInput
                type="password"
                formControlName="fiscalbridgeWebhookSecret"
                placeholder="whsec_..."
              />
              <mat-hint
                >Se usa para validar la firma HMAC y evitar webhooks
                falsificados.</mat-hint
              >
            </mat-form-field>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>Método de Autenticación</mat-label>
                <mat-select formControlName="fiscalbridgeAuthMethod">
                  <mat-option value="TOKEN"
                    >API Token (Recomendado 365 días)</mat-option
                  >
                  <mat-option value="EMAIL">Correo y Contraseña</mat-option>
                  <mat-option value="OAUTH2">OAuth 2.0</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>Entorno DGII</mat-label>
                <mat-select formControlName="fiscalbridgeEnv">
                  <mat-option value="TEST">TEST (Sandbox / Pruebas)</mat-option>
                  <mat-option value="CERT"
                    >CERT (Certificación DGII)</mat-option
                  >
                  <mat-option value="PROD"
                    >PROD (Producción en Vivo)</mat-option
                  >
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field
              appearance="outline"
              class="w-full"
              *ngIf="form.get('fiscalbridgeAuthMethod')?.value === 'TOKEN'"
            >
              <mat-label>API Token de FiscalBridge</mat-label>
              <input
                matInput
                type="password"
                formControlName="fiscalbridgeToken"
                placeholder="fb_token_live_..."
              />
            </mat-form-field>

            <div
              *ngIf="form.get('fiscalbridgeAuthMethod')?.value === 'EMAIL'"
              class="flex flex-col gap-4"
            >
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <mat-form-field
                  appearance="outline"
                  class="w-full"
                >
                  <mat-label>Correo FiscalBridge</mat-label>
                  <input
                    matInput
                    type="email"
                    formControlName="fiscalbridgeEmail"
                    placeholder="usuario@empresa.com"
                  />
                </mat-form-field>
                <mat-form-field
                  appearance="outline"
                  class="w-full"
                >
                  <mat-label>Contraseña</mat-label>
                  <input
                    matInput
                    type="password"
                    formControlName="fiscalbridgePassword"
                    placeholder="••••••••"
                  />
                </mat-form-field>
              </div>
              <mat-form-field
                appearance="outline"
                class="w-full"
              >
                <mat-label>Client ID</mat-label>
                <input
                  matInput
                  formControlName="fiscalbridgeClientId"
                  placeholder="client_xxxxxxxx"
                />
                <mat-hint
                  >Identifica el entorno/tenant de tu cuenta en
                  FiscalBridge.</mat-hint
                >
              </mat-form-field>
            </div>

            <div
              *ngIf="form.get('fiscalbridgeAuthMethod')?.value === 'OAUTH2'"
              class="flex flex-col gap-4"
            >
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <mat-form-field
                  appearance="outline"
                  class="w-full"
                >
                  <mat-label>Client ID</mat-label>
                  <input
                    matInput
                    formControlName="fiscalbridgeClientId"
                    placeholder="client_xxxxxxxx"
                  />
                  <mat-error
                    *ngIf="
                      form.get('fiscalbridgeClientId')?.hasError('required')
                    "
                    >El Client ID es requerido para OAuth 2.0</mat-error
                  >
                </mat-form-field>
                <mat-form-field
                  appearance="outline"
                  class="w-full"
                >
                  <mat-label>Client Secret</mat-label>
                  <input
                    matInput
                    type="password"
                    formControlName="fiscalbridgeClientSecret"
                    placeholder="secret_xxxxxxxx"
                  />
                  <mat-error
                    *ngIf="
                      form.get('fiscalbridgeClientSecret')?.hasError('required')
                    "
                    >El Client Secret es requerido para OAuth 2.0</mat-error
                  >
                </mat-form-field>
              </div>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                <mat-icon
                  svgIcon="info"
                  class="icon-size-3.5 mr-1 align-text-bottom text-blue-500"
                ></mat-icon>
                FiscalBridge utiliza estos datos para obtener un
                <strong>access_token</strong> vía
                <code class="text-blue-600">/auth/token</code> (OAuth 2.0 Client
                Credentials).
              </p>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions
      align="end"
      class="border-t border-neutral-100 p-6 dark:border-neutral-800"
    >
      <button
        mat-button
        mat-dialog-close
      >
        {{ 'common.cancel' | transloco }}
      </button>
      <button
        mat-flat-button
        class="ml-2 rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700"
        (click)="save()"
        [disabled]="form.invalid || isSaving"
      >
        <span *ngIf="!isSaving">{{
          (data ? 'common.saveChanges' : 'companies.create') | transloco
        }}</span>
        <span
          *ngIf="isSaving"
          class="flex items-center gap-2"
        >
          <i-refresh-cw
            [size]="16"
            class="animate-spin"
          />
          {{ 'common.saving' | transloco }}
        </span>
      </button>
    </mat-dialog-actions>
  `,
})
export class EmpresaDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<EmpresaDialogComponent>);
  public data = inject(MAT_DIALOG_DATA, { optional: true });
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  form: FormGroup;
  isSaving = false;

  countries = [
    { code: 'DO', label: 'República Dominicana', disabled: false },
    { code: 'US', label: 'Estados Unidos', disabled: true },
    { code: 'ES', label: 'España', disabled: true },
    { code: 'MX', label: 'México', disabled: true },
    { code: 'CO', label: 'Colombia', disabled: true },
    { code: 'PA', label: 'Panamá', disabled: true },
    { code: 'CR', label: 'Costa Rica', disabled: true },
    { code: 'GT', label: 'Guatemala', disabled: true },
    { code: 'PE', label: 'Perú', disabled: true },
    { code: 'CL', label: 'Chile', disabled: true },
    { code: 'AR', label: 'Argentina', disabled: true },
  ];

  constructor() {
    this.form = this.fb.group({
      razonSocial: ['', Validators.required],
      rnc: [''],
      pais: ['DO'],
      direccion: [''],
      telefono: [''],
      email: ['', Validators.email],
      paginaWeb: [''],
      descripcion: [''],
      logo: [''],
      fiscalbridgeEnabled: [false],
      fiscalbridgeUrl: ['https://api.fiscalbridge.com/v1'],
      fiscalbridgeAuthMethod: ['TOKEN'],
      fiscalbridgeToken: [''],
      fiscalbridgeEmail: [''],
      fiscalbridgePassword: [''],
      fiscalbridgeClientId: [''],
      fiscalbridgeClientSecret: [''],
      fiscalbridgeWebhookSecret: [this.data?.fiscalbridgeWebhookSecret || ''],
      fiscalbridgeEnv: [this.data?.fiscalbridgeEnv || 'TEST'],
    });
  }

  webhookUrl(): string {
    return this.data?.id
      ? `${environment.apiUrl}/fiscalbridge/webhook/${this.data.id}`
      : '';
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
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.logoError.set('');

    if (file.size > 2 * 1024 * 1024) {
      this.logoError.set('La imagen debe ser menor a 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.logoPreview.set(base64);
      this.form.patchValue({ logo: base64 });
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.logoPreview.set('');
    this.form.patchValue({ logo: '' });
  }

  save() {
    if (this.form.invalid) return;
    this.isSaving = true;
    const value = this.form.value;

    if (this.data && this.data.id) {
      this.http
        .patch(`${environment.apiUrl}/empresas/${this.data.id}`, value)
        .subscribe({
          next: (res) => {
            this.isSaving = false;
            this.dialogRef.close(res);
          },
          error: (err) => {
            this.isSaving = false;
            this.snackBar.open(
              err.error?.message || 'Error al actualizar empresa',
              'Cerrar',
              { duration: 3000 }
            );
          },
        });
    } else {
      this.http.post(`${environment.apiUrl}/empresas`, value).subscribe({
        next: (res) => {
          this.isSaving = false;
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open(
            err.error?.message || 'Error al crear empresa',
            'Cerrar',
            { duration: 3000 }
          );
        },
      });
    }
  }
}
