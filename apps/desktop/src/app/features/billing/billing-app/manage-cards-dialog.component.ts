import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentCardsService, PaymentCard } from './payment-cards.service';
import { CardDialogComponent } from './card-dialog.component';

@Component({
  selector: 'app-manage-cards-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="flex flex-col w-full min-w-[360px] md:min-w-[480px]">
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <h2 class="text-xl font-bold text-neutral-900 dark:text-white">Gestionar tarjetas</h2>
        <button mat-icon-button (click)="dialogRef.close()" class="text-neutral-500 hover:text-neutral-700">
          <mat-icon svgIcon="x" class="icon-size-5"></mat-icon>
        </button>
      </div>

      <div class="flex flex-col p-6 overflow-y-auto max-h-[60vh]">
        @if (cards().length === 0) {
          <div class="flex flex-col items-center justify-center py-8">
            <img src="illustrations/credit_card_illustration.svg" alt="No hay tarjetas" class="w-32 h-auto mb-4" />
            <p class="text-neutral-500 font-medium">No hay tarjetas guardadas.</p>
          </div>
        } @else {
          <div class="flex flex-col gap-3">
            @for (card of cards(); track card.id) {
              <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div class="flex items-center gap-4">
                  <div class="flex items-center justify-center w-12 h-8 rounded bg-neutral-100 dark:bg-neutral-800">
                    <img *ngIf="card.marca === 'Visa'" src="brand-logos/visa.svg" class="w-8 h-auto" alt="Visa" />
                    <div *ngIf="card.marca === 'Mastercard'" class="flex items-center justify-center">
                      <div class="w-4 h-4 rounded-full bg-[#EB001B] opacity-90 mix-blend-multiply dark:mix-blend-normal"></div>
                      <div class="w-4 h-4 rounded-full bg-[#F79E1B] opacity-90 mix-blend-multiply dark:mix-blend-normal -ml-1.5"></div>
                    </div>
                    <mat-icon *ngIf="card.marca !== 'Visa' && card.marca !== 'Mastercard'" svgIcon="credit-card" class="!w-5 !h-5 !text-[20px]"></mat-icon>
                  </div>
                  <div class="flex flex-col">
                    <p class="text-sm font-medium text-neutral-900 dark:text-white">{{ card.nombre }}</p>
                    <p class="text-xs text-neutral-500">{{ card.marca }} • {{ card.numeroEnmascarado }} • Exp. {{ card.expiracion }}</p>
                  </div>
                </div>
                <button (click)="editCard(card)" mat-stroked-button class="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                  Editar
                </button>
              </div>
            }
          </div>
        }
      </div>

      <div class="flex items-center justify-end px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
        <button mat-flat-button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full px-6" (click)="dialogRef.close()">Hecho</button>
      </div>
    </div>
  `
})
export class ManageCardsDialogComponent {
  dialogRef = inject(MatDialogRef<ManageCardsDialogComponent>);
  private dialog = inject(MatDialog);
  private cardsService = inject(PaymentCardsService);
  private snackBar = inject(MatSnackBar);

  cards = this.cardsService.cards;

  editCard(card: PaymentCard) {
    this.dialog.open(CardDialogComponent, {
      width: '100%',
      maxWidth: '28rem',
      panelClass: 'dialog-panel-no-padding',
      data: card
    }).afterClosed().subscribe(result => {
      if (result) {
        this.cardsService.update(card.id, result);
        this.snackBar.open('Tarjeta actualizada', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
