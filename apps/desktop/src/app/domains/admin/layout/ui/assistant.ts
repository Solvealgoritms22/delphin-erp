import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import {
  Component,
  inject,
  signal,
  computed,
  ElementRef,
  viewChild,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AiChatService } from '@/app/domains/admin/modules/apps/ai-chat/data/ai-chat';
import { Message } from '@/app/domains/admin/modules/apps/ai-chat/data/model';
import { MarkdownRendererComponent } from '@/app/shared/components/markdown-renderer/markdown-renderer.component';
import { ThinkingOrbComponent } from '@/app/shared/components/thinking-orb/thinking-orb.component';
import { ThinkingBlockComponent } from '@/app/shared/components/ai/thinking-block.component';
import { ToolCallCardComponent } from '@/app/shared/components/ai/tool-call-card.component';
import { ChatMessageActionsComponent } from '@/app/shared/components/ai/chat-message-actions.component';
import { SpeechRecognitionService } from '@/app/shared/services/speech-recognition.service';
import { AttachedFile } from '@/app/domains/admin/modules/apps/ai-chat/features/conversation';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ArrowUpRightIcon,
  XIcon,
  ArrowUpIcon,
  PlusIcon,
  ImagesIcon,
} from 'ng-animated-icons';

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
    ThinkingBlockComponent,
    ToolCallCardComponent,
    ChatMessageActionsComponent,
    ArrowUpRightIcon,
    XIcon,
    ArrowUpIcon,
    PlusIcon,
    ImagesIcon,
    MarkdownRendererComponent,
  ],
  template: `
    <button
      matIconButton
      cdkOverlayOrigin
      [matTooltip]="'layout.assistant.title' | transloco"
      (click)="toggle()"
      class="hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer"
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
        class="fixed inset-y-0 right-0 z-[1000] flex w-[520px] max-w-full flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl assistant-drawer"
      >

        <div class="flex shrink-0 items-center justify-between p-3.5 px-5 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md z-20">
          <div class="flex items-center gap-x-2.5">
            <thinking-orb [size]="24" state="composing" />
            <div>
              <div class="font-bold text-sm text-neutral-900 dark:text-white leading-tight">
                {{ 'layout.assistant.title' | transloco }}
              </div>
              <span class="inline-block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                AI ERP AGENT
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1">

            <button
              type="button"
              class="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
              [matTooltip]="'layout.assistant.openFull' | transloco"
              (click)="openFullChat()"
            >
              <i-arrow-up-right [size]="18" />
            </button>

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

        <div #scrollBox class="flex flex-auto flex-col overflow-y-auto p-4 sm:p-5 gap-y-5 bg-neutral-50/40 dark:bg-neutral-950/30">
          @if (currentMessages().length === 0) {
            <div class="my-auto flex flex-col items-center justify-center py-6 text-center max-w-sm mx-auto animate-in fade-in duration-300">
              <div class="relative mb-4 flex items-center justify-center">
                <div class="absolute -inset-4 rounded-full bg-blue-500/15 dark:bg-blue-500/20 blur-xl"></div>
                <thinking-orb [size]="56" state="composing" />
              </div>
              <div class="font-bold text-base text-neutral-900 dark:text-white">
                {{ 'aiChat.welcomeTitle' | transloco }}
              </div>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs leading-relaxed">
                {{ 'aiChat.welcomeSubtitle' | transloco }}
              </p>
            </div>
          } @else {
            @for (message of currentMessages(); track message.id) {
              @if (message.role === 'user') {

                <div class="flex flex-col items-end gap-1.5">

                  @if (message.images && message.images.length > 0) {
                    <div class="flex flex-wrap justify-end gap-2 max-w-[85%]">
                      @for (imgUrl of message.images; track imgUrl) {
                        <div
                          (click)="previewModalImage.set(imgUrl)"
                          class="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-xs cursor-pointer hover:opacity-90 transition-opacity bg-neutral-100 dark:bg-neutral-800"
                        >
                          <img [src]="imgUrl" alt="Imagen adjunta" class="size-20 sm:size-24 object-cover" />
                        </div>
                      }
                    </div>
                  }

                  @if (getMessageText(message.content)) {
                    <div class="max-w-[85%] rounded-2xl rounded-tr-xs bg-blue-600 text-white px-3.5 py-2.5 shadow-xs text-sm leading-relaxed whitespace-pre-wrap">
                      {{ getMessageText(message.content) }}
                    </div>
                  }
                </div>
              } @else {

                <div class="flex items-start gap-3 w-full group">
                  <div class="flex items-center justify-center shrink-0 mt-0.5 select-none">
                    <thinking-orb [size]="22" state="composing" />
                  </div>

                  <div class="flex-1 min-w-0 pt-0.5 space-y-2.5">

                    @if (getThinkingText(message)) {
                      <app-thinking-block
                        [content]="getThinkingText(message)"
                        [isThinking]="!!(message.streaming && isCurrentlyThinking(message))"
                        [durationSeconds]="message.thinkingDurationMs ? (message.thinkingDurationMs / 1000) : null"
                      />
                    }

                    @if (message.toolsUsed && message.toolsUsed.length > 0) {
                      <div class="space-y-1.5">
                        @for (tool of message.toolsUsed; track tool) {
                          <app-tool-call-card
                            [toolName]="tool"
                            [status]="message.streaming && !getCleanResponseText(message) ? 'running' : 'success'"
                          />
                        }
                      </div>
                    }

                    @if (message.streaming && !getCleanResponseText(message) && !getThinkingText(message)) {
                      <div class="flex items-center gap-2.5 py-1 text-xs text-neutral-500">
                        <thinking-orb [size]="16" state="composing" />
                        <span>{{ 'aiChat.consultingErp' | transloco }}</span>
                      </div>
                    } @else if (getCleanResponseText(message)) {
                      <div class="relative text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed">
                        <markdown-renderer [content]="getCleanResponseText(message)" />
                        @if (message.streaming) {
                          <span class="inline-block w-1.5 h-3.5 ml-1 bg-blue-600 dark:bg-blue-400 animate-pulse align-middle rounded-xs"></span>
                        }
                      </div>
                    }

                    @if (!message.streaming && getCleanResponseText(message)) {
                      <div class="pt-0.5">
                        <app-chat-message-actions
                          [content]="getCleanResponseText(message)"
                          (retry)="retryLastPrompt()"
                        />
                      </div>
                    }
                  </div>
                </div>
              }
            }
          }
        </div>

        <div class="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shrink-0">

          <div class="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
            <button
              type="button"
              class="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer text-xs font-medium"
              (click)="sendQuickText('Dame un resumen ejecutivo general de la empresa')"
            >
              📊 {{ 'layout.assistant.quickSummary' | transloco }}
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer text-xs font-medium"
              (click)="sendQuickText('¿Cuáles son los productos con bajo stock o stock crítico?')"
            >
              📦 {{ 'layout.assistant.quickStock' | transloco }}
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer text-xs font-medium"
              (click)="sendQuickText('Muestra la lista de clientes registrados')"
            >
              👥 {{ 'layout.assistant.quickClients' | transloco }}
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer text-xs font-medium"
              (click)="sendQuickText('Últimos registros de auditoría y actividades')"
            >
              🛡️ {{ 'layout.assistant.quickAudit' | transloco }}
            </button>
          </div>

          <div
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event)"
            class="relative flex flex-col rounded-[22px] border border-neutral-200/90 dark:border-neutral-700/80 bg-neutral-50/80 dark:bg-neutral-800/80 p-2 sm:p-2.5 transition-all duration-200 shadow-xs"
          >

            <input
              type="file"
              #fileInput
              (change)="onFilesSelected($event)"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              class="hidden"
            />

            @if (selectedImages().length > 0) {
              <div class="flex items-center gap-2 px-1 pt-1 pb-2 overflow-x-auto">
                @for (img of selectedImages(); track img.id) {
                  <div class="relative group shrink-0 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 shadow-2xs">
                    <img [src]="img.preview" [alt]="img.name" class="size-12 object-cover" />
                    <button
                      type="button"
                      (click)="removeImage(img.id)"
                      class="absolute top-0.5 right-0.5 size-4.5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                      [matTooltip]="'aiChat.deleteImage' | transloco"
                    >
                      <i-x [size]="10" />
                    </button>
                  </div>
                }
                @if (selectedImages().length < 4) {
                  <button
                    type="button"
                    (click)="triggerFileInput()"
                    class="size-12 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 hover:border-blue-500 text-neutral-400 hover:text-blue-600 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer shrink-0 text-[9px]"
                    [matTooltip]="'aiChat.attachImage' | transloco"
                  >
                    <i-images [size]="13" />
                    <span class="font-medium">+{{ 4 - selectedImages().length }}</span>
                  </button>
                }
              </div>
            }

            <div class="relative flex items-start gap-1.5 w-full">
              <textarea
                [ngModel]="prompt()"
                (ngModelChange)="onPromptChange($event)"
                (keydown.enter)="onEnter($event)"
                (paste)="onPaste($event)"
                class="w-full resize-none border-0 bg-transparent px-2 pt-1 pb-1 outline-none text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 leading-relaxed overflow-y-auto"
                [class.min-h-[120px]]="isEditorExpanded()"
                [class.max-h-[260px]]="isEditorExpanded()"
                [class.max-h-40]="!isEditorExpanded()"
                [placeholder]="(isListening() ? 'aiChat.listeningPlaceholder' : 'aiChat.placeholder') | transloco"
                cdkTextareaAutosize
                [cdkAutosizeMinRows]="1"
                [cdkAutosizeMaxRows]="isEditorExpanded() ? 12 : 5"
                [disabled]="isGenerating()"
              ></textarea>

              @if (hasLongText() || isEditorExpanded()) {
                <button
                  type="button"
                  (click)="toggleEditorExpanded()"
                  class="size-6 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700/60 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5"
                  [matTooltip]="(isEditorExpanded() ? 'aiChat.collapseEditor' : 'aiChat.expandEditor') | transloco"
                >
                  @if (isEditorExpanded()) {
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  }
                </button>
              }
            </div>

            <div class="flex items-center justify-between pt-1 mt-0.5">

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  (click)="triggerFileInput()"
                  class="flex items-center justify-center size-7 rounded-full hover:bg-neutral-200/80 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                  [matTooltip]="(selectedImages().length >= 4 ? 'aiChat.maxImages' : 'aiChat.attachImage') | transloco"
                  [disabled]="selectedImages().length >= 4"
                >
                  <i-plus [size]="16" />
                </button>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">

                <button
                  type="button"
                  (click)="toggleDeepThinking()"
                  class="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer select-none"
                  [class.bg-blue-50]="isDeepThinking()"
                  [class.dark:bg-blue-950/60]="isDeepThinking()"
                  [class.text-blue-600]="isDeepThinking()"
                  [class.dark:text-blue-400]="isDeepThinking()"
                  [class.border]="isDeepThinking()"
                  [class.border-blue-200]="isDeepThinking()"
                  [class.dark:border-blue-800]="isDeepThinking()"
                  [class.text-neutral-500]="!isDeepThinking()"
                  [class.dark:text-neutral-400]="!isDeepThinking()"
                  [class.hover:bg-neutral-200/70]="!isDeepThinking()"
                  [class.dark:hover:bg-neutral-700/50]="!isDeepThinking()"
                  [matTooltip]="(isDeepThinking() ? 'aiChat.thinkActive' : 'aiChat.thinkInactive') | transloco"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="shrink-0"><path d="M14.8974 2.29998C15.8303 2.29013 16.802 2.58194 17.5566 3.22577C18.1589 3.73967 18.5845 4.44761 18.7451 5.31073C20.0159 5.68745 21.0027 6.50113 21.4482 7.6037C21.8952 8.70995 21.7263 9.93091 20.9902 10.9914C21.5775 11.9456 21.7666 13.1257 21.6757 14.2189C21.6886 14.283 21.6962 14.3493 21.6962 14.4172C21.6961 16.0908 20.757 17.5402 19.3808 18.2785C18.7896 20.2128 17.1855 21.4914 15.4599 21.6769C14.5141 21.7787 13.5339 21.5479 12.7128 20.9133C12.4502 20.7102 12.2116 20.4715 11.999 20.1994C11.7854 20.4727 11.5463 20.7126 11.2822 20.9162C10.4592 21.5506 9.47721 21.78 8.53022 21.676C6.80047 21.4857 5.19378 20.1976 4.6103 18.2521C3.32727 17.5234 2.6154 16.0905 2.38764 14.7404C2.18065 13.5132 2.32674 12.0996 3.00873 10.9914C2.2728 9.93104 2.10389 8.7098 2.55073 7.6037C2.99615 6.50129 3.98328 5.68752 5.25385 5.31073C5.41438 4.44772 5.84013 3.73967 6.44233 3.22577C7.19688 2.58201 8.16873 2.2902 9.10151 2.29998C10.0348 2.30984 11.0025 2.62141 11.7509 3.2785C11.8376 3.35461 11.9199 3.43566 11.999 3.51971C12.0783 3.43538 12.162 3.35484 12.249 3.2785C12.9972 2.62161 13.9643 2.3099 14.8974 2.29998ZM10.9999 6.17108C10.9998 5.5022 10.7533 5.06474 10.4306 4.78143C10.0884 4.48116 9.60157 4.30555 9.081 4.29998C8.55965 4.29448 8.07721 4.46058 7.74116 4.74725C7.42624 5.01593 7.18256 5.43636 7.18256 6.09393V6.12225C7.18544 6.6218 6.81963 7.04734 6.32514 7.11834C5.22327 7.27654 4.61609 7.83085 4.40522 8.35272C4.26751 8.69354 4.25234 9.13509 4.5058 9.61639C5.13533 9.26679 5.86003 9.06662 6.6308 9.06659C7.18307 9.06659 7.63077 9.51433 7.6308 10.0666C7.6308 10.6189 7.18309 11.0666 6.6308 11.0666C5.98117 11.0666 5.39367 11.3251 4.96284 11.7473C4.92842 11.781 4.89119 11.8103 4.85346 11.8381C4.39663 12.4129 4.18564 13.3773 4.35932 14.4074C4.55066 15.5418 5.13668 16.3609 5.82123 16.6213C6.14352 16.7438 6.38036 17.0242 6.44721 17.3625C6.7245 18.7647 7.77678 19.5806 8.74799 19.6877C9.2239 19.74 9.68087 19.6256 10.0615 19.3322C10.4299 19.0481 10.794 18.5409 10.9999 17.6867V6.17108ZM12.9999 17.6877C13.2056 18.54 13.5688 19.047 13.9365 19.3312C14.3162 19.6246 14.7714 19.7397 15.246 19.6887C15.8221 19.6267 16.4253 19.3131 16.8808 18.7775C16.3687 18.7272 15.881 18.5901 15.4345 18.3781C14.9357 18.1411 14.7229 17.544 14.9599 17.0451C15.197 16.5466 15.7933 16.3347 16.2919 16.5715C16.6002 16.7179 16.9461 16.8 17.3134 16.8C17.5725 16.8 17.8193 16.7562 18.0507 16.6808C18.0914 16.6584 18.1336 16.6381 18.1777 16.6213C18.8623 16.3609 19.4482 15.5419 19.6396 14.4074C19.8303 13.2768 19.5586 12.2249 19.0058 11.6808C18.8148 11.4929 18.707 11.236 18.707 10.968C18.707 10.7 18.8148 10.443 19.0058 10.2551C19.7383 9.53413 19.7916 8.84018 19.5947 8.35272C19.4539 8.00424 19.1357 7.64175 18.6122 7.39178C18.2868 8.40588 17.5605 9.23979 16.6191 9.70233C16.1235 9.94566 15.5237 9.74089 15.2802 9.2453C15.0368 8.74965 15.2416 8.14994 15.7373 7.90643C16.3692 7.59585 16.8006 6.94772 16.8007 6.20038C16.8007 6.148 16.8057 6.09628 16.8134 6.04608C16.802 5.41578 16.5659 5.0094 16.2587 4.74725C15.9227 4.46055 15.4403 4.29449 14.9189 4.29998C14.398 4.30549 13.9106 4.48092 13.5683 4.78143C13.286 5.02931 13.0623 5.39527 13.0107 5.93084L12.9999 6.17108V17.6877Z" fill="currentColor"></path></svg>
                  <span>{{ 'aiChat.think' | transloco }}</span>
                </button>

                <button
                  type="button"
                  (click)="toggleVoiceDictation()"
                  class="flex items-center justify-center size-7 rounded-full transition-all cursor-pointer shrink-0"
                  [class.bg-red-500]="isListening()"
                  [class.text-white]="isListening()"
                  [class.animate-pulse]="isListening()"
                  [class.ring-2]="isListening()"
                  [class.ring-red-400]="isListening()"
                  [class.hover:bg-neutral-200/70]="!isListening()"
                  [class.dark:hover:bg-neutral-700]="!isListening()"
                  [class.text-neutral-500]="!isListening()"
                  [class.dark:text-neutral-400]="!isListening()"
                  [matTooltip]="(isListening() ? 'aiChat.voiceListening' : 'aiChat.voiceDictation') | transloco"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                  </svg>
                </button>

                <button
                  type="button"
                  (click)="sendMessage()"
                  [disabled]="(!prompt().trim() && selectedImages().length === 0) || isGenerating()"
                  class="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full size-7.5 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  [matTooltip]="'common.send' | transloco"
                >
                  <i-arrow-up [size]="14" strokeWidth="2.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        @if (previewModalImage()) {
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            (click)="previewModalImage.set(null)"
          >
            <div class="relative max-w-lg max-h-[85vh] flex flex-col items-center" (click)="$event.stopPropagation()">
              <img
                [src]="previewModalImage()!"
                alt="Vista ampliada"
                class="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
              />
              <button
                type="button"
                (click)="previewModalImage.set(null)"
                class="absolute -top-3 -right-3 size-8 rounded-full bg-neutral-900/95 text-white hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors cursor-pointer border border-white/20"
                [matTooltip]="'aiChat.closeView' | transloco"
              >
                <i-x [size]="16" />
              </button>
            </div>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class Assistant {
  private aiChatService = inject(AiChatService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private speechService = inject(SpeechRecognitionService);

  protected opened = signal(false);
  protected prompt = signal('');
  protected isGenerating = this.aiChatService.isGenerating;
  protected isDeepThinking = signal(false);
  protected isEditorExpanded = signal(false);

  protected selectedImages = signal<AttachedFile[]>([]);
  protected previewModalImage = signal<string | null>(null);

  protected isListening = this.speechService.isListening;

  private autosize = viewChild(CdkTextareaAutosize);
  private fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private scrollBox = viewChild<ElementRef<HTMLDivElement>>('scrollBox');

  protected currentMessages = computed(() => {
    const active = this.aiChatService.currentConversation();
    return active?.messages || [];
  });

  onPromptChange(value: string) {
    this.prompt.set(value);
    if (!value.trim() && this.selectedImages().length === 0) {
      this.isEditorExpanded.set(false);
      this.autosize()?.reset();
    }
  }

  toggleDeepThinking() {
    this.isDeepThinking.update((v) => !v);
  }

  toggleEditorExpanded() {
    this.isEditorExpanded.update((v) => !v);
  }

  triggerFileInput() {
    if (this.selectedImages().length >= 4) return;
    this.fileInput()?.nativeElement?.click();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.processFiles(Array.from(input.files));
    input.value = '';
  }

  onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      this.processFiles(files);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length > 0) {
        this.processFiles(files);
      }
    }
  }

  private processFiles(files: File[]) {
    const current = this.selectedImages();
    const availableSlots = 4 - current.length;
    if (availableSlots <= 0) return;

    const filesToAdd = files.slice(0, availableSlots);

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const newImg: AttachedFile = {
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          base64,
          preview: base64,
        };
        this.selectedImages.update((list) => [...list, newImg].slice(0, 4));
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(id: string) {
    this.selectedImages.update((list) => list.filter((img) => img.id !== id));
  }

  private voiceBasePrompt = '';

  toggleVoiceDictation() {
    if (!this.speechService.isListening()) {
      this.voiceBasePrompt = this.prompt().trim();
      this.speechService.start((spokenText) => {
        const base = this.voiceBasePrompt;
        this.prompt.set(base ? `${base} ${spokenText}` : spokenText);
      });
    } else {
      this.speechService.stop();
      this.voiceBasePrompt = '';
    }
  }

  hasLongText = computed(() => {
    const text = this.prompt();
    if (!text) return false;
    const lineCount = (text.match(/\n/g) || []).length + 1;
    return lineCount >= 3 || text.length > 90;
  });

  getMessageText(content: any): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((p) => (p.type === 'code' ? `\`\`\`${p.language || ''}\n${p.value}\n\`\`\`` : p.value)).join('\n\n');
    }
    return '';
  }

  getCleanResponseText(message: Message): string {
    const raw = this.getMessageText(message.content);
    if (!raw) return '';
    return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  getThinkingText(message: Message): string {
    if (message.thinkingContent) return message.thinkingContent;
    const raw = this.getMessageText(message.content);
    if (!raw) return '';

    const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch) return thinkMatch[1].trim();

    if (message.streaming && raw.includes('<think>')) {
      const parts = raw.split('<think>');
      return (parts[1] || '').trim();
    }
    return '';
  }

  isCurrentlyThinking(message: Message): boolean {
    const raw = this.getMessageText(message.content);
    return !!(message.streaming && raw.includes('<think>') && !raw.includes('</think>'));
  }

  retryLastPrompt() {
    const active = this.aiChatService.currentConversation();
    if (!active) return;
    const userMsgs = active.messages.filter((m) => m.role === 'user');
    const lastUserMsg = userMsgs[userMsgs.length - 1];
    if (lastUserMsg) {
      this.sendQuickText(this.getMessageText(lastUserMsg.content));
    }
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
    const text = this.prompt().trim();
    const images = this.selectedImages().map((img) => img.base64);
    if ((!text && images.length === 0) || this.isGenerating()) return;

    if (this.isListening()) {
      this.speechService.stop();
    }

    this.prompt.set('');
    this.selectedImages.set([]);
    this.isEditorExpanded.set(false);
    this.autosize()?.reset();

    const active = this.aiChatService.currentConversation();
    const convId = active ? active.id : this.aiChatService.createConversation().id;

    const finalPrompt = this.isDeepThinking()
      ? `[MODO_RAZONAMIENTO_PROFUNDO: Detalla tu proceso analítico en <think>...</think> antes de dar la respuesta final]\n\n${text}`
      : text;

    this.aiChatService.sendMessage(convId, finalPrompt, images, this.isDeepThinking())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.scrollToBottom(),
      });
  }

  sendQuickText(text: string) {
    if (this.isGenerating()) return;
    const active = this.aiChatService.currentConversation();
    const convId = active ? active.id : this.aiChatService.createConversation().id;

    this.aiChatService.sendMessage(convId, text, undefined, this.isDeepThinking())
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
