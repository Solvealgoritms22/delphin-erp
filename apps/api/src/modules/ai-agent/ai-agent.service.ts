import { Injectable, Logger } from '@nestjs/common';
import { AiToolsService } from './ai-tools.service';
import { ChatRequestDto, ChatResponseDto, ChatMessageDto } from './ai-agent.dto';

export type ChatMessage = ChatMessageDto;

export interface StreamEvent {
  type: 'token' | 'tools' | 'done' | 'error';
  token?: string;
  toolsUsed?: string[];
  conversationId?: string;
  error?: string;
}

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(private readonly tools: AiToolsService) {}

  /**
   * Helper to collect read-only DB context based on user intent
   */
  private async collectContext(
    empresaId: string,
    userQuery: string,
    toolsUsed: string[],
  ): Promise<any> {
    const lowerQuery = userQuery.toLowerCase();
    const dbContext: any = {};

    const needsOverview =
      lowerQuery.includes('resumen') ||
      lowerQuery.includes('empresa') ||
      lowerQuery.includes('metric') ||
      lowerQuery.includes('kpi') ||
      lowerQuery.includes('general') ||
      lowerQuery.includes('overview') ||
      lowerQuery.includes('estado') ||
      lowerQuery.length < 10;

    const needsProducts =
      lowerQuery.includes('producto') ||
      lowerQuery.includes('precio') ||
      lowerQuery.includes('catalogo') ||
      lowerQuery.includes('costo') ||
      lowerQuery.includes('categoria') ||
      lowerQuery.includes('marca') ||
      lowerQuery.includes('inventario') ||
      lowerQuery.includes('item') ||
      lowerQuery.includes('stock');

    const needsClients =
      lowerQuery.includes('cliente') ||
      lowerQuery.includes('comprador') ||
      lowerQuery.includes('contacto') ||
      lowerQuery.includes('customer') ||
      lowerQuery.includes('client');

    const needsSuppliers =
      lowerQuery.includes('proveedor') ||
      lowerQuery.includes('suplidor') ||
      lowerQuery.includes('supplier') ||
      lowerQuery.includes('vendor');

    const needsLogs =
      lowerQuery.includes('log') ||
      lowerQuery.includes('seguridad') ||
      lowerQuery.includes('actividad') ||
      lowerQuery.includes('auditor') ||
      lowerQuery.includes('historial') ||
      lowerQuery.includes('sesion') ||
      lowerQuery.includes('intento');

    const needsTeam =
      lowerQuery.includes('usuario') ||
      lowerQuery.includes('rol') ||
      lowerQuery.includes('miembro') ||
      lowerQuery.includes('equipo') ||
      lowerQuery.includes('acceso') ||
      lowerQuery.includes('permiso');

    const needsBranches =
      lowerQuery.includes('sucursal') ||
      lowerQuery.includes('ubicacion') ||
      lowerQuery.includes('branch') ||
      lowerQuery.includes('tienda');

    try {
      if (needsOverview || (!needsProducts && !needsClients && !needsSuppliers && !needsLogs && !needsTeam && !needsBranches)) {
        toolsUsed.push('getCompanyOverview', 'getExecutiveMetrics');
        dbContext.empresa = await this.tools.getCompanyOverview(empresaId);
        dbContext.metricas = await this.tools.getExecutiveMetrics(empresaId);
      }

      if (needsProducts) {
        toolsUsed.push('queryProducts');
        dbContext.productos = await this.tools.queryProducts(empresaId, { limit: 20 });
      }

      if (needsClients) {
        toolsUsed.push('queryClients');
        dbContext.clientes = await this.tools.queryClients(empresaId, { limit: 20 });
      }

      if (needsSuppliers) {
        toolsUsed.push('querySuppliers');
        dbContext.proveedores = await this.tools.querySuppliers(empresaId, { limit: 20 });
      }

      if (needsLogs) {
        toolsUsed.push('queryActivityLogs');
        dbContext.actividades = await this.tools.queryActivityLogs(empresaId, { limit: 15 });
      }

      if (needsTeam) {
        toolsUsed.push('queryTeamMembers');
        dbContext.miembros = await this.tools.queryTeamMembers(empresaId);
      }

      if (needsBranches) {
        toolsUsed.push('queryBranches');
        dbContext.sucursales = await this.tools.queryBranches(empresaId);
      }
    } catch (err: any) {
      this.logger.error(`Error executing read-only tools: ${err.message}`);
    }

    return dbContext;
  }

  /**
   * Main entry point for non-streaming queries
   */
  async processChat(
    empresaId: string,
    user: { id: string; name?: string; email: string },
    dto: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const userQuery = (dto.message || '').trim();
    const convId = dto.conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const toolsUsed: string[] = [];

    this.logger.log(`[AI-AGENT] Processing query from ${user.email} (empresa: ${empresaId}): "${userQuery}"`);

    const dbContext = await this.collectContext(empresaId, userQuery, toolsUsed);
    let reply = '';

    // Check Ollama
    if (process.env.OLLAMA_BASE_URL || process.env.USE_OLLAMA === 'true') {
      try {
        reply = await this.callOllama(userQuery, dbContext, dto.history || []);
      } catch (err: any) {
        this.logger.debug(`Ollama call bypassed: ${err.message}`);
      }
    }

    // Check configured API Keys
    if (!reply) {
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
      if (apiKey) {
        try {
          reply = await this.callExternalLLM(userQuery, dbContext, dto.history || [], apiKey);
        } catch (err: any) {
          this.logger.warn(`External API call failed (${err.message}). Trying Free Public AI Gateway...`);
        }
      }
    }

    // Free Public AI Gateway
    if (!reply) {
      try {
        reply = await this.callFreePollinationsAI(userQuery, dbContext, dto.history || []);
      } catch (err: any) {
        this.logger.warn(`Free Pollinations AI call failed: ${err.message}`);
      }
    }

    // Fallback: Smart Heuristic ERP Agent Synthesizer
    if (!reply) {
      reply = this.synthesizeSmartResponse(userQuery, dbContext, user.name || user.email);
    }

    return {
      reply,
      conversationId: convId,
      timestamp: new Date().toISOString(),
      toolsUsed,
    };
  }

  /**
   * Real-time Token-by-Token Streaming entry point (SSE)
   */
  async processChatStream(
    empresaId: string,
    user: { id: string; name?: string; email: string },
    dto: ChatRequestDto,
    onChunk: (event: StreamEvent) => void,
  ): Promise<void> {
    const userQuery = (dto.message || '').trim();
    const convId = dto.conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const toolsUsed: string[] = [];

    this.logger.log(`[AI-AGENT-STREAM] Processing stream query from ${user.email} (empresa: ${empresaId}): "${userQuery}"`);

    // 1. Collect read-only DB context
    const dbContext = await this.collectContext(empresaId, userQuery, toolsUsed);
    onChunk({ type: 'tools', toolsUsed, conversationId: convId });

    let streamedSuccessfully = false;

    // 2. Try Ollama streaming
    if (!streamedSuccessfully && (process.env.OLLAMA_BASE_URL || process.env.USE_OLLAMA === 'true')) {
      try {
        await this.streamOllama(userQuery, dbContext, dto.history || [], (token) => {
          onChunk({ type: 'token', token, conversationId: convId });
        });
        streamedSuccessfully = true;
      } catch (err: any) {
        this.logger.debug(`Ollama stream bypassed: ${err.message}`);
      }
    }

    // 3. Try OpenRouter / Groq streaming
    if (!streamedSuccessfully) {
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
      if (apiKey) {
        try {
          await this.streamOpenAICompatible(userQuery, dbContext, dto.history || [], apiKey, (token) => {
            onChunk({ type: 'token', token, conversationId: convId });
          });
          streamedSuccessfully = true;
        } catch (err: any) {
          this.logger.warn(`External LLM streaming failed (${err.message}). Trying public stream fallback...`);
        }
      }
    }

    // 4. Try Pollinations AI or Heuristic Synthesizer with Token-by-Token Typewriter Stream
    if (!streamedSuccessfully) {
      let fullText = '';
      try {
        fullText = await this.callFreePollinationsAI(userQuery, dbContext, dto.history || []);
      } catch {
        fullText = this.synthesizeSmartResponse(userQuery, dbContext, user.name || user.email);
      }

      if (!fullText) {
        fullText = this.synthesizeSmartResponse(userQuery, dbContext, user.name || user.email);
      }

      await this.typewriterStream(fullText, (token) => {
        onChunk({ type: 'token', token, conversationId: convId });
      });
    }

    onChunk({ type: 'done', conversationId: convId, toolsUsed });
  }

  /**
   * Emits text chunk-by-chunk with typewriter cadence for smooth animation
   */
  private async typewriterStream(text: string, emit: (token: string) => void): Promise<void> {
    const tokens = text.match(/(\s+|\S+)/g) || [text];
    for (const token of tokens) {
      emit(token);
      await new Promise((r) => setTimeout(r, 12));
    }
  }

  /**
   * Real streaming for OpenRouter / Groq / OpenAI-compatible APIs
   */
  private async streamOpenAICompatible(
    prompt: string,
    dbContext: any,
    history: ChatMessage[],
    apiKey: string,
    emit: (token: string) => void,
  ): Promise<void> {
    const isGroq = !!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY;
    const endpoint = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';

    const modelName = isGroq
      ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
      : (process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free');

    const systemPrompt = `Eres Dolphin ERP AI, el copiloto inteligente de gestión empresarial de Dolphin ERP.
Tienes acceso directo y de solo lectura a la base de datos de la empresa activa del usuario.

INSTRUCCIONES CLAVE:
1. Responde de manera profesional, estructurada, precisa y enriquecida usando formato Markdown de GitHub.
2. Utiliza tablas Markdown cuando enumeres registros (productos, clientes, proveedores, logs, etc.).
3. Resalta importes monetarios, cantidades y estados con negrita o badges en código (\`ACTIVO\`, \`DOP\`, \`USD\`).
4. Si los datos están vacíos, indícalo amablemente y sugiere cómo crearlos en el sistema.
5. Mantén un tono ejecutivo, analítico y colaborativo.

DATOS ACTUALES DE LA EMPRESA CONSULTADA:
\`\`\`json
${JSON.stringify(dbContext, null, 2)}
\`\`\``;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: prompt },
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://dolphin-erp.com',
        'X-Title': 'Dolphin ERP AI Assistant',
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.3,
        max_tokens: 1500,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Streaming API status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            emit(delta);
          }
        } catch {
          // ignore non-json SSE lines
        }
      }
    }
  }

  /**
   * Real streaming for Ollama local instances
   */
  private async streamOllama(
    prompt: string,
    dbContext: any,
    history: ChatMessage[],
    emit: (token: string) => void,
  ): Promise<void> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';

    const systemPrompt = `Eres Dolphin ERP AI. Responde en Markdown enriquecido con tablas.\nDatos: ${JSON.stringify(dbContext)}`;

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) throw new Error(`Ollama status ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.message?.content) {
            emit(parsed.message.content);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Free Public AI Gateway (Pollinations AI)
   */
  private async callFreePollinationsAI(
    prompt: string,
    dbContext: any,
    history: ChatMessage[],
  ): Promise<string> {
    const systemPrompt = `Eres Dolphin ERP AI, el copiloto inteligente de gestión empresarial de Dolphin ERP.
Tienes acceso directo y de solo lectura a la base de datos de la empresa activa del usuario.

INSTRUCCIONES CLAVE:
1. Responde de manera profesional, concisa, estructurada y enriquecida usando formato Markdown de GitHub.
2. Utiliza tablas Markdown cuando enumeres registros (productos, clientes, proveedores, logs, etc.).
3. Resalta importes monetarios, cantidades y estados con negrita o badges en código (\`ACTIVO\`, \`DOP\`, \`USD\`).
4. Si los datos están vacíos, indícalo amablemente y sugiere cómo crearlos en el sistema.
5. Mantén un tono analítico, ejecutivo y colaborativo.

DATOS ACTUALES DE LA EMPRESA CONSULTADA:
\`\`\`json
${JSON.stringify(dbContext, null, 2)}
\`\`\``;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: prompt },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: 'openai',
          seed: 42,
          jsonMode: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`Pollinations AI returned ${response.status}`);
      }

      const text = await response.text();
      return text.trim();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Calls OpenRouter or standard OpenAI-compatible free models
   */
  private async callExternalLLM(
    prompt: string,
    dbContext: any,
    history: ChatMessage[],
    apiKey: string,
  ): Promise<string> {
    const isGemini = !!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY;
    const isGroq = !!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY;

    const systemPrompt = `Eres Dolphin ERP AI, el copiloto inteligente de gestión empresarial de Dolphin ERP.
Tienes acceso directo y de solo lectura a la base de datos de la empresa activa del usuario.

INSTRUCCIONES CLAVE:
1. Responde de manera profesional, estructurada, precisa y enriquecida usando formato Markdown de GitHub.
2. Utiliza tablas Markdown cuando enumeres registros (productos, clientes, proveedores, logs, etc.).
3. Resalta importes monetarios, cantidades y estados con negrita o badges en código (\`ACTIVO\`, \`DOP\`, \`USD\`).
4. Si los datos están vacíos, indícalo amablemente y sugiere cómo crearlos en el sistema.
5. Mantén un tono ejecutivo, analítico y colaborativo.

DATOS ACTUALES DE LA EMPRESA CONSULTADA:
\`\`\`json
${JSON.stringify(dbContext, null, 2)}
\`\`\``;

    if (isGemini) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nPregunta del usuario: ${prompt}` }] },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    const endpoint = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';

    const modelName = isGroq
      ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
      : (process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free');

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: prompt },
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://dolphin-erp.com',
        'X-Title': 'Dolphin ERP AI Assistant',
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`External LLM API returned status ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Calls Ollama locally (non-streaming fallback)
   */
  private async callOllama(
    prompt: string,
    dbContext: any,
    history: ChatMessage[],
  ): Promise<string> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';

    const systemPrompt = `Eres Dolphin ERP AI. Responde en Markdown enriquecido con tablas.\nDatos: ${JSON.stringify(dbContext)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-4).map((h) => ({ role: h.role, content: h.content })),
            { role: 'user', content: prompt },
          ],
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Ollama status ${response.status}`);
      const data = await response.json();
      return data.message?.content || '';
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Smart Built-in Synthesizer that formats real database results into rich Markdown
   */
  private synthesizeSmartResponse(query: string, data: any, userName: string): string {
    const q = query.toLowerCase();

    // 1. Productos
    if (data.productos) {
      const list = data.productos.productos || [];
      if (list.length === 0) {
        return `### 📦 Catálogo de Productos\n\n> [!NOTE]\n> Actualmente **no hay productos registrados** en esta empresa. Puedes agregar nuevos productos desde el módulo de [Catálogos > Productos](/admin/catalogs/products).\n\n¿Deseas que te ayude con información sobre cómo importar o categorizar tus productos?`;
      }

      let table = `### 📦 Catálogo de Productos (${data.productos.totalEncontrados} registros encontrados)\n\n`;
      table += `Aquí tienes el detalle de los productos registrados en la base de datos:\n\n`;
      table += `| Código | Nombre del Producto | Categoría | Marca | Precio Venta | Costo | Estado |\n`;
      table += `| :--- | :--- | :--- | :--- | :---: | :---: | :---: |\n`;
      for (const p of list) {
        table += `| \`${p.codigo}\` | **${p.nombre}** | ${p.categoria} | ${p.marca} | $${Number(p.precioVenta || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} | $${Number(p.costo || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} | \`${p.estado}\` |\n`;
      }
      table += `\n> [!TIP]\n> Puedes gestionar precios, fotos y códigos de barra directamente en el módulo de [Productos](/admin/catalogs/products).`;
      return table;
    }

    // 2. Clientes
    if (data.clientes) {
      const list = data.clientes.clientes || [];
      if (list.length === 0) {
        return `### 👥 Directorio de Clientes\n\n> [!NOTE]\n> No se encontraron clientes registrados en esta empresa. Puedes crear uno nuevo desde [Comercial > Clientes](/admin/commercial/clients).`;
      }

      let table = `### 👥 Directorio de Clientes (${data.clientes.totalEncontrados} registros)\n\n`;
      table += `Listado de clientes registrados en el sistema:\n\n`;
      table += `| Nombre o Razón Social | Documento | Correo Electrónico | Teléfono | País | Estado |\n`;
      table += `| :--- | :--- | :--- | :--- | :---: | :---: |\n`;
      for (const c of list) {
        table += `| **${c.nombre}** | \`${c.documento}\` | ${c.email} | ${c.telefono} | ${c.pais} | \`${c.estado}\` |\n`;
      }
      return table;
    }

    // 3. Proveedores
    if (data.proveedores) {
      const list = data.proveedores.proveedores || [];
      if (list.length === 0) {
        return `### 🏭 Directorio de Proveedores\n\n> [!NOTE]\n> No hay proveedores registrados en la empresa activa. Puedes añadirlos en [Comercial > Proveedores](/admin/commercial/suppliers).`;
      }

      let table = `### 🏭 Directorio de Proveedores (${data.proveedores.totalEncontrados} registros)\n\n`;
      table += `| Nombre / Proveedor | Documento | Correo | Teléfono | Dirección | Estado |\n`;
      table += `| :--- | :--- | :--- | :--- | :--- | :---: |\n`;
      for (const p of list) {
        table += `| **${p.nombre}** | \`${p.documento}\` | ${p.email} | ${p.telefono} | ${p.direccion} | \`${p.estado}\` |\n`;
      }
      return table;
    }

    // 4. Actividades y Auditoría
    if (data.actividades) {
      const list = data.actividades.logs || [];
      if (list.length === 0) {
        return `### 📋 Registros de Auditoría y Actividad\n\nNo se han registrado eventos de auditoría recientes en esta empresa.`;
      }

      let table = `### 📋 Registro de Actividades Recientes (${list.length} eventos)\n\n`;
      table += `| Fecha y Hora | Módulo | Acción | Recurso Afectado | Usuario |\n`;
      table += `| :--- | :---: | :---: | :--- | :--- |\n`;
      for (const l of list) {
        const d = new Date(l.fecha).toLocaleString();
        table += `| ${d} | \`${l.modulo}\` | **${l.accion}** | ${l.recurso} | ${l.usuario} |\n`;
      }
      return table;
    }

    // 5. Miembros y Usuarios
    if (data.miembros) {
      const list = data.miembros.miembros || [];
      let table = `### 👤 Equipo y Miembros de la Empresa (${list.length} miembros)\n\n`;
      table += `| Nombre | Correo Electrónico | Rol Asignado | Estado | Último Acceso |\n`;
      table += `| :--- | :--- | :--- | :---: | :--- |\n`;
      for (const m of list) {
        table += `| **${m.nombre}** | ${m.email} | \`${m.rol}\` | \`${m.estado}\` | ${m.ultimoAcceso !== 'Nunca' ? new Date(m.ultimoAcceso).toLocaleDateString() : 'Nunca'} |\n`;
      }
      return table;
    }

    // 6. Sucursales
    if (data.sucursales) {
      const list = data.sucursales.sucursales || [];
      let table = `### 🏢 Sucursales y Ubicaciones (${list.length} registradas)\n\n`;
      table += `| Nombre de Sucursal | Ciudad / Ubicación | Teléfono | Estado |\n`;
      table += `| :--- | :--- | :--- | :---: |\n`;
      for (const s of list) {
        table += `| **${s.nombre}** | ${s.ciudad || s.direccion || 'Principal'} | ${s.telefono || 'N/A'} | \`${s.estado}\` |\n`;
      }
      return table;
    }

    // 7. Resumen Ejecutivo / Overview por defecto
    const emp = data.empresa || {};
    const met = data.metricas?.metricasGenerales || {};
    const categorias = data.metricas?.distribucionCategorias || [];

    let overview = `## 👋 Hola ${userName}, aquí tienes el resumen operativo de tu empresa\n\n`;
    overview += `### 🏢 **${emp.razonSocial || 'Mi Empresa'}**\n`;
    if (emp.rnc) overview += `- **RNC / Identificación:** \`${emp.rnc}\`\n`;
    overview += `- **Plan de Suscripción:** \`${emp.plan || 'Free Trial'}\` (\`${emp.planEstado || 'ACTIVE'}\`)\n`;
    overview += `- **País / Estado:** ${emp.pais || 'DO'} / \`${emp.estado || 'ACTIVA'}\`\n\n`;

    overview += `### 📊 Métricas Clave en Base de Datos:\n\n`;
    overview += `| Módulo | Registros Activos | Estado de Operación |\n`;
    overview += `| :--- | :---: | :--- |\n`;
    overview += `| 📦 **Productos y Servicios** | **${met.totalProductos ?? 0}** | Catálogo disponible |\n`;
    overview += `| 👥 **Clientes Comerciales** | **${met.totalClientes ?? 0}** | Cartera de clientes |\n`;
    overview += `| 🏭 **Proveedores** | **${met.totalProveedores ?? 0}** | Cadena de suministro |\n`;
    overview += `| 👤 **Usuarios y Miembros** | **${met.totalUsuarios ?? 0}** | Accesos con permisos |\n`;
    overview += `| 🏢 **Sucursales** | **${emp.resumenConteos?.totalSucursales ?? 1}** | Puntos de operación |\n\n`;

    if (categorias.length > 0) {
      overview += `#### 🏷️ Distribución por Categorías:\n`;
      for (const c of categorias) {
        overview += `- **${c.categoria}**: ${c.productos} producto(s)\n`;
      }
      overview += `\n`;
    }

    overview += `> [!TIP]\n> Puedes preguntarme sobre detalles específicos como: *"Muéstrame la lista de productos"*, *"¿Qué clientes tenemos registrados?"* o *"Ver últimos movimientos de auditoría"*.\n`;

    return overview;
  }
}
