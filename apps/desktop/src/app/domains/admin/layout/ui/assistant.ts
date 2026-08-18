import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, inject, signal, computed, ElementRef, viewChild, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AiChatService } from '@/app/domains/admin/modules/apps/ai-chat/data/ai-chat';
import { MarkdownRendererComponent } from '@/app/shared/components/markdown-renderer/markdown-renderer.component';
import { ThinkingOrbComponent } from '@/app/shared/components/thinking-orb/thinking-orb.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { ArrowUpRightIcon, XIcon, SendIcon } from 'ng-animated-icons';

@Component({
  selector: 'assistant',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    CdkTextareaAutosize,
    MatIconButton,
    MatTooltip,
    TranslocoPipe,
    ThinkingOrbComponent,
    ArrowUpRightIcon,
    XIcon,
    SendIcon,
    MarkdownRendererComponent,
  ],
  template: `
    <button
      matIconButton
      cdkOverlayOrigin
      [matTooltip]="'layout.assistant.title' | transloco"
      (click)="toggle()"
      class="hover:opacity-90 transition-opacity flex items-center justify-center"
      #origin="cdkOverlayOrigin"
    >
      <thinking-orb [size]="24" state="composing" />
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="opened()"
      [cdkConnectedOverlayHasBackdrop]="true"
      [cdkConnectedOverlayBackdropClass]="'assistant-backdrop'"
      (detach)="toggle(false)"
      (backdropClick)="toggle(false)"
    >
      <div
        class="fixed inset-y-0 right-0 z-[1000] flex w-[480px] max-w-full flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl assistant-drawer"
      >
        <!-- Header -->
        <div class="flex shrink-0 items-center justify-between p-4 px-6 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div class="flex items-center gap-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center overflow-hidden shrink-0">
              <thinking-orb [size]="26" state="composing" />
            </div>
            <div>
              <div class="font-bold text-base text-neutral-900 dark:text-white leading-tight">
                {{ 'layout.assistant.title' | transloco }}
              </div>
              <span class="inline-block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                AI ERP AGENT
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <!-- Open in full chat app -->
            <button
              type="button"
              class="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
              [matTooltip]="'layout.assistant.openFull' | transloco"
              (click)="openFullChat()"
            >
              <i-arrow-up-right [size]="18" />
            </button>

            <!-- Close button -->
            <button
              type="button"
              class="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
              [matTooltip]="'common.close' | transloco"
              (click)="toggle(false)"
            >
              <i-x [size]="18" />
            </button>
          </div>
        </div>

        <!-- Messages list -->
        <div #scrollBox class="flex flex-auto flex-col overflow-y-auto p-4 sm:p-6 gap-4 bg-neutral-50/30 dark:bg-neutral-950/20">
          @if (currentMessages().length === 0) {
            <div class="my-auto flex flex-col items-center justify-center py-6 text-center max-w-sm mx-auto animate-in fade-in duration-300">
              <div class="relative mb-4">
                <div class="absolute -inset-3 rounded-full bg-blue-500/15 dark:bg-blue-500/20 blur-lg"></div>
                <div class="relative size-16 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center shadow-md backdrop-blur-sm overflow-hidden">
                  <thinking-orb [size]="48" state="composing" />
                </div>
              </div>
              <div class="font-bold text-base text-neutral-900 dark:text-white">
                ¿En qué puedo ayudarte?
              </div>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs leading-relaxed">
                Pregúntame sobre ventas, clientes, inventario o métricas de tu empresa.
              </p>
            </div>
          } @else {
            @for (message of currentMessages(); track message.id) {
              <div
                class="flex flex-col"
                [class.items-end]="message.role === 'user'"
                [class.items-start]="message.role === 'assistant'"
              >
                <div class="text-[11px] font-semibold text-neutral-400 mb-1 px-1">
                  {{ message.role === 'user' ? 'Tú' : 'Dolphin AI' }}
                </div>
                <div
                  class="flex max-w-[90%] flex-col rounded-2xl p-3.5 text-sm shadow-xs"
                  [class.bg-blue-600]="message.role === 'user'"
                  [class.text-white]="message.role === 'user'"
                  [class.rounded-tr-xs]="message.role === 'user'"
                  [class.bg-white]="message.role === 'assistant'"
                  [class.dark:bg-neutral-800]="message.role === 'assistant'"
                  [class.text-neutral-800]="message.role === 'assistant'"
                  [class.dark:text-neutral-200]="message.role === 'assistant'"
                  [class.border]="message.role === 'assistant'"
                  [class.border-neutral-200]="message.role === 'assistant'"
                  [class.dark:border-neutral-700]="message.role === 'assistant'"
                  [class.rounded-tl-xs]="message.role === 'assistant'"
                >
                  @if (message.streaming && !message.content) {
                    <div class="flex items-center gap-2.5 py-1 text-xs text-neutral-500">
                      <thinking-orb [size]="20" state="composing" />
                      <span>Consultando datos...</span>
                    </div>
                  } @else if (message.role === 'user') {
                    <span class="leading-relaxed whitespace-pre-wrap">{{ getMessageText(message.content) }}</span>
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

        <!-- Input Box -->
        <div class="p-4 px-6 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
          <!-- Quick suggestions -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
            <button
              type="button"
              class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 transition-colors shrink-0 cursor-pointer"
              (click)="sendQuickText('Resumen de la empresa')"
            >
              📊 Resumen
            </button>
            <button
              type="button"
              class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 transition-colors shrink-0 cursor-pointer"
              (click)="sendQuickText('Productos recientes')"
            >
              📦 Productos
            </button>
            <button
              type="button"
              class="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 transition-colors shrink-0 cursor-pointer"
              (click)="sendQuickText('Listar clientes')"
            >
              👥 Clientes
            </button>
          </div>

          <div
            class="flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
          >
            <textarea
              [(ngModel)]="prompt"
              (keydown.enter)="onEnter($event)"
              class="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none"
              [placeholder]="'layout.assistant.placeholder' | transloco"
              cdkTextareaAutosize
              [cdkAutosizeMinRows]="1"
              cdkAutosizeMaxRows="4"
              [disabled]="isGenerating()"
            ></textarea>

            <div class="flex items-center justify-between pt-1 px-2">
              <span class="text-[10px] text-neutral-400">Shift + Enter para nueva línea</span>
              <button
                type="button"
                (click)="sendMessage()"
                [disabled]="!prompt.trim() || isGenerating()"
                class="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl h-8 w-8 flex items-center justify-center transition-colors cursor-pointer"
                [matTooltip]="'common.send' | transloco"
              >
                <i-send [size]="14" />
              </button>
            </div>
          </div>

          <div class="mt-2 text-center text-[10px] text-neutral-400">
             {{ 'layout.assistant.disclaimer' | transloco }}
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class Assistant {
  private aiChatService = inject(AiChatService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected opened = signal(false);
  protected prompt = '';
  protected isGenerating = this.aiChatService.isGenerating;

  private scrollBox = viewChild<ElementRef<HTMLDivElement>>('scrollBox');

  protected currentMessages = computed(() => {
    const active = this.aiChatService.currentConversation();
    return active?.messages || [];
  });

  getMessageText(content: any): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((p) => (p.type === 'code' ? `\`\`\`${p.language || ''}\n${p.value}\n\`\`\`` : p.value)).join('\n\n');
    }
    return '';
  }

  toggle(force: boolean | null = null) {
    this.opened.update((value) => {
      const next = force === null ? !value : force;
      if (next) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
      return next;
    });
  }

  openFullChat() {
    this.toggle(false);
    const active = this.aiChatService.currentConversation();
    if (active) {
      this.router.navigate(['/admin/ai-chat', active.id]);
    } else {
      this.router.navigate(['/admin/ai-chat']);
    }
  }

  onEnter(e: Event) {
    const kb = e as KeyboardEvent;
    if (!kb.shiftKey) {
      kb.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const text = this.prompt.trim();
    if (!text || this.isGenerating()) return;
    this.prompt = '';

    const active = this.aiChatService.currentConversation();
    const convId = active ? active.id : this.aiChatService.createConversation().id;

    this.aiChatService.sendMessage(convId, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.scrollToBottom(),
      });
  }

  sendQuickText(text: string) {
    if (this.isGenerating()) return;
    const active = this.aiChatService.currentConversation();
    const convId = active ? active.id : this.aiChatService.createConversation().id;

    this.aiChatService.sendMessage(convId, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.scrollToBottom(),
      });
  }

  private scrollToBottom() {
    const el = this.scrollBox()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
