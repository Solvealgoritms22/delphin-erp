import { AiAgentService } from './ai-agent.service';
describe('AI domain authorization', () => {
 const queries = ['ventas', 'cotizaciones', 'compras', 'cuentas por cobrar', 'inventario', 'promociones', 'secuencias', 'productos', 'clientes', 'proveedores', 'logs', 'usuarios', 'sucursales', 'resumen'];
 function setup(permissions: string[], owner=false) {
 const tools = new Proxy({}, {get:(_target,key)=> jest.fn().mockImplementation(()=>Promise.resolve({tool:key}))});
 const db={empresa:{findUnique:jest.fn().mockResolvedValue({propietarioId:owner?'actor':'owner'})},membresia:{findUnique:jest.fn().mockResolvedValue({estado:'ACTIVO',role:{permissions:JSON.stringify(permissions)}})}};
 return new AiAgentService(tools as any,db as any);
 }
 it.each(queries)('does not collect unauthorized context for %s',async query=>{
 const used:string[]=[];const result=await (setup(['ai_chat:write']) as any).collectContext('tenant',query,used,'actor');expect(result).toEqual({});expect(used).toEqual([]);
 });
 it.each(queries)('allows the active owner context for %s',async query=>{
 const used:string[]=[];await (setup([],true) as any).collectContext('tenant',query,used,'actor');expect(used.length).toBeGreaterThan(0);
 });
});
