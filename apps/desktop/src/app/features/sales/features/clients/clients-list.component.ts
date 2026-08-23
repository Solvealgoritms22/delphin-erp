import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ClientsService } from '../../data/clients';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PlusIcon, PencilIcon, TrashIcon } from 'ng-animated-icons';

@Component({
  selector: 'app-clients',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [RouterLink, MatButtonModule, MatIconModule, MatDialogModule, EmptyStateComponent, TableSkeletonComponent, TranslocoPipe, PlusIcon, PencilIcon, TrashIcon],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">

      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
         <div>
            <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'commercial.clients.title' | transloco }}</div>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'commercial.clients.description' | transloco }}</p>
         </div>
        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
          <button mat-flat-button class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" [routerLink]="['new']">
            <i-plus [size]="18" class="mr-2" />
            {{ 'commercial.clients.new' | transloco }}
          </button>
        </div>
      </div>

      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">

            <div class="clients-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <div>{{ 'common.document' | transloco }}</div>
              <div>{{ 'common.name' | transloco }}</div>
              <div class="hidden sm:block">{{ 'common.contact' | transloco }}</div>
              <div class="hidden sm:block">{{ 'common.status' | transloco }}</div>
              <div>{{ 'common.actions' | transloco }}</div>
            </div>

            @if (clientsService.isLoading()) {
              <app-table-skeleton [gridClass]="'clients-grid'" [rows]="6" [cells]="cells5" />
            } @else if (clientsService.clients().length === 0) {
              <div class="flex flex-auto justify-center p-6 sm:p-10">
                <app-empty-state
                  type="no-data"
                  [title]="'commercial.clients.emptyTitle' | transloco"
                  [description]="'commercial.clients.emptyDescription' | transloco"
                  [actionLabel]="'commercial.clients.new' | transloco"
                  actionIcon="plus"
                  (action)="router.navigate(['admin', 'commercial', 'clients', 'new'])"
                />
              </div>
            } @else {
              @for (client of clientsService.clients(); track client.id) {
                <div class="clients-grid grid items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800">
                  <div class="text-sm font-medium">{{ client.tipoDocumento }} - {{ client.numeroDocumento }}</div>
                  <div class="font-medium text-neutral-900 dark:text-white truncate">{{ client.nombreRazonSocial }}</div>
                  <div class="hidden sm:block text-sm text-neutral-500">
                    <div>{{ client.email || '-' }}</div>
                    <div>{{ client.telefono || '-' }}</div>
                  </div>
                  <div class="hidden sm:block">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          [class.bg-emerald-100]="client.estado === 'ACTIVO'"
                          [class.text-emerald-800]="client.estado === 'ACTIVO'"
                          [class.dark:bg-emerald-500]="client.estado === 'ACTIVO'"
                          [class.dark:bg-opacity-10]="client.estado === 'ACTIVO'"
                          [class.dark:text-emerald-400]="client.estado === 'ACTIVO'"
                          [class.bg-red-100]="client.estado !== 'ACTIVO'"
                          [class.text-red-800]="client.estado !== 'ACTIVO'">
                      {{ client.estado }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button mat-icon-button [routerLink]="[client.id]" class="text-neutral-500 hover:text-neutral-700">
                       <i-pencil [size]="18" />
                    </button>
                    <button mat-icon-button class="text-red-500 hover:text-red-700" (click)="deleteClient(client)">
                      <i-trash [size]="18" />
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>
  `,
  styles: [`
    .clients-grid {
      grid-template-columns: 140px auto 180px 100px 96px;
    }
    @media (max-width: 640px) {
      .clients-grid {
        grid-template-columns: 120px auto 96px;
      }
    }
  `]
})
export class Clients implements OnInit {
  clientsService = inject(ClientsService);
  dialog = inject(MatDialog);
  router = inject(Router);
  transloco = inject(TranslocoService);

  cells5 = ['90%', '80%', '70%', '40%', '50%'];

  ngOnInit() {
    this.clientsService.findAll().subscribe();
  }

  deleteClient(client: any) {
    const name = client?.nombreRazonSocial || '';
    const message = name
      ? `¿Estás seguro de que deseas eliminar al cliente <strong>${name}</strong>?`
      : String(this.transloco.translate('commercial.clients.deleteConfirm'));

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('commercial.clients.deleteTitle') || 'Eliminar cliente',
        message,
        confirmLabel: this.transloco.translate('common.delete'),
        cancelLabel: this.transloco.translate('common.cancel'),
        destructive: true,
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.clientsService.remove(client.id || client).subscribe();
      }
    });
  }
}
