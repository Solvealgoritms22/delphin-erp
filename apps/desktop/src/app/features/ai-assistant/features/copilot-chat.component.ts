import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, computed, inject, signal, viewChild, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import {
  ArrowUpIcon,
  PlusIcon,
  XIcon,
  ImagesIcon,
} from 'ng-animated-icons';
import { Media } from '@core/media';
import { AiChatService } from '@features/ai-assistant/data/ai-chat';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ThinkingOrbComponent } from '@shared/components/thinking-orb/thinking-orb.component';
import { SpeechRecognitionService } from '@shared/services/speech-recognition.service';
import { AttachedFile } from '@features/ai-assistant/features/copilot-conversation.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

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
    ArrowUpIcon,
    PlusIcon,
    XIcon,
    ImagesIcon,
    ThinkingOrbComponent,
    TranslocoPipe,
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

        <mat-sidenav
          class="w-72 border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
          [mode]="isMobile() ? 'over' : 'side'"
          [opened]="isSidebarOpen()"
          [position]="'start'"
          [fixedInViewport]="isMobile()"
          disableClose
        >
          <div class="flex h-full w-full flex-col">

            <div class="flex items-center justify-between py-3.5 pr-2.5 pl-4 border-b border-neutral-200/60 dark:border-neutral-800/60 shrink-0">
              <div class="flex items-center gap-2 text-base font-bold tracking-tight text-neutral-900 dark:text-white truncate">
                <thinking-orb [size]="20" state="composing" />
                <span class="truncate">{{ 'aiChat.title' | transloco }}</span>
              </div>
              <div class="flex items-center gap-0.5 shrink-0">
                <button
                  class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  matIconButton
                  [matTooltip]="'aiChat.newConversation' | transloco"
                  (click)="createNewChat()"
                >
                  <mat-icon svgIcon="square-pen" />
                </button>
                <button
                  class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  matIconButton
                  [matTooltip]="'aiChat.collapseSidebar' | transloco"
                  (click)="toggleSidebar()"
                >
                  <mat-icon svgIcon="panel-left-close" />
                </button>
              </div>
            </div>

            <div class="px-3 py-2.5">
              <div class="relative flex items-center">
                <mat-icon svgIcon="search" class="absolute left-3 size-4 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  [placeholder]="'aiChat.searchPlaceholder' | transloco"
                  [(ngModel)]="searchQuery"
                  class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 pl-9 pr-3 py-1.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div class="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
              @for (group of filteredGroups(); track group.label) {
                <div>
                  <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {{ group.label }}
                  </div>
                  <div class="mt-1 space-y-0.5">
                    @for (conv of group.conversations; track conv.id) {
                      <div
                        class="group relative flex items-center rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                        [routerLink]="['/admin/ai-chat', conv.id]"
                        routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold"
                        [routerLinkActiveOptions]="{ exact: true }"
                        (click)="selectConversation(conv.id)"
                      >
                        <div class="truncate flex-1 pr-6">
                          {{ conv.title }}
                        </div>
                        <button
                          type="button"
                          class="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 size-6 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-red-500 flex items-center justify-center transition-all"
                          (click)="$event.stopPropagation(); deleteChat(conv.id)"
                          [matTooltip]="'aiChat.deleteConversation' | transloco"
                        >
                          <mat-icon svgIcon="trash" class="size-3.5" />
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }

              @if (filteredGroups().length === 0) {
                <div class="px-4 py-8 text-center text-xs text-neutral-400">
                  {{ 'aiChat.noConversations' | transloco }}
                </div>
              }
            </div>
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="flex flex-col h-full bg-white dark:bg-neutral-900 overflow-hidden">
          <router-outlet (activate)="onRouteActivate()" (deactivate)="onRouteDeactivate()"></router-outlet>

          @if (!isChildActive()) {
            @if (!isSidebarOpen() || isMobile()) {
              <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 shrink-0">
                <div class="flex items-center gap-2">
                  <button
                    class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    matIconButton
                    [matTooltip]="'aiChat.expandSidebar' | transloco"
                    (click)="toggleSidebar()"
                  >
                    <mat-icon svgIcon="panel-left" />
                  </button>
                  <div class="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
                    <thinking-orb [size]="18" state="composing" />
                    <span>{{ 'aiChat.title' | transloco }}</span>
                  </div>
                </div>

                <button
                  class="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  matIconButton
                  [matTooltip]="'aiChat.newConversation' | transloco"
                  (click)="createNewChat()"
                >
                  <mat-icon svgIcon="square-pen" />
                </button>
              </div>
            }

            <div
              class="flex flex-auto flex-col items-center justify-center px-6 py-8 lg:px-8 overflow-y-auto"
            >
              <div class="w-full max-w-3xl">
                <div class="flex flex-col items-center text-center">
                  <div class="relative mb-3 flex items-center justify-center">
                    <div class="absolute -inset-4 rounded-full bg-blue-500/15 dark:bg-blue-500/20 blur-xl"></div>
                    <thinking-orb [size]="56" state="composing" />
                  </div>
                  <div
                    class="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl"
                  >
                    {{ 'aiChat.welcomeTitle' | transloco }}
                  </div>
                  <div class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {{ 'aiChat.welcomeSubtitle' | transloco }}
                  </div>
                </div>

                <div class="mt-8 grid grid-cols-1 gap-3 @xl:grid-cols-2">
                  @for (suggestion of suggestions(); track suggestion.title) {
                    <button
                      class="flex cursor-pointer flex-col gap-y-1 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-all hover:border-blue-300 dark:hover:border-blue-700 shadow-xs"
                      (click)="sendQuickSuggestion(suggestion.query)"
                    >
                      <div class="flex items-center gap-x-2">
                        <mat-icon [svgIcon]="suggestion.icon" class="size-4 text-blue-600 dark:text-blue-400" />
                        <span class="text-sm font-semibold text-neutral-900 dark:text-white">
                          {{ suggestion.title }}
                        </span>
                      </div>
                      <span class="text-xs text-neutral-500 dark:text-neutral-400">
                        {{ suggestion.description }}
                      </span>
                    </button>
                  }
                </div>
              </div>
            </div>

            <div class="px-6 pb-6 lg:px-8">
              <div class="mx-auto w-full max-w-3xl">

                <div
                  (dragover)="onDragOverEmpty($event)"
                  (drop)="onDropEmpty($event)"
                  class="relative flex flex-col rounded-[26px] border border-neutral-200/90 dark:border-neutral-700/80 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl shadow-xl shadow-neutral-900/10 dark:shadow-black/60 p-2.5 sm:p-3 transition-all duration-200"
                >

                  <input
                    type="file"
                    #fileInputEmpty
                    (change)="onFilesSelectedEmpty($event)"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    class="hidden"
                  />

                  @if (selectedImagesEmpty().length > 0) {
                    <div class="flex items-center gap-2 px-1 pt-1 pb-2 overflow-x-auto">
                      @for (img of selectedImagesEmpty(); track img.id) {
                        <div class="relative group shrink-0 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 shadow-2xs">
                          <img [src]="img.preview" [alt]="img.name" class="size-14 object-cover" />
                          <button
                            type="button"
                            (click)="removeImageEmpty(img.id)"
                            class="absolute top-1 right-1 size-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                            [matTooltip]="'aiChat.deleteImage' | transloco"
                          >
                            <i-x [size]="11" />
                          </button>
                          <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5 text-[9px] text-white truncate max-w-14">
                            {{ img.name }}
                          </div>
                        </div>
                      }
                      @if (selectedImagesEmpty().length < 4) {
                        <button
                          type="button"
                          (click)="triggerFileInputEmpty()"
                          class="size-14 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 hover:border-blue-500 dark:hover:border-blue-400 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer shrink-0 text-[10px]"
                          [matTooltip]="'aiChat.attachImage' | transloco"
                        >
                          <i-images [size]="15" />
                          <span class="text-[9px] font-medium">+{{ 4 - selectedImagesEmpty().length }}</span>
                        </button>
                      }
                    </div>
                  }

                  <div class="relative flex items-start gap-2 w-full">
                    <textarea
                      [ngModel]="emptyPrompt()"
                      (ngModelChange)="onEmptyPromptChange($event)"
                      (keydown.enter)="onEnterEmpty($event)"
                      (paste)="onPasteEmpty($event)"
                      class="w-full resize-none border-0 bg-transparent px-2 pt-1 pb-1 outline-none text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 leading-relaxed overflow-y-auto"
                      [class.min-h-[160px]]="isEditorExpandedEmpty()"
                      [class.max-h-[380px]]="isEditorExpandedEmpty()"
                      [class.max-h-52]="!isEditorExpandedEmpty()"
                      [placeholder]="(isListeningEmpty() ? 'aiChat.listeningPlaceholder' : 'aiChat.placeholder') | transloco"
                      cdkTextareaAutosize
                      [cdkAutosizeMinRows]="1"
                      [cdkAutosizeMaxRows]="isEditorExpandedEmpty() ? 16 : 8"
                    ></textarea>

                    @if (hasLongTextEmpty() || isEditorExpandedEmpty()) {
                      <button
                        type="button"
                        (click)="toggleEditorExpandedEmpty()"
                        class="size-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/60 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5"
                        [matTooltip]="(isEditorExpandedEmpty() ? 'aiChat.collapseEditor' : 'aiChat.expandEditor') | transloco"
                      >
                        @if (isEditorExpandedEmpty()) {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>
                          </svg>
                        } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                          </svg>
                        }
                      </button>
                    }
                  </div>

                  <div class="flex items-center justify-between pt-1 mt-0.5">

                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        (click)="triggerFileInputEmpty()"
                        class="flex items-center justify-center size-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                        [matTooltip]="(selectedImagesEmpty().length >= 4 ? 'aiChat.maxImages' : 'aiChat.attachImage') | transloco"
                        [disabled]="selectedImagesEmpty().length >= 4"
                      >
                        <i-plus [size]="18" />
                      </button>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">

                      <button
                        type="button"
                        (click)="toggleDeepThinkingEmpty()"
                        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer select-none"
                        [class.bg-blue-50]="isDeepThinkingEmpty()"
                        [class.dark:bg-blue-950/60]="isDeepThinkingEmpty()"
                        [class.text-blue-600]="isDeepThinkingEmpty()"
                        [class.dark:text-blue-400]="isDeepThinkingEmpty()"
                        [class.border]="isDeepThinkingEmpty()"
                        [class.border-blue-200]="isDeepThinkingEmpty()"
                        [class.dark:border-blue-800]="isDeepThinkingEmpty()"
                        [class.text-neutral-500]="!isDeepThinkingEmpty()"
                        [class.dark:text-neutral-400]="!isDeepThinkingEmpty()"
                        [class.hover:text-neutral-900]="!isDeepThinkingEmpty()"
                        [class.dark:hover:text-white]="!isDeepThinkingEmpty()"
                        [class.hover:bg-neutral-100]="!isDeepThinkingEmpty()"
                        [class.dark:hover:bg-neutral-700/50]="!isDeepThinkingEmpty()"
                        [matTooltip]="(isDeepThinkingEmpty() ? 'aiChat.thinkActive' : 'aiChat.thinkInactive') | transloco"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="shrink-0"><path d="M14.8974 2.29998C15.8303 2.29013 16.802 2.58194 17.5566 3.22577C18.1589 3.73967 18.5845 4.44761 18.7451 5.31073C20.0159 5.68745 21.0027 6.50113 21.4482 7.6037C21.8952 8.70995 21.7263 9.93091 20.9902 10.9914C21.5775 11.9456 21.7666 13.1257 21.6757 14.2189C21.6886 14.283 21.6962 14.3493 21.6962 14.4172C21.6961 16.0908 20.757 17.5402 19.3808 18.2785C18.7896 20.2128 17.1855 21.4914 15.4599 21.6769C14.5141 21.7787 13.5339 21.5479 12.7128 20.9133C12.4502 20.7102 12.2116 20.4715 11.999 20.1994C11.7854 20.4727 11.5463 20.7126 11.2822 20.9162C10.4592 21.5506 9.47721 21.78 8.53022 21.676C6.80047 21.4857 5.19378 20.1976 4.6103 18.2521C3.32727 17.5234 2.6154 16.0905 2.38764 14.7404C2.18065 13.5132 2.32674 12.0996 3.00873 10.9914C2.2728 9.93104 2.10389 8.7098 2.55073 7.6037C2.99615 6.50129 3.98328 5.68752 5.25385 5.31073C5.41438 4.44772 5.84013 3.73967 6.44233 3.22577C7.19688 2.58201 8.16873 2.2902 9.10151 2.29998C10.0348 2.30984 11.0025 2.62141 11.7509 3.2785C11.8376 3.35461 11.9199 3.43566 11.999 3.51971C12.0783 3.43538 12.162 3.35484 12.249 3.2785C12.9972 2.62161 13.9643 2.3099 14.8974 2.29998ZM10.9999 6.17108C10.9998 5.5022 10.7533 5.06474 10.4306 4.78143C10.0884 4.48116 9.60157 4.30555 9.081 4.29998C8.55965 4.29448 8.07721 4.46058 7.74116 4.74725C7.42624 5.01593 7.18256 5.43636 7.18256 6.09393V6.12225C7.18544 6.6218 6.81963 7.04734 6.32514 7.11834C5.22327 7.27654 4.61609 7.83085 4.40522 8.35272C4.26751 8.69354 4.25234 9.13509 4.5058 9.61639C5.13533 9.26679 5.86003 9.06662 6.6308 9.06659C7.18307 9.06659 7.63077 9.51433 7.6308 10.0666C7.6308 10.6189 7.18309 11.0666 6.6308 11.0666C5.98117 11.0666 5.39367 11.3251 4.96284 11.7473C4.92842 11.781 4.89119 11.8103 4.85346 11.8381C4.39663 12.4129 4.18564 13.3773 4.35932 14.4074C4.55066 15.5418 5.13668 16.3609 5.82123 16.6213C6.14352 16.7438 6.38036 17.0242 6.44721 17.3625C6.7245 18.7647 7.77678 19.5806 8.74799 19.6877C9.2239 19.74 9.68087 19.6256 10.0615 19.3322C10.4299 19.0481 10.794 18.5409 10.9999 17.6867V6.17108ZM12.9999 17.6877C13.2056 18.54 13.5688 19.047 13.9365 19.3312C14.3162 19.6246 14.7714 19.7397 15.246 19.6887C15.8221 19.6267 16.4253 19.3131 16.8808 18.7775C16.3687 18.7272 15.881 18.5901 15.4345 18.3781C14.9357 18.1411 14.7229 17.544 14.9599 17.0451C15.197 16.5466 15.7933 16.3347 16.2919 16.5715C16.6002 16.7179 16.9461 16.8 17.3134 16.8C17.5725 16.8 17.8193 16.7562 18.0507 16.6808C18.0914 16.6584 18.1336 16.6381 18.1777 16.6213C18.8623 16.3609 19.4482 15.5419 19.6396 14.4074C19.8303 13.2768 19.5586 12.2249 19.0058 11.6808C18.8148 11.4929 18.707 11.236 18.707 10.968C18.707 10.7 18.8148 10.443 19.0058 10.2551C19.7383 9.53413 19.7916 8.84018 19.5947 8.35272C19.4539 8.00424 19.1357 7.64175 18.6122 7.39178C18.2868 8.40588 17.5605 9.23979 16.6191 9.70233C16.1235 9.94566 15.5237 9.74089 15.2802 9.2453C15.0368 8.74965 15.2416 8.14994 15.7373 7.90643C16.3692 7.59585 16.8006 6.94772 16.8007 6.20038C16.8007 6.148 16.8057 6.09628 16.8134 6.04608C16.802 5.41578 16.5659 5.0094 16.2587 4.74725C15.9227 4.46055 15.4403 4.29449 14.9189 4.29998C14.398 4.30549 13.9106 4.48092 13.5683 4.78143C13.286 5.02931 13.0623 5.39527 13.0107 5.93084L12.9999 6.17108V17.6877Z" fill="currentColor"></path></svg>
                        <span>{{ 'aiChat.think' | transloco }}</span>
                      </button>

                      <button
                        type="button"
                        (click)="toggleVoiceDictationEmpty()"
                        class="flex items-center justify-center size-8 rounded-full transition-all cursor-pointer shrink-0"
                        [class.bg-red-500]="isListeningEmpty()"
                        [class.text-white]="isListeningEmpty()"
                        [class.animate-pulse]="isListeningEmpty()"
                        [class.ring-2]="isListeningEmpty()"
                        [class.ring-red-400]="isListeningEmpty()"
                        [class.hover:bg-neutral-100]="!isListeningEmpty()"
                        [class.dark:hover:bg-neutral-700]="!isListeningEmpty()"
                        [class.text-neutral-500]="!isListeningEmpty()"
                        [class.dark:text-neutral-400]="!isListeningEmpty()"
                        [class.hover:text-neutral-800]="!isListeningEmpty()"
                        [class.dark:hover:text-white]="!isListeningEmpty()"
                        [matTooltip]="(isListeningEmpty() ? 'aiChat.voiceListening' : 'aiChat.voiceDictation') | transloco"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" x2="12" y1="19" y2="22"/>
                        </svg>
                      </button>

                      <button
                        type="button"
                        class="flex items-center justify-center size-8.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-all cursor-pointer shrink-0 shadow-sm"
                        [disabled]="(!emptyPrompt().trim() && selectedImagesEmpty().length === 0)"
                        (click)="sendEmptyPrompt()"
                        [matTooltip]="'aiChat.sendMessage' | transloco"
                      >
                        <i-arrow-up [size]="16" strokeWidth="2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div class="mt-2.5 text-center text-xs text-neutral-400">
                  {{ 'aiChat.disclaimer' | transloco }}
                </div>
              </div>
            </div>
          }
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
})
export default class CopilotChatComponent implements OnInit {
  private aiChatService = inject(AiChatService);
  private media = inject(Media);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private speechService = inject(SpeechRecognitionService);
  private dialog = inject(MatDialog);

  protected isChildActive = signal(false);
  protected searchQuery = '';
  protected emptyPrompt = signal('');
  protected isDeepThinkingEmpty = signal(false);
  protected isEditorExpandedEmpty = signal(false);

  protected selectedImagesEmpty = signal<AttachedFile[]>([]);
  protected isListeningEmpty = this.speechService.isListening;

  ngOnInit() {
    this.isChildActive.set(!!this.route.firstChild);
  }

  onRouteActivate() {
    this.isChildActive.set(true);
  }

  onRouteDeactivate() {
    this.isChildActive.set(false);
  }

  private autosizeEmpty = viewChild(CdkTextareaAutosize);
  private fileInputEmpty = viewChild<ElementRef<HTMLInputElement>>('fileInputEmpty');

  onEmptyPromptChange(value: string) {
    this.emptyPrompt.set(value);
    if (!value.trim() && this.selectedImagesEmpty().length === 0) {
      this.isEditorExpandedEmpty.set(false);
      this.autosizeEmpty()?.reset();
    }
  }

  toggleDeepThinkingEmpty() {
    this.isDeepThinkingEmpty.update((v) => !v);
  }

  toggleEditorExpandedEmpty() {
    this.isEditorExpandedEmpty.update((v) => !v);
  }

  triggerFileInputEmpty() {
    if (this.selectedImagesEmpty().length >= 4) return;
    this.fileInputEmpty()?.nativeElement?.click();
  }

  onFilesSelectedEmpty(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.processFilesEmpty(Array.from(input.files));
    input.value = '';
  }

  onPasteEmpty(event: ClipboardEvent) {
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
      this.processFilesEmpty(files);
    }
  }

  onDragOverEmpty(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDropEmpty(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (files.length > 0) {
        this.processFilesEmpty(files);
      }
    }
  }

  private processFilesEmpty(files: File[]) {
    const current = this.selectedImagesEmpty();
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
        this.selectedImagesEmpty.update((list) => [...list, newImg].slice(0, 4));
      };
      reader.readAsDataURL(file);
    });
  }

  removeImageEmpty(id: string) {
    this.selectedImagesEmpty.update((list) => list.filter((img) => img.id !== id));
  }

  private voiceBasePromptEmpty = '';

  toggleVoiceDictationEmpty() {
    if (!this.speechService.isListening()) {
      this.voiceBasePromptEmpty = this.emptyPrompt().trim();
      this.speechService.start((spokenText) => {
        const base = this.voiceBasePromptEmpty;
        this.emptyPrompt.set(base ? `${base} ${spokenText}` : spokenText);
      });
    } else {
      this.speechService.stop();
      this.voiceBasePromptEmpty = '';
    }
  }

  private transloco = inject(TranslocoService);

  hasTextEmpty = computed(() => !!this.emptyPrompt().trim());

  hasLongTextEmpty = computed(() => {
    const text = this.emptyPrompt();
    if (!text) return false;
    const lineCount = (text.match(/\n/g) || []).length + 1;
    return lineCount >= 3 || text.length > 110;
  });

  isMobile = computed(() =>
    this.media.match(`(max-width: 1023px)`)()
  );

  protected suggestions = computed(() => [
    {
      icon: 'building-2',
      title: this.transloco.translate('aiChat.suggestions.summaryTitle'),
      description: this.transloco.translate('aiChat.suggestions.summaryDesc'),
      query: this.transloco.translate('aiChat.suggestions.summaryQuery'),
    },
    {
      icon: 'package',
      title: this.transloco.translate('aiChat.suggestions.productsTitle'),
      description: this.transloco.translate('aiChat.suggestions.productsDesc'),
      query: this.transloco.translate('aiChat.suggestions.productsQuery'),
    },
    {
      icon: 'users',
      title: this.transloco.translate('aiChat.suggestions.clientsTitle'),
      description: this.transloco.translate('aiChat.suggestions.clientsDesc'),
      query: this.transloco.translate('aiChat.suggestions.clientsQuery'),
    },
    {
      icon: 'shield-alert',
      title: this.transloco.translate('aiChat.suggestions.auditTitle'),
      description: this.transloco.translate('aiChat.suggestions.auditDesc'),
      query: this.transloco.translate('aiChat.suggestions.auditQuery'),
    },
  ]);

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

    const todayGroup = { label: this.transloco.translate('aiChat.groups.today'), conversations: [] as typeof conversations };
    const yesterdayGroup = { label: this.transloco.translate('aiChat.groups.yesterday'), conversations: [] as typeof conversations };
    const previousGroup = { label: this.transloco.translate('aiChat.groups.previous'), conversations: [] as typeof conversations };

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

  protected currentConversation = this.aiChatService.currentConversation;
  private readonly SIDEBAR_STORAGE_KEY = 'dolphin_ai_chat_sidebar_open';

  panelOpened = signal(false);
  sidebarOpened = signal<boolean>(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(this.SIDEBAR_STORAGE_KEY) !== 'false'
      : true
  );

  isSidebarOpen = computed(() => {
    return this.isMobile() ? this.panelOpened() : this.sidebarOpened();
  });

  toggleSidebar() {
    if (this.isMobile()) {
      this.panelOpened.update((v) => !v);
    } else {
      this.sidebarOpened.update((v) => {
        const next = !v;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.SIDEBAR_STORAGE_KEY, String(next));
        }
        return next;
      });
    }
  }

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

  deleteChat(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: this.transloco.translate('aiChat.deleteConversation'),
        message: this.transloco.translate('aiChat.confirmDelete'),
        confirmLabel: this.transloco.translate('common.delete'),
        cancelLabel: this.transloco.translate('common.cancel'),
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
      this.aiChatService.sendMessage(newConv.id, query, undefined, this.isDeepThinkingEmpty()).subscribe();
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
    const text = this.emptyPrompt().trim();
    const images = this.selectedImagesEmpty().map((img) => img.base64);
    if (!text && images.length === 0) return;

    if (this.isListeningEmpty()) {
      this.speechService.stop();
    }

    this.emptyPrompt.set('');
    this.selectedImagesEmpty.set([]);
    this.isEditorExpandedEmpty.set(false);
    this.autosizeEmpty()?.reset();

    const finalPrompt = this.isDeepThinkingEmpty()
      ? `[MODO_RAZONAMIENTO_PROFUNDO: Detalla tu proceso analítico en <think>...</think> antes de dar la respuesta final]\n\n${text}`
      : text;

    const titleText = text ? (text.slice(0, 30) + '...') : 'Consulta con imágenes';
    const newConv = this.aiChatService.createConversation(titleText);
    this.router.navigate(['/admin/ai-chat', newConv.id]).then(() => {
      this.aiChatService.sendMessage(newConv.id, finalPrompt, images, this.isDeepThinkingEmpty()).subscribe();
    });
  }
}
