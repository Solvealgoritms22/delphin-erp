import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Conversation, Message } from './model';
import { environment } from '@/environments/environment';

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private readonly apiUrl = `${environment.apiUrl}/ai`;
  private readonly storageKey = 'dolphin_ai_conversations';

  readonly conversations = signal<Conversation[]>([]);
  readonly activeConversationId = signal<string>('');
  readonly isGenerating = signal<boolean>(false);

  readonly currentConversation = computed(() => {
    const list = this.conversations();
    const activeId = this.activeConversationId();
    return list.find((c) => c.id === activeId) || list[0] || null;
  });

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load conversations from localStorage or initialize with a welcome conversation
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

    this.conversations.set([defaultConv]);
    this.activeConversationId.set(defaultConv.id);
    this.saveToStorage();
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
   * Create a new conversation thread
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
    return newConv;
  }

  /**
   * Select active conversation
   */
  selectConversation(id: string): void {
    this.activeConversationId.set(id);
  }

  /**
   * Rename conversation title
   */
  renameConversation(id: string, newTitle: string): void {
    this.conversations.update((list) =>
      list.map((c) => (c.id === id ? { ...c, title: newTitle.trim() || c.title } : c)),
    );
    this.saveToStorage();
  }

  /**
   * Delete conversation
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
  }

  /**
   * Send a message in a conversation thread and process AI response
   */
  sendMessage(conversationId: string, text: string): Observable<any> {
    const trimmed = text.trim();
    if (!trimmed) return of(null);

    const userMsgId = `user_${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
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

    // Add user message & placeholder to state
    this.conversations.update((list) =>
      list.map((conv) => {
        if (conv.id === conversationId) {
          // Update title if it's the first user message in a new chat
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

    // Build history for context
    const current = this.conversations().find((c) => c.id === conversationId);
    const history = (current?.messages || [])
      .filter((m) => !m.streaming && m.id !== assistantMsgId)
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));

    return this.http
      .post<{ reply: string; conversationId: string; toolsUsed: string[] }>(
        `${this.apiUrl}/chat`,
        {
          message: trimmed,
          conversationId,
          history,
        },
      )
      .pipe(
        tap((res) => {
          this.conversations.update((list) =>
            list.map((conv) => {
              if (conv.id === conversationId) {
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: res.reply,
                          streaming: false,
                          toolsUsed: res.toolsUsed,
                        }
                      : m,
                  ),
                };
              }
              return conv;
            }),
          );
          this.isGenerating.set(false);
          this.saveToStorage();
        }),
        catchError((err) => {
          const fallbackError =
            `> [!WARNING]\n` +
            `> No se pudo conectar con el servicio de IA o no hay una empresa activa seleccionada.\n\n` +
            `Detalle: \`${err?.error?.message || err?.message || 'Error de conexión'}\``;

          this.conversations.update((list) =>
            list.map((conv) => {
              if (conv.id === conversationId) {
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: fallbackError,
                          streaming: false,
                        }
                      : m,
                  ),
                };
              }
              return conv;
            }),
          );
          this.isGenerating.set(false);
          this.saveToStorage();
          return of(null);
        }),
      );
  }
}
