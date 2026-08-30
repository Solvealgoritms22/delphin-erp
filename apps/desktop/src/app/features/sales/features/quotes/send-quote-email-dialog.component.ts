import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Cotizacion, QuotesService, SmtpStatusResponse } from '../../data/quotes.service';

@Component({
  selector: 'app-send-quote-email-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  template: `
    <div class="flex flex-col max-h-[90vh] w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <mat-icon svgIcon="mail" class="icon-size-5"></mat-icon>
          </div>
          <div>
            <h2 class="text-base font-bold text-neutral-900 dark:text-white">
              Enviar Cotización por Correo
            </h2>
            <p class="text-xs text-neutral-500">
              Cotización {{ quote.numeroCotizacion }} · RD$ {{ quote.total | number: '1.2-2' }}
            </p>
          </div>
        </div>

        <button
          type="button"
          (click)="close()"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 transition-colors cursor-pointer"
        >
          <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-auto overflow-y-auto p-6 space-y-5">
        <!-- SMTP Status Indicator Card -->
        @if (loadingSmtp()) {
          <div class="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse text-xs text-neutral-500">
            Verificando configuración del servidor de correo...
          </div>
        } @else if (smtpStatus()?.smtpConfigured) {
          <div class="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs">
            <div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <mat-icon svgIcon="check" class="icon-size-4"></mat-icon>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-emerald-900 dark:text-emerald-300">
                Servidor SMTP Configurado y Activo
              </div>
              <div class="text-emerald-700 dark:text-emerald-400 truncate">
                Host: {{ smtpStatus()?.smtpHost }} (Remitente: {{ smtpStatus()?.smtpFrom }})
              </div>
            </div>
          </div>
        } @else {
          <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs space-y-2">
            <div class="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
              <mat-icon svgIcon="alert-triangle" class="icon-size-4 text-amber-600 dark:text-amber-400"></mat-icon>
              <span>Servidor SMTP no configurado</span>
            </div>
            <p class="text-amber-800 dark:text-amber-400">
              Tu empresa no tiene configurado un servidor de correo saliente. Configura tus credenciales SMTP para enviar cotizaciones a tus clientes.
            </p>
            <div>
              <button
                type="button"
                (click)="goToSmtpSettings()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                <mat-icon svgIcon="sliders-horizontal" class="icon-size-3.5"></mat-icon>
                <span>Configurar SMTP en Mi Cuenta</span>
              </button>
            </div>
          </div>
        }

        <!-- Recipient Email Field -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Correo Electrónico del Destinatario <span class="text-rose-500">*</span>
          </label>
          <div class="relative">
            <mat-icon svgIcon="mail" class="icon-size-4 absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"></mat-icon>
            <input
              type="email"
              [(ngModel)]="recipientEmail"
              placeholder="ejemplo@cliente.com"
              class="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          @if (quote.cliente; as cli) {
            @if (!cli.email) {
              <p class="text-[11px] text-amber-600 dark:text-amber-400">
                ℹ️ Este cliente no tiene correo registrado en su perfil.
              </p>
              @if (quote.clienteId) {
                <div class="pt-1">
                  <mat-checkbox [(ngModel)]="saveEmailToClient" color="primary">
                    <span class="text-xs text-neutral-600 dark:text-neutral-300">
                      Guardar este correo permanentemente en la ficha del cliente
                    </span>
                  </mat-checkbox>
                </div>
              }
            } @else {
              <p class="text-[11px] text-neutral-400">
                Tomado del perfil de: {{ cli.nombreRazonSocial }}
              </p>
            }
          } @else {
            <p class="text-[11px] text-neutral-400">
              Consumidor Final (ingresa el correo para enviar)
            </p>
          }
        </div>

        <!-- Custom Subject -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Asunto del Mensaje
          </label>
          <input
            type="text"
            [(ngModel)]="customSubject"
            placeholder="Asunto del correo"
            class="w-full px-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500"
          />
        </div>

        <!-- Custom Message -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
            Mensaje Personalizado (Opcional)
          </label>
          <textarea
            [(ngModel)]="customMessage"
            rows="3"
            placeholder="Escribe un mensaje de saludo o aclaratoria adicional para tu cliente..."
            class="w-full px-3 py-2 text-xs font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <button
          type="button"
          (click)="close()"
          [disabled]="sending()"
          class="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          (click)="sendEmail()"
          [disabled]="sending() || !recipientEmail || !smtpStatus()?.smtpConfigured"
          class="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          @if (sending()) {
            <mat-icon svgIcon="refresh" class="icon-size-4 animate-spin"></mat-icon>
            <span>Enviando...</span>
          } @else {
            <mat-icon svgIcon="send" class="icon-size-4"></mat-icon>
            <span>Enviar Cotización</span>
          }
        </button>
      </div>
    </div>
  `,
})
export class SendQuoteEmailDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<SendQuoteEmailDialogComponent>);
  data = inject<{ quote: Cotizacion }>(MAT_DIALOG_DATA);
  quotesService = inject(QuotesService);
  snackBar = inject(MatSnackBar);
  router = inject(Router);

  quote: Cotizacion = this.data.quote;

  smtpStatus = signal<SmtpStatusResponse | null>(null);
  loadingSmtp = signal<boolean>(true);
  sending = signal<boolean>(false);

  recipientEmail = this.quote.cliente?.email || '';
  customSubject = `Cotización ${this.quote.numeroCotizacion}`;
  customMessage = '';
  saveEmailToClient = false;

  ngOnInit(): void {
    this.quotesService.getSmtpStatus().subscribe({
      next: (res) => {
        this.smtpStatus.set(res);
        this.loadingSmtp.set(false);
      },
      error: () => {
        this.loadingSmtp.set(false);
      },
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }

  goToSmtpSettings(): void {
    this.close();
    this.router.navigate(['/admin/settings/my-account']);
  }

  sendEmail(): void {
    if (!this.recipientEmail || !this.recipientEmail.includes('@')) {
      this.snackBar.open('Ingresa un correo electrónico válido.', 'Cerrar', { duration: 3500 });
      return;
    }

    if (!this.smtpStatus()?.smtpConfigured) {
      this.snackBar.open('Configura tu servidor SMTP antes de enviar correos.', 'Cerrar', { duration: 4000 });
      return;
    }

    this.sending.set(true);

    this.quotesService
      .sendQuoteEmail(this.quote.id, {
        recipientEmail: this.recipientEmail.trim(),
        customSubject: this.customSubject?.trim() || undefined,
        customMessage: this.customMessage?.trim() || undefined,
        saveEmailToClient: this.saveEmailToClient,
      })
      .subscribe({
        next: (res) => {
          this.sending.set(false);
          this.snackBar.open(res.message || 'Cotización enviada exitosamente por correo.', 'Cerrar', {
            duration: 4000,
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.sending.set(false);
          const errorMsg =
            err.error?.message ||
            'Error al enviar la cotización por correo. Verifica tu conexión SMTP.';
          this.snackBar.open(errorMsg, 'Cerrar', { duration: 5000 });
        },
      });
  }
}
