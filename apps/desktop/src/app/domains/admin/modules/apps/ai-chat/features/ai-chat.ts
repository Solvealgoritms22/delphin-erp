import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { MatTooltip } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Media } from '@/app/core/media';
import { AiChatService } from '@/app/domains/admin/modules/apps/ai-chat/data/ai-chat';
import { ConfirmDialogComponent } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'ai-chat',
  imports: [
    FormsModule,
    CdkTextareaAutosize,
    MatIcon,
    MatIconButton,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatTooltip,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  host: {
    class: 'lg:h-full block h-full',
  },
  template: `
    <div
      class="@container flex h-full w-full flex-auto flex-col overflow-hidden bg-white dark:bg-neutral-900"
    >
      <mat-sidenav-container
        class="h-full flex-auto [&_.mat-drawer-backdrop]:fixed"
        (backdropClick)="panelOpened.set(false)"
      >
        <!-- Conversations panel -->
        <mat-sidenav
          class="w-72 border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
          [mode]="isMobile() ? 'over' : 'side'"
          [opened]="!isMobile() || panelOpened()"
          [position]="'start'"
          [fixedInViewport]="isMobile()"
          disableClose
        >
          <div class="flex h-full w-full flex-col">
            <!-- Panel header -->
            <div class="flex items-center gap-x-2 py-4 pr-3 pl-4">
              <div class="flex items-center gap-2 flex-auto text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                <mat-icon svgIcon="sparkles" class="text-blue-600 dark:text-blue-400 size-5" />
                <span>AI ERP Agent</span>
              </div>
              <button
                class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                matIconButton
                matTooltip="Nueva conversación"
                (click)="createNewChat()"
              >
                <mat-icon svgIcon="square-pen" />
              </button>
            </div>

            <!-- Search -->
            <div class="px-3 pb-2">
              <div class="relative flex items-center">
                <mat-icon svgIcon="search" class="absolute left-3 size-4 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  placeholder="Buscar conversaciones..."
                  class="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- Conversations list -->
            <div class="mt-2 flex-auto overflow-y-auto px-2 pb-4">
              @for (group of filteredGroups(); track group.label) {
                <div
                  class="px-2 pt-3 pb-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider"
                >
                  {{ group.label }}
                </div>

                <div class="flex flex-col gap-y-1">
                  @for (
                    conversation of group.conversations;
                    track conversation.id
                  ) {
                    <div
                      class="group relative flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors cursor-pointer"
                      [class.bg-blue-50]="rla.isActive"
                      [class.dark:bg-blue-900/30]="rla.isActive"
                      [class.text-blue-700]="rla.isActive"
                      [class.dark:text-blue-400]="rla.isActive"
                      [class.hover:bg-neutral-100]="!rla.isActive"
                      [class.dark:hover:bg-neutral-800]="!rla.isActive"
                    >
                      <a
                        class="flex flex-1 items-center min-w-0 pr-2 select-none"
                        routerLinkActive="active"
                        [routerLink]="['/admin/ai-chat', conversation.id]"
                        (click)="selectConversation(conversation.id)"
                        #rla="routerLinkActive"
                      >
                        <mat-icon svgIcon="message-square" class="size-4 mr-2 shrink-0 opacity-60" />
                        <span class="truncate text-xs font-medium">
                          {{ conversation.title }}
                        </span>
                      </a>

                      <!-- Delete button on hover -->
                      <button
                        type="button"
                        class="opacity-0 group-hover:opacity-100 size-6 flex items-center justify-center rounded text-neutral-400 hover:text-red-600 transition-opacity"
                        title="Eliminar chat"
                        (click)="$event.stopPropagation(); deleteChat(conversation.id)"
                      >
                        <mat-icon svgIcon="trash-2" class="size-3.5" />
                      </button>
                    </div>
                  }
                </div>
              }

              @if (filteredGroups().length === 0) {
                <div class="py-8 text-center text-xs text-neutral-400">
                  No hay conversaciones coincidentes
                </div>
              }
            </div>
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="flex flex-auto flex-col overflow-hidden bg-white dark:bg-neutral-900">
          <router-outlet
            (activate)="hasConversation.set(true)"
            (deactivate)="hasConversation.set(false)"
          ></router-outlet>

          <!-- Empty state when no conversation is selected -->
          @if (!hasConversation()) {
            <div class="flex items-center gap-x-2 px-4 py-4 lg:hidden">
              <button
                class="text-neutral-500"
                matIconButton
                matTooltip="Conversaciones"
                (click)="panelOpened.set(true)"
              >
                <mat-icon svgIcon="menu" />
              </button>
            </div>

            <div
              class="flex flex-auto flex-col items-center justify-center px-6 py-8 lg:px-8 overflow-y-auto"
            >
              <div class="w-full max-w-3xl">
                <div class="flex flex-col items-center text-center">
                  <div class="size-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                    <mat-icon
                      class="size-6"
                      svgIcon="sparkles"
                    />
                  </div>
                  <div
                    class="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl"
                  >
                    ¿En qué puedo ayudarte hoy?
                  </div>
                  <div class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    Consulta cualquier información de tu ERP en tiempo real (solo lectura).
                  </div>
                </div>

                <!-- Suggestions -->
                <div class="mt-8 grid grid-cols-1 gap-3 @xl:grid-cols-2">
                  @for (suggestion of suggestions; track suggestion.title) {
                    <button
                      class="flex cursor-pointer flex-col gap-y-1 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-all hover:border-blue-300 dark:hover:border-blue-700 shadow-xs"
                      type="button"
                      (click)="sendQuickSuggestion(suggestion.query)"
                    >
                      <div class="flex items-center gap-x-2">
                        <mat-icon
                          class="size-4 shrink-0 text-blue-600 dark:text-blue-400"
                          [svgIcon]="suggestion.icon"
                        />
                        <span class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                          {{ suggestion.title }}
                        </span>
                      </div>
                      <div class="text-xs text-neutral-500 dark:text-neutral-400">
                        {{ suggestion.description }}
                      </div>
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Initial Composer in Empty State -->
            <div class="px-6 pb-6 lg:px-8">
              <div class="mx-auto w-full max-w-3xl">
                <div
                  class="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white p-3 shadow-xs dark:bg-neutral-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
                >
                  <textarea
                    [(ngModel)]="emptyPrompt"
                    (keydown.enter)="onEnterEmpty($event)"
                    class="w-full resize-none border-0 bg-transparent px-2 py-1 outline-none text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
                    placeholder="Haz una pregunta sobre productos, clientes, métricas, logs..."
                    cdkTextareaAutosize
                    [cdkAutosizeMinRows]="1"
                    cdkAutosizeMaxRows="6"
                  ></textarea>

                  <div class="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700/60 mt-1">
                    <span class="text-[11px] text-neutral-400">
                      💡 Presiona <kbd class="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 font-mono text-[10px]">Enter</kbd> para consultar
                    </span>

                    <button
                      class="flex items-center justify-center size-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                      [disabled]="!emptyPrompt.trim()"
                      (click)="sendEmptyPrompt()"
                      type="button"
                    >
                      <mat-icon svgIcon="send" class="size-4" />
                    </button>
                  </div>
                </div>

                <div class="mt-2 text-center text-xs text-neutral-400">
                  Dolphin ERP AI Agent • Consultas protegidas y aisladas por empresa.
                </div>
              </div>
            </div>
          }
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
})
export default class AiChat {
  private aiChatService = inject(AiChatService);
  private media = inject(Media);
  private router = inject(Router);

  protected searchQuery = '';
  protected emptyPrompt = '';

  protected isMobile = computed(() =>
    this.media.match(`(max-width: 1023px)`)()
  );

  protected suggestions = [
    {
      icon: 'bar-chart-3',
      title: 'Resumen Ejecutivo de la Empresa',
      description: 'Estado general, métricas clave, suscripción y distribución.',
      query: 'Dame un resumen ejecutivo general de la empresa activa',
    },
    {
      icon: 'package',
      title: 'Catálogo de Productos y Precios',
      description: 'Consultar productos registrados, categorías y costos.',
      query: 'Muéstrame la lista de productos del catálogo con sus precios',
    },
    {
      icon: 'users',
      title: 'Directorio de Clientes',
      description: 'Ver clientes registrados, correos y números de documento.',
      query: '¿Qué clientes tenemos registrados en la base de datos?',
    },
    {
      icon: 'shield-alert',
      title: 'Auditoría y Registro de Actividades',
      description: 'Últimos eventos del sistema, cambios y accesos recientes.',
      query: 'Cuáles son las últimas actividades de seguridad y auditoría registradas',
    },
  ];

  protected groups = computed(() => {
    const conversations = [...this.aiChatService.conversations()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (conversations.length === 0) return [];

    const now = new Date().getTime();
    const isToday = (d: string) => {
      const diff = now - new Date(d).getTime();
      return diff < 24 * 60 * 60 * 1000;
    };
    const isYesterday = (d: string) => {
      const diff = now - new Date(d).getTime();
      return diff >= 24 * 60 * 60 * 1000 && diff < 48 * 60 * 60 * 1000;
    };

    const todayGroup = { label: 'Hoy', conversations: [] as typeof conversations };
    const yesterdayGroup = { label: 'Ayer', conversations: [] as typeof conversations };
    const previousGroup = { label: 'Anteriores', conversations: [] as typeof conversations };

    for (const c of conversations) {
      if (isToday(c.createdAt)) todayGroup.conversations.push(c);
      else if (isYesterday(c.createdAt)) yesterdayGroup.conversations.push(c);
      else previousGroup.conversations.push(c);
    }

    return [todayGroup, yesterdayGroup, previousGroup].filter((g) => g.conversations.length > 0);
  });

  protected filteredGroups = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    const groups = this.groups();
    if (!q) return groups;

    return groups
      .map((g) => ({
        label: g.label,
        conversations: g.conversations.filter((c) =>
          c.title.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.conversations.length > 0);
  });

  protected hasConversation = signal(false);
  panelOpened = signal(false);

  createNewChat() {
    const newConv = this.aiChatService.createConversation();
    this.selectConversation(newConv.id);
    this.router.navigate(['/admin/ai-chat', newConv.id]);
  }

  selectConversation(id: string) {
    this.aiChatService.selectConversation(id);
    if (this.isMobile()) {
      this.panelOpened.set(false);
    }
  }

  private dialog = inject(MatDialog);

  deleteChat(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: 'Eliminar conversación',
        message: '¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
        destructive: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.aiChatService.deleteConversation(id);
        const active = this.aiChatService.currentConversation();
        if (active) {
          this.router.navigate(['/admin/ai-chat', active.id]);
        } else {
          this.router.navigate(['/admin/ai-chat']);
        }
      }
    });
  }

  sendQuickSuggestion(query: string) {
    const newConv = this.aiChatService.createConversation(query.slice(0, 30) + '...');
    this.router.navigate(['/admin/ai-chat', newConv.id]).then(() => {
      this.aiChatService.sendMessage(newConv.id, query).subscribe();
    });
  }

  onEnterEmpty(e: Event) {
    const keyboardEvent = e as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendEmptyPrompt();
    }
  }

  sendEmptyPrompt() {
    const text = this.emptyPrompt.trim();
    if (!text) return;
    this.emptyPrompt = '';
    const newConv = this.aiChatService.createConversation(text.slice(0, 30) + '...');
    this.router.navigate(['/admin/ai-chat', newConv.id]).then(() => {
      this.aiChatService.sendMessage(newConv.id, text).subscribe();
    });
  }
}
