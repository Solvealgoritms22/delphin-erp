import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'coming-soon',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FormField,
    MatCard,
  ],
  template: `
    <div class="flex flex-auto items-center justify-center p-4 sm:p-12">
      <mat-card class="flex flex-row">
        <div class="flex w-full max-w-md flex-col p-8 sm:p-12">

          <img
            class="w-12"
            src="/images/logo/logo.svg"
            alt="Dolphin logo"
          />

          <div
            class="leading-tight mt-8 text-4xl font-extrabold tracking-tight"
          >
            Almost there!
          </div>
          <div class="mt-0.5 font-medium">
            Do you want to be notified when we are ready? Register below so we
            can notify you about the launch!
          </div>

          @if (isRegistered()) {
            <div
              class="mt-8 rounded-lg bg-green-200 p-4 text-green-700 dark:bg-green-800 dark:text-green-50"
            >
              Thank you for registering! We will notify you when we launch.
            </div>
          }

          <form
            class="mt-8"
            (submit)="register($event)"
          >

            <mat-form-field class="w-full">
              <mat-label>Email address</mat-label>
              <input
                id="email"
                matInput
                [formField]="comingSoonForm.email"
              />
              <mat-error>
                @if (
                  comingSoonForm.email().touched() &&
                  comingSoonForm.email().invalid()
                ) {
                  @for (error of comingSoonForm.email().errors(); track error) {
                    {{ error.message }}
                  }
                }
              </mat-error>
            </mat-form-field>

            <button
              type="submit"
              matButton="filled"
              class="mt-6 w-full"
              [disabledInteractive]="isLoading()"
            >
              @if (isLoading()) {
                <mat-progress-spinner
                  class="[--mat-progress-spinner-active-indicator-color:var(--color-white)]"
                  mode="indeterminate"
                  [diameter]="24"
                />
              } @else {
                Notify me when you launch
              }
            </button>

            <div class="mt-8 text-sm text-neutral-500">
              This isn't a newsletter subscription. We will send one email to
              you when we launch and then you will be removed from the list.
            </div>
          </form>
        </div>

        <div
          class="relative hidden flex-auto items-center justify-center overflow-hidden rounded-r-xl border-l border-neutral-200/10 bg-slate-950 p-8 sm:p-16 md:flex"
        >
          <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

          <div class="absolute inset-0 bg-[linear-gradient(to_right,#33415518_1px,transparent_1px),linear-gradient(to_bottom,#33415518_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

          <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <div class="w-[360px] h-[360px] rounded-full border border-blue-500/30"></div>
            <div class="absolute w-[540px] h-[540px] rounded-full border border-blue-400/20"></div>
            <div class="absolute w-[720px] h-[720px] rounded-full border border-cyan-400/10"></div>
          </div>

          <div class="relative z-10 flex flex-col items-center justify-center text-center max-w-xl px-6 select-none">
            <div class="flex items-center justify-center gap-4 sm:gap-5 mb-8">
              <img
                src="/images/logo/logo_dolphin_dark.png"
                alt="Dolphin ERP"
                class="h-16 sm:h-20 w-auto object-contain transition-transform duration-300 hover:scale-105 shrink-0"
              />
              <div class="flex flex-col items-start text-left justify-center">
                <span class="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase leading-none font-sans">
                  DOLPHIN
                </span>
                <span class="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase mt-2 leading-none">
                  SISTEMA DE RECURSOS EMPRESARIALES
                </span>
              </div>
            </div>

            <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Tu operación, en un solo lugar
            </h2>

            <p class="mt-3 text-sm sm:text-base text-neutral-400 max-w-md leading-relaxed">
              Dolphin ERP conecta la gestión de tus empresas, usuarios, catálogos y controles de seguridad en una experiencia clara y centralizada.
            </p>

            <div class="mt-10 grid grid-cols-3 gap-4 w-full max-w-md pt-8 border-t border-white/10">
              <div class="flex flex-col items-center">
                <span class="text-lg font-bold text-white tracking-tight">100%</span>
                <span class="text-[11px] text-neutral-400">En la nube</span>
              </div>
              <div class="flex flex-col items-center border-x border-white/10">
                <span class="text-lg font-bold text-white tracking-tight">DGII / e-CF</span>
                <span class="text-[11px] text-neutral-400">Facturación</span>
              </div>
              <div class="flex flex-col items-center">
                <span class="text-lg font-bold text-white tracking-tight">Multi-Empresa</span>
                <span class="text-[11px] text-neutral-400">Centralizado</span>
              </div>
            </div>
          </div>
        </div>
      </mat-card>
    </div>
  `,
})
export default class ComingSoon {

  protected isRegistered = signal(false);
  protected isLoading = signal(false);

  protected comingSoonFormModel = signal({
    email: '',
  });
  protected comingSoonForm = form(this.comingSoonFormModel, (form) => {
    required(form.email, { message: 'Email address is required' });
    email(form.email, { message: 'Please enter a valid email address' });
  });

  register(event: Event) {
    event.preventDefault();

    this.isRegistered.set(false);
    this.isLoading.set(true);

    setTimeout(() => {

      this.isRegistered.set(true);

      this.comingSoonForm().reset({ email: '' });

      this.isLoading.set(false);
    }, 1500);
  }
}
