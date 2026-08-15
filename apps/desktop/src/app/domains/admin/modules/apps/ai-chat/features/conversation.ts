import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import {
  Component,
  computed,
  inject,
  input,
  signal,
  ElementRef,
  viewChild,
  effect,
  DestroyRef,
  ChangeDetectionStrategy,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { AiChatService } from '@/app/domains/admin/modules/apps/ai-chat/data/ai-chat';
import AiChat from '@/app/domains/admin/modules/apps/ai-chat/features/ai-chat';
import { MarkdownRendererComponent } from '@/app/shared/components/markdown-renderer/markdown-renderer.component';

@Component({
  selector: 'conversation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    CdkTextareaAutosize,
    MatDivider,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatTooltip,
    MarkdownRendererComponent,
  ],
  host: {
    class: 'flex flex-auto flex-col overflow-hidden h-full',
  },
  template: `
    @let conv = currentConversation();

    @if (conv) {
      <!-- Header -->
      <div class="flex items-center gap-x-2 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 lg:px-6 bg-white dark:bg-neutral-900 shrink-0">
        <button
          class="text-neutral-500 lg:hidden"
          matIconButton
          matTooltip="Conversaciones"
          (click)="aiChat.panelOpened.set(true)"
        >
          <mat-icon svgIcon="menu" />
        </button>

        <div class="flex items-center gap-2 min-w-0 flex-auto">
          @if (isEditingTitle()) {
            <input
              type="text"
              [(ngModel)]="editTitleText"
              (keydown.enter)="saveTitle()"
              (blur)="saveTitle()"
              class="px-2 py-1 text-sm font-semibold rounded border border-blue-400 bg-transparent text-neutral-900 dark:text-white outline-none"
              autofocus
            />
          } @else {
            <div class="truncate font-semibold text-sm text-neutral-900 dark:text-white">
              {{ conv.title }}
            </div>
            <button
              type="button"
              class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 size-6 flex items-center justify-center rounded cursor-pointer"
              (click)="startEditTitle(conv.title)"
              title="Renombrar conversación"
            >
              <mat-icon svgIcon="pencil" class="size-3.5" />
            </button>
          }
        </div>

        <button
          class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          matIconButton
          [matMenuTriggerFor]="conversationMenu"
        >
          <mat-icon svgIcon="ellipsis" />
        </button>

        <mat-menu xPosition="before" #conversationMenu="matMenu">
          <button mat-menu-item (click)="startEditTitle(conv.title)">
            <mat-icon svgIcon="pencil" />
            <span>Renombrar</span>
          </button>
          <mat-divider />
          <button mat-menu-item class="text-red-600" (click)="deleteThisConversation()">
            <mat-icon svgIcon="trash-2" class="text-red-600" />
            <span>Eliminar conversación</span>
          </button>
        </mat-menu>
      </div>

      <!-- Messages Feed -->
      <div #scrollContainer class="flex-auto overflow-y-auto px-4 py-6 lg:px-8 space-y-6">
        <div class="mx-auto flex w-full max-w-4xl flex-col gap-y-6">
          @for (message of conv.messages; track message.id) {
            @if (message.role === 'user') {
              <!-- User Message -->
              <div class="flex justify-end">
                <div class="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-blue-600 text-white px-4 py-3 shadow-xs">
                  <div class="text-sm whitespace-pre-wrap leading-relaxed">
                    {{ getMessageText(message.content) }}
                  </div>
                </div>
              </div>
            } @else {
              <!-- Assistant Message -->
              <div class="flex items-start gap-3 w-full">
                <!-- AI Avatar -->
                <div class="size-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 shadow-xs">
                  <mat-icon svgIcon="sparkles" class="size-4" />
                </div>

                <div class="flex-1 min-w-0 bg-neutral-50/80 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs">
                  <!-- Tools used badge if present -->
                  @if (message.toolsUsed && message.toolsUsed.length > 0) {
                    <div class="flex flex-wrap items-center gap-1.5 mb-3 pb-2.5 border-b border-neutral-200/60 dark:border-neutral-700/60 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <mat-icon svgIcon="database" class="size-3.5 text-blue-500" />
                      <span class="font-medium">Herramientas consultadas:</span>
                      @for (tool of message.toolsUsed; track tool) {
                        <span class="px-1.5 py-0.5 rounded bg-blue-100/70 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono text-[10px]">
                          {{ tool }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Content / Streaming -->
                  @if (message.streaming && !message.content) {
                    <div class="flex items-center gap-2 py-2 text-neutral-500 dark:text-neutral-400 text-xs">
                      <div class="flex gap-1">
                        <span class="size-2 rounded-full bg-blue-500 animate-bounce"></span>
                        <span class="size-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
                        <span class="size-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span class="font-medium text-neutral-600 dark:text-neutral-300">Consultando base de datos y procesando respuesta...</span>
                    </div>
                  } @else {
                    <div class="relative">
                      <markdown-renderer [content]="getMessageText(message.content)" />
                      @if (message.streaming) {
                        <span class="ai-typing-cursor"></span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- Quick Chips & Composer Bar -->
      <div class="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 lg:px-8 bg-white dark:bg-neutral-900 shrink-0">
        <div class="mx-auto w-full max-w-4xl space-y-2">
          <!-- Quick action chips -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span class="text-[11px] text-neutral-400 shrink-0 font-medium">Sugerencias:</span>
            <button
              type="button"
              class="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 text-xs cursor-pointer"
              (click)="sendQuickQuery('Resumen de la empresa y conteos')"
            >
              📊 Resumen Empresa
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 text-xs cursor-pointer"
              (click)="sendQuickQuery('Lista de productos con precios')"
            >
              📦 Catálogo Productos
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 text-xs cursor-pointer"
              (click)="sendQuickQuery('Listar clientes registrados')"
            >
              👥 Clientes
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 text-xs cursor-pointer"
              (click)="sendQuickQuery('Últimos registros de auditoría y actividades')"
            >
              🛡️ Auditoría & Logs
            </button>
          </div>

          <!-- Input box -->
          <div
            class="flex items-end gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/80 p-2 shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
          >
            <textarea
              [(ngModel)]="prompt"
              (keydown.enter)="onKeyDown($event)"
              class="flex-1 resize-none border-0 bg-transparent px-2 py-1 outline-none text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
              placeholder="¿Cuáles son nuestros productos más caros?"
              cdkTextareaAutosize
              [cdkAutosizeMinRows]="1"
              cdkAutosizeMaxRows="6"
              [disabled]="isGenerating()"
            ></textarea>

            <button
              type="button"
              class="flex items-center justify-center size-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors cursor-pointer shrink-0 shadow-xs"
              [disabled]="!prompt.trim() || isGenerating()"
              (click)="submitMessage()"
            >
              <mat-icon svgIcon="send" class="size-4" />
            </button>
          </div>
        </div>
      </div>
    } @else {
      <div class="flex h-full flex-col items-center justify-center p-8 text-center text-neutral-400">
        <mat-icon svgIcon="message-square-dashed" class="size-12 mb-2 opacity-50" />
        <span class="text-sm font-medium">Conversación no encontrada</span>
      </div>
    }
  `,
})
export default class ConversationComponent {
  private aiChatService = inject(AiChatService);
  protected aiChat = inject(AiChat);
  private destroyRef = inject(DestroyRef);

  // Route input id
  id = input.required<string>();

  protected prompt = '';
  protected isGenerating = this.aiChatService.isGenerating;
  protected isEditingTitle = signal(false);
  protected editTitleText = '';

  private scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  currentConversation = computed(() => {
    const list = this.aiChatService.conversations();
    const targetId = this.id();
    return list.find((c) => c.id === targetId) || null;
  });

  constructor() {
    // Auto-scroll to bottom when conversation messages change.
    // Using untracked to read the scrollContainer without creating a reactive dependency,
    // preventing the effect from re-running when the element ref changes.
    effect(() => {
      const conv = this.currentConversation();
      if (conv) {
        // Schedule scroll after Angular has updated the DOM
        untracked(() => setTimeout(() => this.scrollToBottom(), 0));
      }
    });
  }

  getMessageText(content: any): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((p) => (p.type === 'code' ? `\`\`\`${p.language || ''}\n${p.value}\n\`\`\`` : p.value)).join('\n\n');
    }
    return '';
  }

  onKeyDown(e: Event) {
    const kbEvent = e as KeyboardEvent;
    if (!kbEvent.shiftKey) {
      kbEvent.preventDefault();
      this.submitMessage();
    }
  }

  submitMessage() {
    const text = this.prompt.trim();
    if (!text || this.isGenerating()) return;
    this.prompt = '';

    const convId = this.id();
    this.aiChatService.sendMessage(convId, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.scrollToBottom(),
      });
  }

  sendQuickQuery(query: string) {
    if (this.isGenerating()) return;
    const convId = this.id();
    this.aiChatService.sendMessage(convId, query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.scrollToBottom(),
      });
  }

  startEditTitle(currentTitle: string) {
    this.editTitleText = currentTitle;
    this.isEditingTitle.set(true);
  }

  saveTitle() {
    if (this.isEditingTitle()) {
      this.isEditingTitle.set(false);
      this.aiChatService.renameConversation(this.id(), this.editTitleText);
    }
  }

  deleteThisConversation() {
    this.aiChat.deleteChat(this.id());
  }

  private scrollToBottom() {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
