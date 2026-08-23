import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { Conversation, Message } from './model';
import { environment } from '@/environments/environment';
import { AuthState } from '@core/auth/auth.state';

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private http = inject(HttpClient);
  private authState = inject(AuthState);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private readonly apiUrl = `${environment.apiUrl}/ai`;
  private readonly storageKey = 'dolphin_ai_conversations';

  /** rAF handle used for batching streaming token updates */
  private streamingRafHandle: number | null = null;

  readonly conversations = signal<Conversation[]>([]);
  readonly activeConversationId = signal<string>('');
  readonly isGenerating = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);

  readonly currentConversation = computed(() => {
    const list = this.conversations();
    const activeId = this.activeConversationId();
    return list.find((c) => c.id === activeId) || list[0] || null;
  });

  constructor() {
    this.loadFromStorage();
    this.loadFromApi();
  }

  /**
   * Loads conversations from PostgreSQL via API.
   */
  loadFromApi(): void {
    if (!this.isBrowser) return;
    this.isLoading.set(true);
    this.http.get<Conversation[]>(`${this.apiUrl}/conversations`).pipe(
      tap((remoteConvs) => {
        this.isLoading.set(false);
        if (Array.isArray(remoteConvs) && remoteConvs.length > 0) {
          this.conversations.set(remoteConvs);
          const currentActive = this.activeConversationId();
          if (!currentActive || !remoteConvs.some((c) => c.id === currentActive)) {
            this.activeConversationId.set(remoteConvs[0].id);
          }
          this.saveToStorage();
        } else if (this.conversations().length === 0) {
          this.initWelcomeConversation();
        }
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    ).subscribe();
  }

  /**
   * Loads conversations from localStorage fallback.
   */
  private loadFromStorage(): void {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed: Conversation[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.conversations.set(parsed);
          this.activeConversationId.set(parsed[0].id);
          return;
        }
      }
    } catch {
      // ignore
    }

    this.initWelcomeConversation();
  }

  private initWelcomeConversation(): void {
    // Default welcome conversation
    const defaultConv: Conversation = {
      id: 'welcome-chat',
      title: 'Resumen y Asistente Dolphin ERP',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome-msg-1',
          role: 'assistant',
          content:
            `## 👋 ¡Hola! Soy tu Asistente Inteligente Dolphin ERP\n\n` +
            `Estoy conectado en tiempo real y de forma segura (modo de solo lectura) a la base de datos de tu empresa activa.\n\n` +
            `### 💡 ¿En qué puedo ayudarte hoy?\n\n` +
            `- **📊 Resumen General:** *"Dame un resumen ejecutivo de la empresa"*\n` +
            `- **📦 Catálogo & Precios:** *"Muéstrame los productos más recientes y sus precios"*\n` +
            `- **👥 Clientes y Contactos:** *"¿Qué clientes tenemos registrados?"*\n` +
            `- **🏭 Proveedores:** *"Lista de proveedores activos"*\n` +
            `- **🛡️ Seguridad & Auditoría:** *"¿Cuáles son los últimos eventos registrados?"*\n\n` +
            `Puedes hacerme cualquier pregunta o seleccionar una sugerencia a continuación.`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    if (this.conversations().length === 0) {
      this.conversations.set([defaultConv]);
      this.activeConversationId.set(defaultConv.id);
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.conversations()));
    } catch {
      // ignore
    }
  }

  /**
   * Creates a new conversation thread.
   */
  createConversation(title?: string): Conversation {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newConv: Conversation = {
      id,
      title: title || 'Nueva Conversación',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: 'Hola, ¿en qué puedo ayudarte hoy con la gestión de tu ERP?',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    this.conversations.update((prev) => [newConv, ...prev]);
    this.activeConversationId.set(id);
    this.saveToStorage();

    // Call API to persist new thread
    this.http.post<any>(`${this.apiUrl}/conversations`, { title: newConv.title }).pipe(
      tap((res) => {
        if (res?.id) {
          this.conversations.update((list) =>
            list.map((c) => (c.id === id ? { ...c, id: res.id } : c))
          );
          if (this.activeConversationId() === id) {
            this.activeConversationId.set(res.id);
          }
          this.saveToStorage();
        }
      }),
      catchError(() => of(null))
    ).subscribe();

    return newConv;
  }

  /**
   * Selects the active conversation.
   */
  selectConversation(id: string): void {
    this.activeConversationId.set(id);
  }

  /**
   * Renames the conversation title.
   */
  renameConversation(id: string, newTitle: string): void {
    this.conversations.update((list) =>
      list.map((c) => (c.id === id ? { ...c, title: newTitle.trim() || c.title } : c)),
    );
    this.saveToStorage();
  }

  /**
   * Removes a conversation thread by its unique ID.
   */
  deleteConversation(id: string): void {
    this.conversations.update((list) => list.filter((c) => c.id !== id));
    const remaining = this.conversations();
    if (remaining.length === 0) {
      this.createConversation();
    } else if (this.activeConversationId() === id) {
      this.activeConversationId.set(remaining[0].id);
    }
    this.saveToStorage();

    // Delete from API / DB
    this.http.delete(`${this.apiUrl}/conversations/${id}`).pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  /**
   * Updates a streaming message in real-time.
   * When `streaming` is true (during token emission) we schedule the update via
   * requestAnimationFrame so multiple tokens arriving in the same frame are
   * batched into a single signal write (max 60 signal updates/sec instead of
   * one per token). Final cleanup calls (streaming=false) are always applied
   * immediately to ensure the "done" state is flushed without delay.
   */
  private updateStreamingMessage(
    conversationId: string,
    messageId: string,
    content: string,
    streaming: boolean,
    toolsUsed?: string[],
  ): void {
    const applyUpdate = () => {
      this.conversations.update((list) =>
        list.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      content,
                      streaming,
                      toolsUsed: toolsUsed && toolsUsed.length > 0 ? toolsUsed : m.toolsUsed,
                    }
                  : m,
              ),
            };
          }
          return conv;
        }),
      );
    };

    if (!streaming) {
      // Final update: cancel any pending rAF and apply immediately
      if (this.streamingRafHandle !== null) {
        cancelAnimationFrame(this.streamingRafHandle);
        this.streamingRafHandle = null;
      }
      applyUpdate();
      return;
    }

    // During streaming: schedule via rAF, replacing any previously queued frame
    if (this.streamingRafHandle !== null) {
      cancelAnimationFrame(this.streamingRafHandle);
    }
    this.streamingRafHandle = requestAnimationFrame(() => {
      this.streamingRafHandle = null;
      applyUpdate();
    });
  }

  /**
   * Sends a message and consumes real-time token-by-token stream (SSE).
   */
  sendMessage(
    conversationId: string,
    text: string,
    images?: string[],
    thinking?: boolean,
  ): Observable<any> {
    const trimmed = text.trim();
    if (!trimmed && (!images || images.length === 0)) return of(null);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      images: images && images.length > 0 ? images : undefined,
      createdAt: new Date().toISOString(),
    };

    const assistantMsgId = `ai_${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
    };

    // Add user message & streaming placeholder to state
    this.conversations.update((list) =>
      list.map((conv) => {
        if (conv.id === conversationId) {
          const isDefaultTitle = conv.title === 'Nueva Conversación' || conv.messages.length <= 1;
          const newTitle = isDefaultTitle
            ? trimmed.slice(0, 36) + (trimmed.length > 36 ? '...' : '')
            : conv.title;
          return {
            ...conv,
            title: newTitle,
            messages: [...conv.messages, userMsg, assistantMsg],
          };
        }
        return conv;
      }),
    );

    this.isGenerating.set(true);

    const current = this.conversations().find((c) => c.id === conversationId);
    const history = (current?.messages || [])
      .filter((m) => !m.streaming && m.id !== assistantMsgId)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));

    return new Observable((subscriber) => {
      const token = this.authState.accessToken() || '';

      fetch(`${this.apiUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          history,
          images: images && images.length > 0 ? images : undefined,
          thinking: !!thinking,
        }),
      })
        .then(async (response) => {
          if (!response.ok || !response.body) {
            throw new Error(`Error en el servicio de IA (HTTP ${response.status})`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';
          let accumulatedContent = '';
          let toolsUsedList: string[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';

            for (const chunk of chunks) {
              const trimmedChunk = chunk.trim();
              if (!trimmedChunk || !trimmedChunk.startsWith('data:')) continue;
              const jsonStr = trimmedChunk.replace(/^data:\s*/, '');
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === 'tools' && event.toolsUsed) {
                  toolsUsedList = event.toolsUsed;
                  this.updateStreamingMessage(conversationId, assistantMsgId, accumulatedContent, true, toolsUsedList);
                } else if (event.type === 'token' && event.token) {
                  accumulatedContent += event.token;
                  this.updateStreamingMessage(conversationId, assistantMsgId, accumulatedContent, true, toolsUsedList);
                } else if (event.type === 'done') {
                  this.updateStreamingMessage(conversationId, assistantMsgId, accumulatedContent, false, event.toolsUsed || toolsUsedList);
                }
              } catch {
                // ignore partial JSON chunks
              }
            }
          }

          this.updateStreamingMessage(conversationId, assistantMsgId, accumulatedContent, false, toolsUsedList);
          this.isGenerating.set(false);
          this.saveToStorage();
          subscriber.next({ reply: accumulatedContent });
          subscriber.complete();
        })
        .catch((err) => {
          const fallbackError =
            `> [!WARNING]\n` +
            `> No se pudo conectar con el servicio de IA o no hay una empresa activa seleccionada.\n\n` +
            `Detalle: \`${err?.message || 'Error de conexión'}\``;

          this.updateStreamingMessage(conversationId, assistantMsgId, fallbackError, false, []);
          this.isGenerating.set(false);
          this.saveToStorage();
          subscriber.next({ error: fallbackError });
          subscriber.complete();
        });
    });
  }
}
