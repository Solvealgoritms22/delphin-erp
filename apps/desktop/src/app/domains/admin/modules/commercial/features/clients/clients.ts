import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClientsService } from '../../data/clients';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@/app/shared/components/table-skeleton/table-skeleton.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-clients',
  standalone: true,
   imports: [RouterLink, MatButtonModule, MatIconModule, EmptyStateComponent, TableSkeletonComponent, TranslocoPipe],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 overflow-hidden">
      
      <!-- Header -->
      <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
         <div>
            <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'commercial.clients.title' | transloco }}</div>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'commercial.clients.description' | transloco }}</p>
         </div>
        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
          <button mat-flat-button class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" [routerLink]="['new']">
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
            {{ 'commercial.clients.new' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main -->
      <div class="flex flex-col flex-auto min-h-0 overflow-y-auto">
        <div class="grid">
            <!-- Header -->
            <div class="clients-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <div>{{ 'common.document' | transloco }}</div>
              <div>{{ 'common.name' | transloco }}</div>
              <div class="hidden sm:block">{{ 'common.contact' | transloco }}</div>
              <div class="hidden sm:block">{{ 'common.status' | transloco }}</div>
              <div>{{ 'common.actions' | transloco }}</div>
            </div>
            
            <!-- Rows -->
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
                  <div>
                    <button mat-icon-button [routerLink]="[client.id]" class="text-neutral-500">
                       <mat-icon svgIcon="pencil" class="icon-size-5"></mat-icon>
                    </button>
                    <button mat-icon-button class="text-red-500" (click)="deleteClient(client.id)">
                      <mat-icon svgIcon="trash" class="icon-size-5"></mat-icon>
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
  router = inject(Router);
  transloco = inject(TranslocoService);

  cells5 = ['90%', '80%', '70%', '40%', '50%'];

  ngOnInit() {
    this.clientsService.findAll().subscribe();
  }

  deleteClient(id: string) {
    if (confirm(String(this.transloco.translate('commercial.clients.deleteConfirm')))) {
      this.clientsService.remove(id).subscribe();
    }
  }
}
