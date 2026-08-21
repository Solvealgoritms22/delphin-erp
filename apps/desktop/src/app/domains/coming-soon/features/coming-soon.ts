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
          class="relative hidden flex-auto items-center justify-center overflow-hidden rounded-r-xl border-l border-neutral-200/10 bg-neutral-950 p-8 sm:p-16 md:flex"
        >
          <div
            class="absolute inset-0 pointer-events-none opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
            style="background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px); background-size: 24px 24px;">
          </div>

          <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-blue-600/[0.07] blur-[100px] pointer-events-none"></div>

          <div class="relative z-10 flex flex-col items-center justify-center text-center max-w-lg w-full px-8 py-12 rounded-2xl border border-white/[0.07] bg-white/[0.015] backdrop-blur-xs select-none shadow-2xl">
            <div class="flex items-center justify-center gap-4 sm:gap-5 mb-8">
              <img
                src="/images/logo/logo_dolphin_dark.png"
                alt="Dolphin logo"
                class="h-14 sm:h-16 w-auto object-contain transition-transform duration-300 hover:scale-105 shrink-0"
              />
              <div class="flex flex-col items-start text-left justify-center">
                <span class="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase leading-none font-sans">
                  DOLPHIN
                </span>
                <span class="text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase mt-2 leading-none">
                  SISTEMA DE RECURSOS EMPRESARIALES
                </span>
              </div>
            </div>

            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Tu operación, en un solo lugar
            </h2>

            <p class="mt-3 text-sm text-neutral-400 max-w-sm leading-relaxed">
              Dolphin ERP conecta la gestión de tus empresas, usuarios, catálogos y controles de seguridad en una experiencia clara y centralizada.
            </p>

            <div class="mt-8 grid grid-cols-3 gap-4 w-full max-w-sm pt-6 border-t border-white/[0.08]">
              <div class="flex flex-col items-center">
                <span class="text-base font-semibold text-white tracking-tight">100%</span>
                <span class="text-[11px] text-neutral-400 mt-0.5">En la nube</span>
              </div>
              <div class="flex flex-col items-center border-x border-white/[0.08]">
                <span class="text-base font-semibold text-white tracking-tight">DGII / e-CF</span>
                <span class="text-[11px] text-neutral-400 mt-0.5">Facturación</span>
              </div>
              <div class="flex flex-col items-center">
                <span class="text-base font-semibold text-white tracking-tight">Multi-Empresa</span>
                <span class="text-[11px] text-neutral-400 mt-0.5">Centralizado</span>
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
