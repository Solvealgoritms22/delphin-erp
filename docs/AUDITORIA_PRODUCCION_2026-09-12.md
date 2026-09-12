# Auditoría general de preparación para producción — 12 de septiembre de 2026

## Veredicto ejecutivo

**NO APTO para lanzar la primera versión a producción con operaciones reales.**

El proyecto tiene una base funcional considerable: separación Angular/NestJS/Prisma, permisos en servidor, sesiones revocables, MFA, aislamiento tenant, restricciones SQL, outbox fiscal y notificaciones. Sin embargo, hay defectos reproducidos de integridad comercial y bloqueos de instalación y despliegue. Compilar y pasar pruebas unitarias no resuelve esos bloqueos.

Se revisaron los **25 módulos backend**, sus controladores, servicios y dependencias principales, las capas transversales y la organización del frontend. La revisión combina inspección estática dirigida, inventario de endpoints, compilaciones, pruebas y reproducciones sintéticas. **No significa que se haya ejecutado cada endpoint, cada pantalla o cada combinación de permisos.** Los módulos sin validación integral se identifican como condicionados, nunca como aprobados por ausencia de errores.

La auditoría del 11 de septiembre se usó como antecedente, pero sus resultados no se trasladaron como evidencia actual. Este informe corresponde al código local revisado y a las modificaciones del actualizador descritas abajo. No se desplegó, publicó un release, cobró una tarjeta ni transmitió documentos fiscales reales.

## Evidencia de ejecución

| Verificación | Resultado actual | Interpretación |
|---|---|---|
| Build API | PASS | Compila; no garantiza arranque del artefacto |
| Build Angular de producción | PASS final después del ajuste de accesibilidad | Aplicación compilable |
| Pruebas API con cobertura | **52 suites / 323 pruebas pasan**, comando falla | Statements 33,72%, líneas 33,66%, funciones 33,46%: debajo del 35% configurado; ramas 26,42% |
| Lint API sin autofix | **1.732 errores y 437 advertencias** | 1.705 errores se clasifican como autocorregibles; separar formato de problemas semánticos |
| Pruebas Desktop | **5 archivos / 12 pruebas pasan** | Cuatro pruebas existentes y ocho regresiones nuevas del actualizador |
| Lint de los seis archivos TypeScript del actualizador | **PASS final, sin errores ni advertencias** | Verificación acotada a los cambios |
| Lint Desktop | **3 errores y 21 advertencias** | Errores en POS y menú de perfil, fuera del actualizador |
| Migraciones en PostgreSQL 16 vacío | PASS | Se aplican, pero el resultado no coincide completamente con Prisma |
| E2E en esa base aislada | **2 suites fallan; 6 pruebas fallan** | Suite de app no carga ESM; seis casos MFA fallan por columna ausente |
| npm audit --omit=dev | **13 paquetes: 8 high, 5 moderate, 0 critical** | Incluye propagación transitiva; no son 13 vulnerabilidades independientes ni 13 explotaciones demostradas |
| Reproducciones de negocio en memoria | **5 defectos confirmados** | Ejecutan los servicios compilados con dobles de Prisma; no sustituyen concurrencia real PostgreSQL |
| Actualizador: verificación visual | **11 comprobaciones pasan** | Componentes Angular reales, puente Electron simulado; claro/oscuro, ES/EN y móvil |
| Instalador firmado, actualización real y recuperación | No ejecutados | Pendientes para aprobar distribución |
| Restauración de backup completa, carga y pruebas de usuario | No ejecutadas | Pendientes para aprobar operación |

Evidencia detallada en [audit-2026-09-12](audit-2026-09-12/). Los porcentajes por módulo se calculan desde los archivos incluidos por Jest, que tiene exclusiones; 100% de statements **no equivale a cobertura funcional integral**.

## Hallazgos que bloquean o condicionan el lanzamiento

### F01 — P1: recibo de cliente y aplicaciones pueden representar importes diferentes

**Fuente:** `apps/api/src/modules/customer-payments/customer-payments.service.ts`, método `create`, y DTO de cobro.

El servicio acepta `monto` independiente de la suma de aplicaciones. Se reprodujo un recibo de **1** que descuenta **100** del saldo de una factura. También falta una política comprobada de compatibilidad de monedas: la moneda del recibo y tasa no se contrastan con las facturas en la selección utilizada para validar el saldo.

**Cierre:** igualdad monetaria exacta o anticipo explícitamente contabilizado, validación de monedas y redondeo, control atómico de saldo y pruebas negativas. Las aplicaciones repetidas encuentran una restricción única en SQL: no se afirma que puedan persistirse duplicadas.

### F02 — P1: pagos y anulaciones de compras no protegen el estado concurrente

**Fuente:** `apps/api/src/modules/purchases/purchases.service.ts`, `registerPayment` y `cancel`.

Se lee y valida la compra antes de la transacción y luego se escriben valores absolutos calculados desde esa lectura. Dos pagos de 80 contra saldo 100 producen, en la reproducción concurrente en memoria, registros por **160** mientras la factura queda con pagado **80** y saldo **20**. Hay que confirmar el intercalado real con PostgreSQL, pero el patrón de actualización perdida está presente.

La anulación también valida el estado fuera de la transacción y no presenta una conciliación explícita de pagos ya realizados. El constraint SQL de stock no negativo limita algunos daños: puede rechazar una anulación, pero no sustituye su regla contable ni la protección contra doble ejecución.

**Cierre:** bloqueo o actualización condicional con estado/saldo dentro de la transacción, idempotencia, conciliación de pagos y prueba de pago/pago, pago/anulación y anulación/anulación.

### F03 — P1: convertir cotización evita el flujo normal de emisión

**Fuente:** `apps/api/src/modules/quotes/quotes.service.ts:721`, `convertToInvoice`.

Crea directamente `FacturaVenta` con estado `EMITIDA`, pago `CREDITO` y correlativo calculado desde la última factura. No utiliza el servicio de emisión, no reserva NCF ni registra salida de inventario/outbox en esa operación. Se reprodujo una factura emitida, sin cliente y sin NCF. La cotización se consulta antes de la transacción, lo que añade riesgo de conversión concurrente.

**Cierre:** convertir a borrador mediante la lógica compartida o emitir por el mismo servicio y reglas que ventas/POS; reclamar cotización atómicamente y usar contador común.

### F04 — P1: reportes de ventas suman documentos y monedas incompatibles

**Fuente:** `apps/api/src/modules/reports/reports.service.ts:79`, `getSalesReport`; patrones similares en reportes de productos y clientes.

Filtra solo `estado != ANULADA`, incluyendo borradores. Acumula totales positivos sin distinguir notas de crédito, que se guardan también en `FacturaVenta`. Aunque selecciona moneda, no la utiliza al agregar. La reproducción entrega **180** al sumar una venta DOP de 100, un borrador de 50, una fila positiva representando una nota de crédito de 20 y otra venta USD de 10.

**Cierre:** conjunto explícito de estados/documentos computables, signo de notas, separación o conversión con snapshot de moneda, fechas y zona horaria consistentes; conciliación contra documentos fuente. No presentar métodos de pago de facturas a crédito como evidencia de efectivo recibido.

### F05 — P1: API Enterprise sigue autorizando suscripciones canceladas

**Fuente:** `apps/api/src/modules/tenant-api/guards/tenant-api-key.guard.ts` y `tenant-api-key.service.ts`.

Se comprueba el ID del plan Enterprise, pero no el estado ni vencimiento de la suscripción. La reproducción acepta una clave activa de una empresa activa cuya suscripción está `CANCELED`.

**Cierre:** resolver derechos en una política compartida que evalúe plan, estado y vigencia tanto al generar como al usar claves. Los orígenes configurados tampoco deben presentarse como restricción de red: un cliente servidor puede omitir o construir sus encabezados.

### F06 — P0: instalación nueva queda con esquema incompleto

**Fuente:** `apps/api/prisma/schema.prisma`, migraciones y `test/mfa.e2e-spec.ts:32`.

Se aplicaron todas las migraciones a una base nueva creada exclusivamente para la auditoría. Al crear un usuario, Prisma falla porque **`usuarios.oficio` no existe**. El diff identifica también `documento_identidad` y `telefono` como columnas pendientes del modelo de usuario.

**Cierre:** migraciones aditivas revisadas y pruebas desde una base vacía y desde una copia de staging. **El archivo schema-drift.sql es diagnóstico, no una migración a ejecutar:** incluye eliminación de FKs/índices tenant creados deliberadamente por SQL y no representados de la misma manera en Prisma.

### F07 — P0: el comando de producción apunta a un archivo inexistente

**Fuente:** `apps/api/package.json`, `apps/api/Dockerfile`, `tsconfig.build.json`.

El build actual genera **`dist/src/main.js`**. `start:prod` y el CMD del contenedor buscan **`dist/main`**. Se comprobó que `dist/main.js` no existe tras la compilación.

**Cierre:** unificar salida de compilación y entrypoint; construir imagen y arrancarla con el CMD real, exigir healthcheck. Revisar además la distribución de dependencias hoisted en el Dockerfile y alinear Node: Docker usa 20, workflow API 22 y CI general 24. Estos últimos son riesgos de coherencia de entorno, no un fallo de imagen reproducido aquí.

### F08 — P1: el asistente IA no aplica permisos por dominio consultado

**Fuente:** `apps/api/src/modules/ai-agent/ai-agent.controller.ts`, `ai-agent.service.ts:32`, `ai-tools.service.ts`.

Los endpoints exigen permisos de chat, pero `collectContext` recibe empresa y consulta, sin permisos del actor. Puede obtener ventas, compras, cuentas por cobrar, equipo y logs según palabras de la pregunta. El filtrado por empresa evita mezclar tenants en esas consultas, pero no impide que un colaborador con chat consulte datos de otro módulo de su empresa que no tiene permitido leer por su endpoint normal.

**Cierre:** autorizar cada herramienta según el usuario y su permiso de dominio; limitar datos enviados al proveedor IA; pruebas negativas chat permitido/dominio denegado. Hallazgo estático del flujo, no prueba de fuga entre empresas.

### F09 — P1: cuotas y suscripciones tienen reglas divergentes

**Fuente:** `common/guards/entitlement.guard.ts`, controladores de creación, `empresas.service.ts`, `payments.controller.ts`.

El guard cuenta recursos antes de la creación y fuera de su transacción. Reactivaciones y rutas indirectas no comparten una reserva atómica. Una suscripción ACTIVE no recibe la misma comprobación de vencimiento que TRIAL. Catálogo comercial, métricas de uso y límites no son una sola fuente de verdad.

**Cierre:** política de derechos compartida y cuota atómica en servicios; pruebas de concurrencia, invitación, reactivación y downgrade. Conservar las cuotas comerciales existentes hasta definir sus cambios expresamente.

### F10 — P1: cobros de suscripción aún requieren cierre de conciliación y tarifa

**Fuente:** `payments.controller.ts`, `billing-cron.service.ts`, `billing-attempts.service.ts`, `billing-currency.ts`.

Se conserva el bloqueo de cobros reales cuando no está declarada la afiliación USD; no se considera resuelto el contrato comercial por existir la variable. La tokenización guarda la tarjeta antes de resolver el void y mantiene vencimiento de respaldo `202812`. Si no hay order ID, el código no ejecuta el void. Los intentos UNKNOWN necesitan resolución operativa.

El catálogo presenta precios anuales 17/44/107 frente a mensuales 19/49/119, y las rutas cobran `precioAnual` directamente mientras renuevan un año. La semántica mensual equivalente frente a total anual y el tratamiento de impuestos deben quedar explícitos antes de habilitar cargos.

**Cierre:** tarifa/ciclo/moneda/impuestos aceptados y persistidos, no fechas inventadas, estado de verificación separado y conciliación de resultados ambiguos con evidencia del proveedor.

### F11 — P1: compras necesitan completar consistencia de descuentos y valoración

**Fuente:** `purchases.service.ts`, `create`.

El impuesto de líneas se calcula antes del descuento global, que se resta después; totales de cabecera y líneas no distribuyen ese descuento. El costo promedio se calcula a partir de una lectura de stock sin bloqueo explícito y luego se escribe como valor absoluto; el incremento de cantidad por sí solo no protege la valoración bajo concurrencia.

**Cierre:** política documentada de descuentos/retenciones, bases y líneas reconciliables, límites de descuento y costo promedio protegido; pruebas contables con tasas mixtas y compras simultáneas.

### F12 — P1: gates de calidad y dependencias no están en verde

**Fuente:** logs de cobertura/lint/E2E y `audit-dependencies.json`.

La suite E2E de aplicación falla importando ESM de `htmlparser2` a través de `sanitize-html`; la configuración de transformación no está alineada con la suite unitaria. Los módulos de cobros, compras, cotizaciones, reportes, inventario, promociones, IA y API pública tienen 0% de statements en esta ejecución de cobertura.

npm informa paquetes afectados como Multer, js-yaml, SVGO, qs y Angular. Parte de los avisos Angular corresponde a SSR, que está desactivado en el build desktop; hay que evaluar alcanzabilidad, no declarar explotación automáticamente. No ejecutar `npm audit fix --force` a ciegas: el informe propone incluso downgrades mayores de Nest para algunas cadenas.

**Cierre:** actualizar dependencias compatibles, justificar excepciones no alcanzables, pruebas reales de flujos críticos y gates obligatorios antes de release.

### F13 — P1: auditoría posterior al commit puede convertir éxito en error

**Fuente:** `activity-log.service.ts`, servicios de clientes/proveedores/cobros/compras y cotizaciones.

`ActivityLogService.log` registra y vuelve a lanzar errores. Varias mutaciones invocan auditoría o notificación después de confirmar los datos. Una falla posterior puede devolver error al usuario aunque el documento ya exista, promoviendo un reintento duplicado. También hay llamadas a log sin await en conversiones.

**Cierre:** auditoría crítica dentro de la misma transacción o outbox; notificaciones desacopladas con identidad estable de operación; respuestas que no oculten commits exitosos.

### F14 — P1 para distribución: actualizaciones y recuperación requieren prueba de release

**Fuente:** `apps/desktop/main.js`, `preload.js`, `package.json`, workflow desktop.

Se corrigió la UX y parte de la máquina de estados en esta entrega. Aún falta validar descarga del artefacto publicado, firma de ejecutable, integridad del paquete, instalación desde versión anterior, interrupción y recuperación. El workflow tiene configuración de firma comentada; no se verificó un artefacto firmado.

Como endurecimiento pendiente, validar el sender de todos los IPC y limitar la navegación por origen exacto: el código usa prefijos de URL. La guía oficial de [seguridad de Electron](https://www.electronjs.org/docs/latest/tutorial/security) recomienda validar emisores IPC y restringir navegación. No se afirma que se haya logrado ejecución remota.

## Revisión módulo por módulo

**Condicionado** significa que se encontraron bases útiles, pero falta evidencia para aprobarlo. **Bloqueado** identifica defectos o dependencias críticas presentes. Cobertura de statements de esta ejecución, no porcentaje de avance comercial.

| Módulo | Estado | Evidencia y condición de salida |
|---|---|---|
| Autenticación / OAuth / MFA / sesiones | Bloqueado para instalación nueva | JWT revisa sesión y membresía; MFA tiene pruebas de concurrencia preparadas, pero la base migrada no permite crear el usuario. Cerrar F06 y E2E |
| Usuarios / invitaciones | Bloqueado | Proyección de datos públicos y control de empresas asignables; falta coherencia de esquema y cuotas por invitación/reactivación |
| Empresas | Condicionado | Propietario controla cambios, secretos no se devuelven en proyección pública; unificar catálogo/planes |
| Roles | Condicionado | Permisos normalizados y verificación backend; completar matriz negativa incluyendo IA y cambios de rol |
| Sucursales | Condicionado | Guard de cuota y extensión tenant; dependencia del contexto en mutaciones por ID; pruebas de llamadas fuera de HTTP y reactivación |
| Productos / servicios / insumos | Condicionado | Transacciones serializables y validación de relaciones; listados completos sin paginación y cuota fuera de commit |
| Categorías | Condicionado | Filtros tenant y CRUD; completar pruebas negativas de DTO, relaciones y trazabilidad |
| Marcas | Condicionado | Proyección de campos; mutaciones dependen también del filtro tenant transversal |
| Unidades | Condicionado | Filtro tenant; fallback que captura cualquier error en update debe acotarse y validarse |
| Clientes | Condicionado | CRUD tenant y auditoría, pruebas unitarias; listas sin paginación y auditoría posterior al commit |
| Proveedores | Condicionado | Mismo patrón que clientes; comprobar borrado con documentos históricos y errores de auditoría |
| Inventario / almacenes / kardex | Bloqueado por integración | Ajustes y transferencias usan decremento condicional; cotizaciones, compras y valoración no mantienen un flujo único |
| Secuencias NCF | Condicionado | Reserva con comparación de contador dentro de transacción; falta probar cambios administrativos, agotamiento y concurrencia real |
| Facturación / POS | Bloqueado | Flujo principal tiene controles de stock, descuentos y outbox; conversión de cotizaciones, reportes y cobros invalidan aprobación global |
| Notas de crédito | Condicionado | Lock de factura original y transacción serializable, pruebas de cálculo; conciliación integral con cobros, saldo a favor y reportes pendiente |
| Cobros / CxC | Bloqueado | F01, validación de saldo/moneda y contador de recibos; 0% de cobertura medida |
| Compras / pagos a proveedores | Bloqueado | F02 y F11; requiere conciliación de anulaciones y valoración |
| Cotizaciones | Bloqueado | F03; conversión debe reutilizar emisión y contador compartido |
| Promociones | Condicionado | Validaciones de vigencia/alcance, máximos y descuentos; no pruebas específicas; límites de uso concurrente e integración de precios pendientes |
| Dashboard | Condicionado | Contadores reales y tests; cobertura alta de un servicio pequeño no valida analítica comercial |
| Reportes / exportaciones fiscales | Bloqueado | F04; agregación de borradores, notas y monedas; no aprobar cifras ni exportaciones sin conciliación |
| Configuración de facturación | Condicionado | Lista de campos permitidos, impuestos y términos; asegurar que moneda, redondeo y zona se aplican uniformemente |
| Pagos / planes / renovaciones | Bloqueado para cargos reales | F09/F10, idempotencia parcial y estados ambiguos; contratación USD no verificada |
| API pública tenant | Bloqueado | F05; claves hasheadas y consultas tenant, pero derechos incompletos y sin pruebas específicas |
| Asistente IA | Bloqueado para roles restringidos | Consultas solo lectura y tenant, historial particionado; F08 exige permisos por herramienta |
| Notificaciones | Condicionado | Outbox, deduplicación y audiencia por permisos presentes; probar recuperación y entrega con proveedores de prueba |
| Actividad / security logs | Condicionado | Persistencia y trigger append-only; resolver F13, atribución de actor y evidencia de eventos sensibles |
| Backups / Google Drive | Condicionado, no aprobado como recuperación | Exportación cifrada y restaurador a base aislada; falta simulacro completo, verificación de claves y tiempos de recuperación |
| Plantillas de correo | Condicionado | Control de propietario, sanitización, revisión optimista y auditoría transaccional; E2E falla en cadena ESM y falta entrega visual integrada |
| Desktop / Ajustes / navegación / actualizador | Condicionado | Rediseño realizado y tests; restantes gates, IPC, firma y actualización empaquetada pendientes |

La tabla desglosa catálogos y comercial en submódulos; por eso tiene más filas que las 25 carpetas de módulos Nest. El inventario medido por carpeta, controladores, rutas y cobertura está en `module-inventory.json`.

## Revisión por capas

| Capa | Evaluación |
|---|---|
| Presentación Angular | Arquitectura de features/core/shared adecuada. Guards e interceptor de token restringido a la API. UI del actualizador revisada; no se verificaron visualmente todas las pantallas. Lint global pendiente |
| Aplicación / controladores | JWT y permisos presentes en módulos principales, API key para integración. Falta unificar derechos de suscripción y permisos de herramientas IA |
| Dominio comercial | Principal freno: reglas duplicadas entre POS, facturas, cotizaciones, cobros y reportes. Exigir un mismo resultado contable desde todas las rutas |
| Persistencia / PostgreSQL | Decimales, restricciones tenant y stock no negativo son fortalezas. Migraciones incompletas y concurrencia inconsistente impiden aprobar |
| Seguridad / identidad | Sesiones revocables, MFA, cifrado y CORS de producción son bases útiles. No equivalen a pentest; quedan permisos IA/API, dependencias y pruebas negativas |
| Integraciones | FiscalBridge tiene outbox y webhook HMAC. Azul tiene protección de entorno y moneda, pero falta conciliación y contrato comercial verificado. No se probaron servicios externos reales |
| Operación / despliegue | Entry point roto, versiones Node divergentes, gates rojos y distribución sin prueba de firma. No se ejecutó un build de imagen completo |
| Observabilidad / recuperación | Logging y salud presentes; auditoría posterior al commit puede fallar. Falta demostrar backup→restore, alertas operativas, RPO/RTO y respuesta a caídas |

## Actualizador: cambios realizados

- Panel compartido entre Ajustes y aviso inferior central, con jerarquía tipográfica, temas claro/oscuro y adaptación a ancho pequeño.
- Estados claros: comprobando, preparando descarga, descargando, listo y error; barra de progreso y tamaño transferido.
- Se retiraron acciones engañosas de “instalar” mientras todavía se descargaba y detalles técnicos innecesarios de la página.
- Cerrar el aviso conserva el estado real; al terminar la descarga vuelve el aviso de actualización lista.
- Un timeout produce error, nunca “estás actualizado”.
- Solo se permite reiniciar cuando Electron informa que la descarga está lista, con confirmación para guardar el trabajo.
- Se desactiva instalación automática al cerrar para respetar la decisión de posponer.
- Electron conserva un snapshot de estado para un renderer que se inicia después de los eventos.
- Traducciones ES/EN y ocho regresiones del servicio.
- Durante la prueba visual se detectó una colisión de aria-live con MatSnackBar; se corrigió para que el aviso use la región del contenedor y Ajustes su propia región.

**Límite:** las pruebas visuales usan componentes Angular reales con eventos Electron sintéticos. No prueban descarga, firma, sustitución de binarios ni reinicio de un instalador real.

## Condiciones mínimas para reconsiderar el lanzamiento

1. **Instalación reproducible:** migraciones completas en PostgreSQL vacío, entrypoint real y healthcheck dentro de la imagen final.
2. **Integridad comercial:** cerrar F01–F04, F11 y F13; regresiones de saldos, monedas, descuentos, notas, inventario y rutas alternativas.
3. **Autorización:** cerrar F05/F08/F09; matriz de actor × empresa × permiso × suscripción incluyendo IA y API pública.
4. **Integraciones:** conciliación de pagos, tarifa aceptada y pruebas fiscales con entorno/proveedor autorizado para los tipos que tendrá v1.
5. **Entrega y operación:** gates en verde, dependencias revisadas, instalador y actualización verificados y simulacro de restauración.
6. **Aceptación v1:** listado explícito de funciones habilitadas y recorridos completos con usuarios de prueba. Las funciones excluidas deben bloquearse también en backend.

**Decisión:** continuar en desarrollo/staging con datos de prueba. No recomendar una primera salida general con cobros o documentos reales hasta cerrar los bloqueos anteriores. Un piloto con operaciones reales requiere los mismos mínimos de integridad, instalación y recuperación; reducir usuarios no corrige los errores de saldo.

