# Auditoría de producción — seguimiento al 11 de septiembre de 2026

## Dictamen

Auditoría EN CURSO. No es una certificación fiscal ni una autorización para
producción. La compilación y las pruebas unitarias no sustituyen pruebas
integrales, conciliación bancaria, certificación DGII ni revisión de datos reales.
No se ejecutaron cobros, emisiones fiscales ni migraciones sobre datos reales.
Se preservó el cambio previo del usuario en billing-app/billing.ts.

## Correcciones de esta entrega

| Severidad | Problema y ubicación | Impacto | Cambio / validación |
|---|---|---|---|
| CRÍTICO | invoices.service.ts: descuento global aplicado después del ITBIS | Impuesto y total superiores a los debidos | Prorrateo sobre bases netas y recálculo de impuesto por línea; pruebas de tasas mixtas, descuento completo y residuo de un centavo |
| CRÍTICO | Emisión: validación del payload después del commit | Factura e inventario confirmados con datos fiscales inválidos | Validación local dentro de la transacción de creación/emisión, antes del outbox; falta prueba integral de rollback |
| ALTO | Factura sin snapshot de vencimiento NCF | Información fiscal histórica dependiente de configuración mutable | Campo nullable y migración aditiva; reserva devuelve vencimiento; sin backfill inventado |
| ALTO | invoices.service.ts: include empresa completo al crear | Posible exposición de secretos empresariales | Proyección explícita de datos comerciales públicos |
| ALTO | Venta a crédito sin cliente | Cuenta por cobrar sin deudor identificado | Rechazo al crear; falta completar validación de borradores históricos |
| ALTO | entitlement.guard.ts: trial ignora cuotas y plan ausente recibe fallback | Recursos sin suscripción válida y cuotas omitidas | Respeta cuotas configuradas; rechaza suscripción/plan ausente, límites inválidos y recursos desconocidos |
| ALTO | Creación de productos/sucursales sin guard de cuotas | Bypass de las cuotas publicadas | Guards backend y prueba de metadata en las tres rutas de creación |
| CRÍTICO | Azul permite MOCK con NODE_ENV=production | Activación pagada sin cobro real | Rechazo explícito de MOCK/sandbox/configuración incompleta en producción; cambio de plan pasa siempre por el servicio |
| CRÍTICO | credit-notes.service.ts: cálculo sin descuentos, líneas repetidas y NCF fuera de tx | Sobrecrédito y numeración perdida | Agregación de líneas por detalle, lock pesimista FOR UPDATE, recálculo proporcional desde snapshot, NCF y correlativo dentro de transacción, regla DGII 30 días y tests unitarios en credit-notes.service.spec.ts |
| CRÍTICO | Notas de crédito sobre facturas saldadas | Pasivo frente al cliente sin registro contable | Registro explícito de saldo a favor generado en trazabilidad y metadata contable |
| ALTO | CONTADO marca montoPagado sin recibo asociado | Conciliación de caja incompleta | Generación atómica de PagoCliente (REC-XXXXXX) y AplicacionPago al crear y emitir facturas de contado con cliente identificado |
| ALTO | Cambio al plan trial puede marcarlo ACTIVE | Trial convertido en acceso pagado sin cobro | Rechazo de trial y tarifas no positivas en cambio de plan |
| MEDIO | Log de tokenización contiene parte del token | Exposición innecesaria de material de pago | Eliminado fragmento del token del log de éxito |
| MEDIO | Tests de usuarios/empresas desfasados respecto a contratos actuales | Falsos negativos | Contratos de actor/sesión y separación propietario/colaborador comprobados |

## Decisiones

- Catálogo de planes en USD, confirmado por el propietario del proyecto.
- No se interpreta automáticamente USD como DOP ni se inventa un tipo de cambio.
- Mitigación inmediata: cambios de plan y renovaciones reales se bloquean salvo
  configuración explícita AZUL_MERCHANT_CURRENCY=USD. Configurar esta variable
  solamente tras confirmar la afiliación USD con Azul; no habilita USD en el banco.
  Comercios DOP permanecen bloqueados hasta implementar cotizaciones de cambio.
- La moneda del comercio Azul debe confirmarse con la afiliación/MID y el contrato
  de integración correspondiente. El soporte USD de otra modalidad no autoriza a
  añadir un campo Currency no documentado a ProcessPayment.
- La RI electrónica debe provenir de FiscalBridge; ERP autoriza y entrega el PDF.
  No se declara completado el versionado ni el rediseño visual de ese motor.
- Se conservan las cuotas existentes; no se redefinen comercialmente los planes.
- Los documentos históricos sin snapshot requieren conciliación documental;
  no deben regenerarse usando una fecha deducida de la secuencia actual.

## Evidencia de validación

- Suite completa de pruebas de NestJS: 49 suites, 272 pruebas OK (incluyendo credit-notes.service.spec.ts).
- Compilación de aplicación Angular Desktop completada con 0 errores.
- Flujo de autenticación con Google OAuth2 verificado de extremo a extremo (API + Desktop con PKCE y navegador del sistema).
- git diff --check sin errores.
- Pruebas focalizadas fiscales/usuarios/guard/notas de crédito: 100% OK.

## Hallazgos abiertos priorizados

| Prioridad | Ubicación / problema | Impacto | Trabajo requerido |
|---|---|---|---|
| CRÍTICO | payments.controller.ts / billing-cron.service.ts: tarifa USD enviada sin conversión; annual usa precioAnual directamente | Cobro de moneda o importe incorrecto | Confirmar moneda del MID, semántica anual e impuestos; cotización inmutable y aceptación antes del cargo |
| ALTO | Verificación de tarjeta guarda token antes de conciliación del void; vencimiento de respaldo fijo | Resultado ambiguo y datos inventados | Flujo de tokenización/conciliación con datos reales y sin fallback |
| ALTO | Guard de cuotas separado del commit; reactivaciones, invitaciones y APIs alternativas | Exceso por concurrencia o rutas indirectas | Política compartida y reserva atómica dentro de servicios; tests PostgreSQL |
| ALTO | ACTIVE vencida, cambios de plan bajo uso superior a cuota, catálogo duplicado | Derechos divergentes y cobros incoherentes | Política explícita de gracia/downgrade y catálogo único |
| ALTO | fiscal-payload.ts bloquea moneda extranjera y flujos especializados | Funcionalidad fiscal incompleta | DOP/OtraMoneda documentado, matriz e-CF y pruebas contra FiscalBridge |
| ALTO | Conciliación bancaria y reintentos UNKNOWN | Bloqueo pendiente de resolución tras timeout | Consulta del resultado remoto, historial y resolución autorizada |
| ALTO | Clave de prueba Stripe visible en argumentos de un proceso local | Secreto expuesto en diagnóstico | Rotar clave y retirar secretos de argumentos; no se reproduce ni se utiliza |
| MEDIO | Calidad/performance: N+1 al calcular productos, listados sin paginación, logs asíncronos no manejados | Latencia, consumo de memoria, errores de auditoría | Medir, agrupar consultas, paginar y persistir auditoría de manera controlada |

## Cobertura pendiente por módulo

Facturación y secuencias: revisión parcial con correcciones; notas de crédito,
pagos de clientes, compras y pagos de proveedores: cerrar integridad y concurrencia.
Planes/pagos: revisión parcial, reglas comerciales pendientes.
Usuarios, roles, autenticación, sesiones y 2FA: conservar correcciones previas;
falta matriz exhaustiva de endpoints y pruebas negativas de autorización.
Productos, sucursales e inventario: cubrir rutas indirectas y concurrencia.
Clientes, proveedores, categorías, marcas, unidades, promociones, cotizaciones,
reportes, dashboard, API pública, agente IA, notificaciones, backups y configuración:
no se declaran auditados integralmente por esta entrega.
UI y PDF: falta verificación visual y de recorridos completos.

## Fuentes primarias

- [Documentación técnica de Azul](https://dev.azul.com.do/Pages/developer/pages/documents/index.aspx),
  consultada el 11-09-2026. El manual enlazado describe Amount con impuestos
  incluidos y decimales implícitos; ITBIS no se agrega nuevamente al cargo.
- [Recurrencias oficiales Azul](https://pruebas.azul.com.do/WebServices/SOAP/Default.asmx?op=RecurringSubscriptionCreate):
  el contrato enumera DOP y USD; no prueba la moneda habilitada en nuestro MID.
- [DCC de Azul](https://www.azul.com.do/Pages/es/dcc.aspx):
  modalidad de conversión ofrecida al tarjetahabiente, distinta de nuestra
  conversión de catálogo.
- [DGII: marco legal de e-CF](https://www.dgii.gov.do/cicloContribuyente/facturacion/comprobantesFiscalesElectronicosE-CF/Paginas/marcoLegal.aspx).
  La matriz de campos del formato e-CF y los escenarios de certificación deben
  seguir contrastándose antes de declarar cumplimiento.
