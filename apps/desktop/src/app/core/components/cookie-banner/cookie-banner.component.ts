import { Component, signal, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, MatButtonModule, RouterLink],
  template: `
    @if (showBanner()) {
      <div class="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 md:p-8 pointer-events-none flex justify-center">
        <div class="pointer-events-auto bg-neutral-900 text-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-4xl w-full flex flex-col sm:flex-row items-center sm:items-start gap-6 border border-neutral-700/50 backdrop-blur-xl bg-opacity-95 dark:bg-opacity-95">
          
          <!-- Cookie Icon -->
          <div class="hidden sm:flex shrink-0 w-12 h-12 bg-neutral-800 rounded-full items-center justify-center text-2xl">
            🍪
          </div>

          <!-- Text -->
          <div class="flex-1 text-center sm:text-left">
            <h3 class="text-lg font-bold mb-2 text-white">Valoramos tu privacidad</h3>
            <p class="text-sm text-neutral-300 leading-relaxed">
              Utilizamos cookies esenciales para el funcionamiento seguro de nuestra plataforma (incluyendo el procesamiento de pagos mediante Bóvedas de Datos de terceros), y cookies analíticas para mejorar tu experiencia. 
              Puedes leer más sobre cómo utilizamos las cookies en nuestra 
              <a routerLink="/legal/cookies" class="text-blue-400 hover:text-blue-300 underline font-medium">Política de Cookies</a>.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <button mat-button class="text-neutral-300 hover:bg-neutral-800 w-full sm:w-auto px-6 py-2 rounded-full font-medium" (click)="decline()">
              Solo esenciales
            </button>
            <button mat-flat-button class="bg-blue-600 hover:bg-blue-500 text-white w-full sm:w-auto px-8 py-2 rounded-full font-semibold shadow-lg shadow-blue-900/20" (click)="accept()">
              Aceptar todas
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class CookieBannerComponent implements OnInit {
  showBanner = signal<boolean>(false);
  private storageKey = 'Dolphin ERP_cookie_consent';
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit() {
    if (!this.isBrowser) return;
    const consent = localStorage.getItem(this.storageKey);
    if (!consent) {
      // Small delay for smooth entrance
      setTimeout(() => this.showBanner.set(true), 1000);
    }
  }

  accept() {
    localStorage.setItem(this.storageKey, 'accepted_all');
    this.showBanner.set(false);
  }

  decline() {
    localStorage.setItem(this.storageKey, 'essential_only');
    this.showBanner.set(false);
  }
}
