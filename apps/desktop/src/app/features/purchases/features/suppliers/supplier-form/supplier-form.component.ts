import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { SuppliersService } from '../../../data/suppliers';
import { TranslocoPipe } from '@jsverse/transloco';
import { CountryFlagComponent } from '@/app/shared/components/country-flag/country-flag.component';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSelectModule, TranslocoPipe,
    CountryFlagComponent,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-y-auto overflow-x-hidden pb-12">

      <div class="flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between p-6 sm:pb-8 sm:pt-10 border-b bg-card dark:bg-transparent">
        <div class="flex-1 min-w-0">
          <div class="flex items-center cursor-pointer mb-2" (click)="goBack()">
            <mat-icon svgIcon="arrow-left" class="icon-size-5 mr-2 text-secondary"></mat-icon>
            <span class="text-sm font-medium text-secondary">{{ 'commercial.suppliers.back' | transloco }}</span>
          </div>
          <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight leading-7 sm:leading-10 truncate">
             {{ (isEdit ? 'commercial.suppliers.edit' : 'commercial.suppliers.new') | transloco }}
          </h2>
        </div>
      </div>

      <form [formGroup]="form" class="flex w-full flex-col md:flex-row flex-auto p-6 sm:p-10 gap-6">

        <div class="flex flex-col w-full md:w-2/3 gap-6">

          <div class="flex flex-col bg-card rounded-2xl shadow-sm border p-6 sm:p-8">
             <h2 class="text-lg font-bold mb-6">{{ 'common.basicInformation' | transloco }}</h2>

            <mat-form-field class="w-full mb-4">
               <mat-label>{{ 'commercial.form.name' | transloco }}</mat-label>
               <input matInput formControlName="nombreRazonSocial" [placeholder]="'commercial.form.namePlaceholder' | transloco" />
            </mat-form-field>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <mat-form-field class="w-full">
               <mat-label>{{ 'commercial.form.documentType' | transloco }}</mat-label>
                <mat-select formControlName="tipoDocumento">
                  <mat-option value="RNC">RNC</mat-option>
                  <mat-option value="RUT">RUT</mat-option>
                  <mat-option value="DNI">DNI</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field class="w-full">
               <mat-label>{{ 'commercial.form.documentNumber' | transloco }}</mat-label>
                <input matInput formControlName="numeroDocumento" placeholder="12345678-9" />
              </mat-form-field>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <mat-form-field class="w-full">
                <mat-label>{{ 'commercial.form.country' | transloco }}</mat-label>
                <mat-select formControlName="pais">
                  @for (country of countries; track country.code) {
                    <mat-option [value]="country.code" [disabled]="country.disabled">
                      <span class="inline-flex items-center gap-2">
                        <country-flag [code]="country.code" [width]="20" />
                        {{ country.label }}{{ country.disabled ? ' (próximamente)' : '' }}
                      </span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

           <mat-form-field class="w-full">
                <mat-label>{{ 'commercial.form.address' | transloco }}</mat-label>
              <textarea matInput formControlName="direccion" rows="3" placeholder="Full address..."></textarea>
            </mat-form-field>
          </div>

          <div class="flex flex-col bg-card rounded-2xl shadow-sm border p-6 sm:p-8">
            <h2 class="text-lg font-bold mb-1">{{ 'commercial.form.logo' | transloco }}</h2>
            <p class="mb-4 text-xs text-neutral-500">PNG, JPG o WEBP · máximo 2 MB</p>
            <label class="group flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-neutral-700 dark:bg-neutral-800/40 dark:hover:border-blue-600 dark:hover:bg-blue-900/10">
              @if (logoPreview) {
                <div class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm dark:bg-neutral-900"><img [src]="logoPreview" alt="Logo" class="h-full w-full object-contain p-2"></div>
                <span class="mt-3 text-xs font-semibold text-blue-600">Cambiar logo</span>
              } @else {
                <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-neutral-400 shadow-sm dark:bg-neutral-900 dark:text-neutral-500"><mat-icon svgIcon="image" class="!h-10 !w-10 !text-[40px]"></mat-icon></div>
                <span class="mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">{{ 'commercial.form.uploadLogo' | transloco }}</span>
                <span class="mt-1 text-xs text-neutral-500">Haz clic para seleccionar una imagen</span>
              }
              <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onLogoSelected($event)" class="hidden">
            </label>
          </div>

        </div>

        <div class="flex flex-col w-full md:w-1/3 gap-6">

           <div class="flex flex-col bg-card rounded-2xl shadow-sm border p-6 sm:p-8">
             <h2 class="text-lg font-bold mb-6">{{ 'common.contact' | transloco }}</h2>

            <mat-form-field class="w-full mb-4">
               <mat-label>{{ 'auth.fields.email' | transloco }}</mat-label>
               <mat-icon matPrefix svgIcon="mail" class="mr-2 text-secondary"></mat-icon>
              <input matInput type="email" formControlName="email" placeholder="contact@example.com" />
            </mat-form-field>

             <div class="flex items-end gap-2">
               <mat-form-field class="w-32 shrink-0">
                 <mat-label>{{ 'commercial.form.code' | transloco }}</mat-label>
                 <mat-select formControlName="phoneCode">
                   @for (code of phoneCodes; track code) {
                     <mat-option [value]="code">{{ code }}</mat-option>
                   }
                 </mat-select>
               </mat-form-field>
               <mat-form-field class="min-w-0 flex-auto">
                 <mat-label>{{ 'commercial.form.phone' | transloco }}</mat-label>
                 <mat-icon matPrefix svgIcon="phone" class="mr-2 text-secondary"></mat-icon>
                 <input matInput formControlName="phoneNumber" [placeholder]="phonePlaceholder()" />
               </mat-form-field>
             </div>
           </div>

           <div class="flex flex-col bg-card rounded-2xl shadow-sm border p-6 sm:p-8">
             <h2 class="text-lg font-bold mb-6">{{ 'common.settings' | transloco }}</h2>

            <mat-form-field class="w-full">
               <mat-label>{{ 'common.status' | transloco }}</mat-label>
              <mat-select formControlName="estado">
                 <mat-option value="ACTIVO">{{ 'common.active' | transloco }}</mat-option>
                 <mat-option value="INACTIVO">{{ 'common.inactive' | transloco }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

        </div>

      </form>

      <div class="fixed bottom-0 bg-white dark:bg-gray-800 left-0 sm:left-64 right-0 z-50 flex items-center justify-end px-8 py-4 bg-card border-t">
        <button mat-button type="button" (click)="goBack()">
           {{ 'common.discard' | transloco }}
        </button>
        <button mat-flat-button [color]="'primary'" type="button" class="ml-4" (click)="submit()" [disabled]="form.invalid">
           {{ (isEdit ? 'common.saveChanges' : 'commercial.suppliers.create') | transloco }}
        </button>
      </div>

    </div>
  `
})
export class SupplierForm implements OnInit {
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);
  suppliersService = inject(SuppliersService);

  isEdit = false;
  supplierId: string | null = null;
  form!: FormGroup;

  ngOnInit() {
    this.supplierId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.supplierId && this.supplierId !== 'new';

    this.form = this.fb.group({
      tipoDocumento: ['RNC', Validators.required],
      numeroDocumento: ['', Validators.required],
      nombreRazonSocial: ['', Validators.required],
      email: [''],
       telefono: [''],
       phoneCode: ['+1 809'],
       phoneNumber: [''],
      direccion: [''],
      estado: ['ACTIVO']
      , pais: ['DO'],
      logo: ['']
    });
    this.form.get('pais')?.valueChanges.subscribe((country) => this.applyCountry(country || 'DO'));

    if (this.isEdit && this.supplierId) {
      this.suppliersService.findOne(this.supplierId).subscribe(data => {
      const parsedPhone = this.splitPhone(data.telefono || '');
      this.form.patchValue({ ...data, phoneCode: parsedPhone.code, phoneNumber: parsedPhone.number }, { emitEvent: false });
        this.logoPreview = data.logo || '';
      });
    }
  }

  countries = [
    { code: 'DO', label: 'República Dominicana', disabled: false },
    { code: 'US', label: 'Estados Unidos', disabled: true },
    { code: 'ES', label: 'España', disabled: true },
  ];
  logoPreview = '';

  phoneCodes = ['+1 809', '+1 829', '+1 849'];

  phonePlaceholder(): string { return this.form?.get('pais')?.value === 'DO' ? '555 0000' : '+1 555 000 0000'; }

  applyCountry(country: string): void {
    const documentType = country === 'US' ? 'EIN' : country === 'ES' ? 'NIF' : 'RNC';
    this.phoneCodes = country === 'ES' ? ['+34'] : country === 'US' ? ['+1'] : ['+1 809', '+1 829', '+1 849'];
    this.form.patchValue({
      tipoDocumento: documentType,
      phoneCode: this.phoneCodes.includes(this.form.get('phoneCode')?.value) ? this.form.get('phoneCode')?.value : this.phoneCodes[0],
    }, { emitEvent: false });
  }

  splitPhone(phone: string): { code: string; number: string } {
    const code = this.phoneCodes.find((item) => phone.startsWith(item)) || this.phoneCodes[0];
    return { code, number: phone.startsWith(code) ? phone.slice(code.length).trim() : phone };
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
      this.form.patchValue({ logo: this.logoPreview });
    };
    reader.readAsDataURL(file);
  }

  goBack() {
    this.router.navigate(['/admin/commercial/suppliers']);
  }

  submit() {
    if (this.form.invalid) return;
    const value = { ...this.form.value, telefono: `${this.form.value.phoneCode} ${this.form.value.phoneNumber || ''}`.trim() };
    delete value.phoneCode;
    delete value.phoneNumber;
    if (this.isEdit) {
      this.suppliersService.update(this.supplierId!, value).subscribe(() => this.goBack());
    } else {
      this.suppliersService.create(value).subscribe(() => this.goBack());
    }
  }
}
