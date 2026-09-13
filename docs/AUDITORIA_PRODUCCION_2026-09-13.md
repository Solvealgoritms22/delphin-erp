# Auditoría general de producción — Dolphin ERP

Fecha: 13 de septiembre de 2026. Código revisado: `0fcf674ef19fe84b4ab04543eb9f6eadc1128c73`.

## Veredicto: NO APTO todavía para producción general

La aplicación compila y ha mejorado en autenticación, concurrencia y actualización del escritorio. Sin embargo, quedan defectos de autorización, confidencialidad y consistencia monetaria demostrados, además de controles de calidad que actualmente fallan. Configurar correctamente las variables de producción no resuelve estos problemas. La definición y provisión de esas variables se excluye expresamente del veredicto, por ser responsabilidad del propietario.

Esta auditoría no modificó código de la aplicación. Se realizaron lectura dirigida de los 25 módulos, revisión transversal de infraestructura y escritorio, compilaciones, lint, pruebas unitarias/integración y reproducciones con datos sintéticos. La cobertura de revisión no equivale a ejecutar todas las pantallas ni todas las combinaciones de negocio.

## Evidencia ejecutada

| Comprobación | Resultado |
|---|---|
| Compilación API | Completada |
| Compilación de producción Angular | Completada |
| Pruebas API | 54 suites, 365 pruebas aprobadas |
| Cobertura API | Sentencias 34,70%; ramas 28,89%; funciones 33,55%; líneas 34,37% |
| Puerta de cobertura | FALLA: sentencias, funciones y líneas no alcanzan el mínimo configurado del 35% |
| Integración con PostgreSQL 16 aislado | 3 suites, 15 pruebas aprobadas; migraciones aplicadas |
| Pruebas escritorio | 5 archivos, 12 pruebas aprobadas |
| Lint API sin modificar archivos | FALLA: 102 errores y 485 advertencias; 99 errores marcados autocorregibles |
| Lint escritorio | Aprobado |
| npm audit actual | 5 entradas de paquetes afectados: 4 altas, 1 moderada; 0 críticas |

Los resultados están en [audit-2026-09-13](audit-2026-09-13). El éxito de las 365 pruebas no implica que el comando de cobertura pase: terminó con error por sus umbrales. Las pruebas E2E tampoco certifican por sí solas toda la cadena del bootstrap de producción, proveedores reales o instaladores.

## Hallazgos priorizados

P1 significa resolver antes de producción general. P2 significa corregir y validar antes de ampliar el uso; su impacto depende del flujo y volumen. “Reproducido” usa servicios compilados con dependencias sintéticas, sin enviar datos a proveedores externos. “Estático” identifica el comportamiento del código sin afirmar un incidente en producción.

### 1. P1 — La IA de streaming puede usar un proveedor público desactivado [reproducido]

En `apps/api/src/modules/ai-agent/ai-agent.service.ts:345`, la respuesta normal respeta `AI_PUBLIC_FALLBACK_ENABLED`; el flujo de streaming alrededor de la línea 469 invoca `callFreePollinationsAI` sin ese control. La función construye mensajes con contexto de empresa e historial y utiliza un servicio externo.

Con la bandera en `false` y proveedores principales sin respuesta, la reproducción confirmó que se entra al fallback público. No se hizo una petición externa durante la prueba. Impacto: exposición no deseada del contexto comercial. Es un defecto de código incluso con variables correctamente definidas. Unificar la política de proveedores en ambos caminos y probar explícitamente el caso desactivado.

### 2. P1 — La IA permite consultar ventas con un permiso diferente al exigido por facturas [reproducido]

`ai-agent.service.ts:191` autoriza el contexto de ventas con `commercial:read`, mientras las rutas de lectura de facturas requieren `invoices:read`. Un colaborador activo con acceso al chat y a comercial, pero sin lectura de facturas, obtuvo acceso al método que consulta ventas en la reproducción.

Esto es una inconsistencia de autorización dentro de la empresa; no se ha demostrado acceso entre empresas. Reutilizar la misma política de permisos en API, herramientas IA e interfaz y añadir una prueba negativa para este rol.

### 3. P1 — Cuentas por cobrar suma importes de monedas diferentes [reproducido]

`apps/api/src/modules/reports/reports.service.ts:344` suma `balancePendiente` sin conversión ni agrupación por moneda. Con 100 DOP y 10 USD a tasa 60, produjo un total de 110, en lugar de separar monedas o expresar 700 DOP bajo esa política.

Las ventas ya incorporan conversión y signo de notas de crédito, pero las cuentas por cobrar y métricas de cobros no mantienen una política uniforme. Los agregados de 606/607 también necesitan conciliación explícita de monedas y documentos. Esta revisión no certifica reglas normativas de DGII. Centralizar moneda base, tasa histórica y redondeo y reconciliar los informes contra documentos fuente.

### 4. P1 — Compras no mantiene una valoración consistente en todos los caminos [estático]

En `apps/api/src/modules/purchases/purchases.service.ts`, el costo promedio utiliza cantidad por costo unitario, sin incorporar el descuento global asignado. La anulación reduce existencias sin una reversión equivalente del costo promedio. Por ello, ingresar compras a costos diferentes y anular una puede dejar una valoración que no corresponde a las existencias restantes.

La asignación del residuo de redondeo del descuento a la última línea también necesita una prueba de límites: una última línea de importe cero puede recibir un descuento positivo. No se ejecutó esa variante en esta auditoría. Definir una política de valoración y reversión y probar compras descontadas, anulaciones y consumo intermedio. Son positivos los bloqueos incorporados y el rechazo de anulación de compras pagadas.

### 5. P1 — La validación de cuotas puede bloquear recuperación de suscripciones [estático]

La migración `20260912200000_atomic_resource_quotas` valida vencimiento y todas las cuotas en cualquier actualización de una suscripción ACTIVE/TRIAL. Por ello, actualizar datos del método de pago sobre una suscripción vencida puede ser rechazado aunque sea necesario para reactivarla.

También debe verificarse el cambio a un plan con límites menores antes de cobrar: el flujo de cobro seguido de actualización de suscripción puede terminar con cobro realizado y actualización rechazada por el trigger. No se realizó un cobro bancario real. Separar las operaciones de recuperación de las que consumen cuota y garantizar prevalidación y compensación/reconciliación del cobro.

### 6. P1 — Dependencias con avisos altos y puertas de publicación permisivas [ejecutado/estático]

El resultado actual de npm audit registra entradas para `@nestjs/platform-express`, `js-yaml`, `multer`, `qs` y `svgo`. Son entradas de paquetes afectados, incluidas propagaciones transitivas; no cinco ataques independientes demostrados. El detalle de versiones, cadenas y avisos está en `audit-2026-09-13/dependencies.json`. Debe actualizarse o justificarse cada aviso según su exposición en ejecución y compilación, sin actualizaciones forzadas a ciegas.

`.github/workflows/desktop-release.yml:54` y `:60` permiten continuar pese a fallos de lint y pruebas. Además, el lint API y el umbral de cobertura fallan en la ejecución actual. Una publicación debe depender de controles aprobados. El flujo también permite continuar sin firma; esto es una decisión estructural del pipeline, separada de que el propietario proporcione los secretos correspondientes.

### 7. P2 — Se pierden códigos de error que la interfaz necesita [estático]

`apps/api/src/common/filters/api-exception.filter.ts:30` reconstruye la respuesta sin conservar `code`. El interceptor de escritorio espera `TRIAL_EXPIRED` y `SUBSCRIPTION_INACTIVE` para orientar al usuario. También se pierde información específica como `MFA_REQUIRED`. Preservar una lista controlada de campos públicos y comprobar el contrato completo API-interfaz.

### 8. P2 — El registro de actividad no siempre es durable [estático]

`apps/api/src/modules/activity-log/activity-log.service.ts:54` captura errores y solo los relanza cuando recibe una transacción externa. En operaciones que registran actividad después de confirmar el cambio, puede persistir la operación sin su evidencia de auditoría. Incorporar registro transaccional u outbox para cambios críticos; evitar que un fallo de registro produzca un falso fallo de negocio o una pérdida silenciosa.

### 9. P2 — Consultas y exportaciones sin límites suficientes [estático]

Productos incluye relaciones y existencias sin paginación; clientes y proveedores también tienen listados sin paginar. Varios reportes cargan conjuntos completos y agregan en memoria. El backup materializa datos, JSON, compresión y cifrado, con varias representaciones del conjunto en memoria. A mayor volumen aumentan latencia, memoria y riesgo de agotamiento.

Aplicar paginación y selección mínima de campos, límites de períodos, agregación en base de datos y exportaciones por lotes o streaming. Medir con datos representativos antes de fijar capacidad. No se ejecutó una prueba de carga ni una restauración completa en esta auditoría.

### 10. P2 — Consumo de recursos de IA y sesiones mejorable [estático]

Los DTO de IA carecen de límites completos de longitud y cantidad en mensaje, historial e imágenes; recortar el número de mensajes no limita su tamaño. Revisar cancelación del proveedor al desconectarse el cliente y eliminar consultas sensibles de logs ordinarios.

El monitor de sesión consulta cada 10 segundos y suma eventos de foco/visibilidad. Mil clientes abiertos representarían aproximadamente 100 peticiones por segundo solo por ese intervalo, antes del uso funcional: es una estimación, no una medición. La estrategia JWT hace varias lecturas para validar sesión, usuario/MFA, empresa y membresía. Reducir polling redundante y consultas repetidas conservando la revocación y el control MFA en servidor.

Los triggers de cuotas bloquean la fila de empresa incluso en actualizaciones ordinarias de productos, lo que puede serializar trabajo del mismo tenant. Medir contención y limitar los bloqueos al cambio relevante. Los workers tienen lotes acotados y reintentos, una mejora, pero falta comprobar comportamiento con varias réplicas y retención de sus estados finales.

## Revisión módulo por módulo

Esta matriz resume lectura dirigida y riesgos; “sin bloqueo adicional identificado” no significa certificación exhaustiva.

| Módulo API | Evaluación actual |
|---|---|
| activity-log | Riesgo de pérdida de trazabilidad fuera de transacciones; hallazgo 8. |
| ai-agent | Bloqueadores de autorización y proveedor público; límites de recursos incompletos. |
| auth | MFA exigido por servidor según estado actual del usuario; conserva prueba al cambiar empresa. Mejora sustancial frente al bypass de clientes antiguos. |
| backups | Exportación cifrada, pero consumo de memoria y restauración a escala sin acreditar. |
| billing-config | Revisar conjuntamente métodos de pago, renovación y trigger de suscripciones. |
| catalogs | Revisar manejo amplio de excepciones/reintentos en unidades; no se demostró fuga de tenant. |
| commercial | Listados sin paginar y coherencia de permisos con IA pendiente. |
| credit-notes | Revisar conciliación con cobros, saldo y reportes en moneda base; no certificar solo por emisión exitosa. |
| customer-payments | Mejoras en importes, igualdad de aplicación, moneda y bloqueos; métricas agregadas requieren corrección. |
| dashboard | Debe consumir métricas monetarias coherentes con reportes; aprobación condicionada a conciliación. |
| email-templates | Sin bloqueo adicional identificado en lectura; entrega y representación en clientes reales no probadas. |
| empresas | Cuotas y suscripciones requieren validar recuperación y cambios de plan. |
| inventory | Bloqueos mejorados; valoración vinculada a compras y listados amplios pendientes. |
| invoices | Controles de lectura explícitos y pruebas de integridad; falta aceptación completa de emisión fiscal real. |
| notifications | Lotes/reintentos mejorados; revisar escritura desde transacciones de otro cliente y entrega real. |
| payments | Validar cobro exitoso seguido de fallo local, reconciliación e idempotencia con proveedor real. |
| promotions | Sin bloqueo adicional identificado en lectura; falta matriz completa de combinaciones comerciales. |
| purchases | Bloqueador de consistencia de costo y pruebas de redondeo pendientes. |
| quotes | Revisar etiqueta FACTURADA cuando el documento generado sigue en BORRADOR y atomicidad de notificaciones. |
| reports | Bloqueador multimoneda reproducido; conciliación de reportes fiscales y valoración pendiente. |
| roles | Política debe aplicarse consistentemente también en herramientas IA. |
| sequences | No se identificó un bloqueo adicional; conservar pruebas de concurrencia y límites. |
| sucursales | Cuotas protegidas en BD; validar conflictos y límites desde interfaz. |
| tenant-api | Integración y revocación requieren aceptación de extremo a extremo, sin confiar en cliente. |
| users | Estado/MFA consultados en servidor; revisar experiencia ante revocación y cambios de seguridad. |

## Arquitectura, calidad y usabilidad

El monolito modular NestJS y el escritorio Angular son una base razonable para una primera versión. No hace falta migrar a microservicios para resolver estos hallazgos. La prioridad arquitectónica es compartir políticas de autorización, moneda, valoración, suscripción y errores, y hacer explícitos los límites transaccionales.

La calidad es desigual: existen mejoras reales y pruebas útiles, pero los servicios concentran reglas y coordinación de proveedores, y el lint API falla. Las 485 advertencias no representan necesariamente 485 defectos funcionales; sí elevan el costo de mantenimiento y dificultan detectar problemas nuevos. No bajar los umbrales para obtener un resultado verde: añadir pruebas sobre los riesgos anteriores.

El actualizador se inicializa desde la aplicación raíz, por lo que puede aparecer antes de iniciar sesión. En la verificación previa de esta misma tarea se observó el popup en login con Electron simulado; no equivale a haber instalado una actualización real firmada. La nueva compilación y las pruebas de escritorio pasan. Antes de distribuir, probar descarga, error de red, reinicio, versión anterior y recuperación con un instalador real.

No se hizo un recorrido visual autenticado de todas las pantallas en esta auditoría. Los principales riesgos de usabilidad identificados son errores sin código recuperable, estados de cotización/factura ambiguos y recuperación de suscripciones. Deben validarse teclado, tamaños de ventana, estados vacíos, permisos restringidos y acciones irreversibles en los flujos principales; no se atribuye un defecto visual concreto sin observarlo.

El refuerzo MFA reside en servidor: una versión antigua no obtiene autorización de API solo por omitir la pantalla de segundo paso si usa este backend actualizado. Esto no certifica servidores antiguos todavía desplegados ni recursos externos fuera de esta API. Mantener pruebas de tokens anteriores, cambio de empresa y revocación; un control de versión del cliente no sustituye esta validación.

## Condiciones para aprobar la primera versión

1. Cerrar los hallazgos P1 con pruebas negativas de permisos/fallback, conciliación multimoneda, valoración y recuperación de facturación.
2. Resolver o justificar técnicamente los avisos de dependencias; hacer obligatorias las puertas de lint, pruebas y cobertura en publicación.
3. Verificar flujos críticos completos: venta y nota de crédito, compra/anulación, cobro/anulación, cambio de plan y recuperación de pago, con monedas y roles diferentes.
4. Demostrar restauración de backup, emisión fiscal y pagos con entornos oficiales apropiados, actualización real del escritorio y capacidad con un volumen representativo.
5. Resolver el contrato de errores y asegurar trazabilidad durable de operaciones críticas.

Es posible continuar pruebas internas controladas. No recomiendo abrir producción general ni presentar como conciliados los importes actuales de cuentas por cobrar. Las variables de entorno se mantienen fuera de la lista de defectos; el veredicto seguiría siendo NO APTO aunque hoy estuvieran correctamente definidas.
