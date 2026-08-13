import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { AuthService } from '@/app/core/auth/auth.service';
import { AuthState } from '@/app/core/auth/auth.state';
import { EmpresaDialogComponent } from './empresa-dialog.component';
import { ConfirmDialogComponent } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { environment } from '@/environments/environment';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

export interface Empresa {
  id: string;
  razonSocial: string;
  rnc: string;
  estado: string;
  logo?: string | null;
}

@Component({
  selector: 'app-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatMenuModule, EmptyStateComponent, TranslocoPipe],
  template: `
    <div class="flex flex-col flex-auto min-w-0 bg-white dark:bg-neutral-900 relative">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between p-6 sm:py-8 sm:px-10 border-b bg-neutral-50/50 dark:bg-transparent">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl font-extrabold tracking-tight leading-7 sm:leading-10 truncate">
             {{ 'companies.title' | transloco }}
          </h2>
          <p class="mt-2 text-neutral-500">
             {{ 'companies.description' | transloco }}
          </p>
        </div>
        
        <!-- Actions -->
        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4 gap-3">
          <button mat-flat-button class="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6" (click)="openCreateDialog()">
            <mat-icon svgIcon="plus" class="mr-2 icon-size-5"></mat-icon>
             <span class="font-medium text-[13px]">{{ 'companies.new' | transloco }}</span>
          </button>
        </div>
      </div>

      <!-- Main container -->
      <div class="flex-auto p-6 sm:p-10">
        
        <!-- Loading state -->
        <div *ngIf="isLoading()" class="flex items-center justify-center h-64">
          <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>

        <!-- Content -->
        <div *ngIf="!isLoading()">
          
          <!-- Empty state -->
          <div *ngIf="empresas().length === 0">
            <app-empty-state
              icon="briefcase"
               [title]="'companies.emptyTitle' | transloco"
               [description]="'companies.emptyDescription' | transloco"
               [actionLabel]="'companies.createFirst' | transloco"
              (action)="openCreateDialog()">
            </app-empty-state>
          </div>

          <div *ngIf="empresas().length > 0" class="flex flex-col gap-10">
            
            <!-- Empresa Activa -->
            <div *ngIf="activeEmpresa" class="flex flex-col gap-4">
               <h3 class="text-xl font-bold">{{ 'companies.active' | transloco }}</h3>
              
              <div class="flex flex-col sm:flex-row bg-white dark:bg-neutral-800 rounded-2xl shadow-md border-2 border-blue-500 dark:border-blue-400 overflow-hidden relative">
                
                <div class="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                   {{ 'companies.current' | transloco }}
                </div>

                <div class="flex items-center justify-center p-8 bg-blue-50 dark:bg-blue-900/10">
                   <div class="flex items-center justify-center w-24 h-24 rounded-2xl bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm overflow-hidden">
                     <img *ngIf="activeEmpresa.logo" [src]="activeEmpresa.logo" [alt]="activeEmpresa.razonSocial" class="w-full h-full object-contain p-3">
                     <mat-icon *ngIf="!activeEmpresa.logo" svgIcon="briefcase" class="icon-size-12"></mat-icon>
                  </div>
                </div>

                <div class="flex flex-col justify-center p-6 flex-1">
                  <h3 class="text-2xl font-bold">{{ activeEmpresa.razonSocial }}</h3>
                  <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-2 text-neutral-500">
                    <span class="flex items-center gap-1"><mat-icon svgIcon="hash" class="icon-size-4"></mat-icon> RNC: {{ activeEmpresa.rnc || 'N/A' }}</span>
                  </div>
                </div>

                <div class="flex items-center p-6 bg-neutral-50 dark:bg-neutral-900/50 border-l border-neutral-100 dark:border-neutral-800">
                  <div class="flex flex-col gap-2 w-full">
                    <button mat-stroked-button (click)="openEditDialog(activeEmpresa)">
                     <mat-icon svgIcon="pencil" class="icon-size-5 mr-2"></mat-icon>
                       {{ 'common.edit' | transloco }}
                    </button>
                    <!-- No delete button for active company to prevent edge cases, user must switch first to delete -->
                  </div>
                </div>
              </div>
            </div>

            <!-- Otras Empresas -->
            <div *ngIf="otherEmpresas.length > 0" class="flex flex-col gap-4">
               <h3 class="text-xl font-bold">{{ 'companies.other' | transloco }}</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div *ngFor="let empresa of otherEmpresas" class="flex flex-col bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-md transition-shadow duration-200">
                  
                  <!-- Card Header -->
                  <div class="flex items-start justify-between p-6 pb-4">
                    <div class="flex items-center gap-4">
                       <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 overflow-hidden">
                         <img *ngIf="empresa.logo" [src]="empresa.logo" [alt]="empresa.razonSocial" class="w-full h-full object-contain p-1">
                         <mat-icon *ngIf="!empresa.logo" svgIcon="briefcase" class="icon-size-6"></mat-icon>
                      </div>
                      <div>
                        <h3 class="text-lg font-semibold leading-tight line-clamp-1">{{ empresa.razonSocial }}</h3>
                        <p class="text-sm text-neutral-500 mt-0.5">RNC: {{ empresa.rnc || 'N/A' }}</p>
                      </div>
                    </div>
                    
                    <button mat-icon-button [matMenuTriggerFor]="menu">
                       <mat-icon svgIcon="ellipsis-vertical"></mat-icon>
                    </button>
                    <mat-menu #menu="matMenu">
                      <button mat-menu-item (click)="openEditDialog(empresa)">
                         <mat-icon svgIcon="pencil"></mat-icon>
                         <span>{{ 'companies.editInfo' | transloco }}</span>
                      </button>
                      <button mat-menu-item class="text-red-600" (click)="deleteEmpresa(empresa)">
                        <mat-icon svgIcon="trash" class="text-red-600"></mat-icon>
                         <span>{{ 'companies.delete' | transloco }}</span>
                      </button>
                    </mat-menu>

                  </div>

                  <!-- Card Body -->
                  <div class="flex flex-col flex-auto p-6 pt-2">

                    <div class="flex items-center justify-between">
                       <span class="text-sm font-medium text-neutral-500">{{ 'common.status' | transloco }}</span>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        [ngClass]="{
                          'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400': empresa.estado === 'ACTIVA',
                          'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400': empresa.estado !== 'ACTIVA'
                        }">
                        {{ empresa.estado }}
                      </span>
                    </div>
                  </div>

                  <!-- Card Footer -->
                  <div class="flex items-center p-4 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800">
                    <button mat-button class="w-full text-blue-600" (click)="switchTenant(empresa.id)">
                       {{ 'companies.switch' | transloco }}
                    </button>
                  </div>

                </div>
              </div>
            </div>

          </div>
          
        </div>
      </div>
    </div>
  `
})
export class EmpresasComponent implements OnInit {
  private authService = inject(AuthService);
  private authState = inject(AuthState);
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);
  private transloco = inject(TranslocoService);
  
  empresas = signal<Empresa[]>([]);
  isLoading = signal<boolean>(true);
  currentEmpresaId = signal<string>('');

  get activeEmpresa() {
    return this.empresas().find(e => e.id === this.currentEmpresaId());
  }

  get otherEmpresas() {
    return this.empresas().filter(e => e.id !== this.currentEmpresaId());
  }

  ngOnInit() {
    this.currentEmpresaId.set(this.authState.user()?.empresaId || '');
    this.loadEmpresas();
  }

  loadEmpresas() {
    this.isLoading.set(true);
    this.authService.getMyEmpresas().subscribe({
      next: (data) => {
        this.empresas.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  switchTenant(id: string) {
    this.authService.switchTenant(id).subscribe({
      next: () => {
        window.location.reload();
      }
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(EmpresaDialogComponent, {
      width: '500px',
      panelClass: 'dolphin-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadEmpresas();
      }
    });
  }

  openEditDialog(empresa: Empresa) {
    const dialogRef = this.dialog.open(EmpresaDialogComponent, {
      width: '500px',
      panelClass: 'dolphin-dialog',
      data: empresa
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadEmpresas();
        if (empresa.id === this.currentEmpresaId()) {
          // Si editamos la actual, idealmente actualizamos el usuario en el storage para que se refleje globalmente si aplica,
          // pero como AuthState jala el nombre desde el token (switchTenant hace refresh de esto).
          // Recargando la vista por ahora es mas seguro.
          window.location.reload();
        }
      }
    });
  }

  deleteEmpresa(empresa: Empresa) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'dolphin-dialog',
      data: {
        title: this.transloco.translate('companies.deleteTitle'),
        message: this.transloco.translate('companies.deleteMessage', { name: empresa.razonSocial }),
        confirmLabel: this.transloco.translate('common.delete'),
        destructive: true,
        requireMatchString: empresa.razonSocial,
        matchPlaceholder: this.transloco.translate('companies.matchPlaceholder', { name: empresa.razonSocial })
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading.set(true);
        this.http.delete(`${environment.apiUrl}/empresas/${empresa.id}`).subscribe({
          next: () => {
            this.loadEmpresas();
          },
          error: () => {
            this.isLoading.set(false);
          }
        });
      }
    });
  }
}
