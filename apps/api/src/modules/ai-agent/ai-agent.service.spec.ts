import { AiAgentService } from './ai-agent.service';
describe('AI domain authorization', () => {
  const queries = [
    'ventas',
    'cotizaciones',
    'compras',
    'cuentas por cobrar',
    'inventario',
    'promociones',
    'secuencias',
    'productos',
    'clientes',
    'proveedores',
    'logs',
    'usuarios',
    'sucursales',
    'resumen',
  ];
  function setup(permissions: string[], owner = false) {
    const tools = new Proxy(
      {},
      {
        get: (_target, key) =>
          jest.fn().mockImplementation(() => Promise.resolve({ tool: key })),
      },
    );
    const db = {
      empresa: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ propietarioId: owner ? 'actor' : 'owner' }),
      },
      membresia: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'ACTIVO',
          role: { permissions: JSON.stringify(permissions) },
        }),
      },
    };
    return new AiAgentService(tools as any, db as any);
  }
  it.each(queries)(
    'does not collect unauthorized context for %s',
    async (query) => {
      const used: string[] = [];
      const result = await (setup(['ai_chat:write']) as any).collectContext(
        'tenant',
        query,
        used,
        'actor',
      );
      expect(result).toEqual({});
      expect(used).toEqual([]);
    },
  );
  it.each(queries)('allows the active owner context for %s', async (query) => {
    const used: string[] = [];
    await (setup([], true) as any).collectContext(
      'tenant',
      query,
      used,
      'actor',
    );
    expect(used.length).toBeGreaterThan(0);
  });

  it('does not substitute commercial permission for invoice permission', async () => {
    const used: string[] = [];
    expect(await (setup(['ai_chat:write', 'commercial:read']) as any).collectContext('tenant', 'ventas', used, 'actor')).toEqual({});
    expect(used).toEqual([]);
  });
  it('never invokes public fallback when disabled in streaming', async () => {
    const env = { ...process.env };
    try {
      for (const key of ['OLLAMA_BASE_URL', 'USE_OLLAMA', 'OPENROUTER_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY']) delete process.env[key];
      process.env.AI_PUBLIC_FALLBACK_ENABLED = 'false';
      const service = setup([], true) as any;
      service.ensureConversation = jest.fn().mockResolvedValue('conv');
      service.saveMessage = jest.fn();
      service.collectContext = jest.fn().mockResolvedValue({});
      service.callFreePollinationsAI = jest.fn();
      service.typewriterStream = jest.fn();
      await service.processChatStream('tenant', { id: 'actor', email: 'test@example.invalid' }, { message: 'Hola' }, jest.fn());
      expect(service.callFreePollinationsAI).not.toHaveBeenCalled();
    } finally { process.env = env; }
  });
});
