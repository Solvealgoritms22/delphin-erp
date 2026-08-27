---
name: dolphin-erp-ui
description: Lineamientos, estándares de diseño, arquitectura, tipografía, componentes y recursos para desarrollar en Dolphin ERP (Angular + TailwindCSS + Angular Material).
---

# Dolphin ERP UI - Standards & Design Guidelines

Este skill define los lineamientos obligatorios de arquitectura, diseño, estilizado, assets y componentes reutilizables para cualquier nuevo desarrollo o refactorización dentro de este proyecto.

---

## 1. Arquitectura y Tecnología

* **Framework**: Angular (versiones modernas con **Standalone Components**, **Control Flow nativo** `@if` / `@for` / `@switch`, y **Signals** o propiedades reactivas del componente).
* **Organización del Proyecto (Clean Layered Architecture)**:
  * `src/app/core/`: Servicios transversales, autenticación, guards, interceptores HTTP e i18n (`@core/*`).
  * `src/app/layout/`: Shells de navegación (`admin`, `auth`, `public`) (`@layout/*`).
  * `src/app/features/`: Módulos de funcionalidad y negocio (`sales`, `purchases`, `billing`, `catalogs`, `branches`, `ai-assistant`, `dashboard`, `settings`, `auth`) (`@features/*`).
  * `src/app/shared/`: Componentes reutilizables (`ui/`, `widgets/`, `feedback/`), directivas y pipes (`@shared/*`).
* `public/`: Assets estáticos y multimedia.

---

## 1.1 Checklist Obligatorio para Nuevos Módulos

Antes de considerar terminado cualquier módulo, feature o componente funcional, revisa esta lista. No se debe implementar únicamente la interfaz: el módulo debe quedar integrado con la plataforma completa.

1. **Transloco**
   * Todo texto visible debe usar claves Transloco, incluidos títulos, subtítulos, labels, placeholders, botones, tooltips, estados vacíos, mensajes de error, confirmaciones, snackbars y textos dinámicos.
   * Agrega las claves en `public/i18n/en.json` y `public/i18n/es.json` al mismo tiempo.
   * No dejes textos hardcodeados en templates ni en mensajes generados desde TypeScript.
   * Verifica que las claves existan en ambos idiomas y que no aparezcan claves como `module.title` en pantalla.

2. **Registro de Actividad**
   * Si el módulo crea, actualiza, elimina, exporta o cambia información de negocio, registra la acción mediante `ActivityLogService`.
   * Incluye como mínimo empresa, usuario, acción, módulo, recurso afectado y nombre legible del recurso.
   * Los registros deben respetar el tenant activo.

3. **Security Logs**
   * Si la acción afecta autenticación, permisos, sesiones, invitaciones, contraseñas, políticas, pagos o datos sensibles, registra también un evento en `SECURITY`.
   * Incluye severidad, evento, acción tomada, usuario, IP y metadata relevante sin guardar contraseñas, tokens ni secretos.

4. **Permisos**
   * Define permisos de lectura, creación, actualización y eliminación cuando correspondan.
   * Protege los endpoints con `JwtAuthGuard` y `PermissionsGuard` usando `RequirePermissions`.
   * Aplica el mismo control en las rutas del frontend con `permissionGuard`.
   * Verifica siempre empresa/tenant en backend; ocultar un botón no es una medida de seguridad.

5. **Analíticas y Datos Reales de Backend (Cero Datos Mock)**
   * Toda métrica, gráfica, tarjeta de KPI o reporte financiero debe consumir agregaciones reales de base de datos desde Prisma/PostgreSQL (`_sum`, `_count`, `_avg`, `groupBy`).
   * Queda estrictamente prohibido usar datos inventados o series temporales falsas hardcodeadas.

6. **Relación con otros módulos y Multi-Tenancy**
   * Identifica dependencias con empresas, usuarios, roles, productos, clientes, proveedores, sucursales, facturación, notificaciones y actividad.
   * **Aislamiento Multi-Tenant**: Toda información, incluyendo historiales de chat de IA, preferencias y caché local, debe estar estrictamente particionada por `empresaId` y `userId`.

7. **Planes de pago y entitlements**
   * Define qué planes pueden utilizar el módulo y qué límites aplican.
   * Protege las operaciones limitadas con `RequireEntitlement` y `EntitlementGuard` en backend.
   * Refleja el estado del plan en el frontend con mensajes traducibles y acciones claras para actualizar el plan.

---

## 1.2 Estándar de Cabeceras de Página (Page Headers)

* **Prohibido colocar íconos al lado del título principal**: Las cabeceras de página principales (`Header`) deben mantener un diseño tipográfico limpio y minimalista. **Nunca** agregues cajas de íconos decorativos (`div` con fondo y `mat-icon`) al lado del título `<h1>` o `<div>`.
* **Estructura Estándar Oficial**:
  ```html
  <!-- Header -->
  <div class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
    <!-- Title & Subtitle -->
    <div>
      <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
        {{ 'module.title' | transloco }}
      </div>
      <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {{ 'module.description' | transloco }}
      </p>
    </div>
    <!-- Actions / Buttons -->
    <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4 gap-3">
      <!-- Botones de acción principales -->
    </div>
  </div>
  ```

---

## 1.3 Estándar de Formularios, Selects y Placeholders Obligatorios

* **Prohibido usar `<select>` nativos sin estilizar**: Nunca uses etiquetas HTML `<select>` nativas del navegador en modales, formularios ni barras de herramientas.
* **Uso Obligatorio de Angular Material (`MatSelectModule`, `MatFormFieldModule`)**:
  - Utiliza siempre `<mat-form-field appearance="outline" class="w-full">` con `<mat-label>` y `<mat-select>` con `<mat-option>`.
* **Placeholders Explícitos en `<mat-select>` (REGLA CRÍTICA)**:
  - En Angular Material con `floatLabel: 'always'`, si `<mat-select>` no tiene un atributo `placeholder="..."`, el interior del campo se renderiza totalmente en blanco en estado de reposo.
  - **Es obligatorio** añadir `placeholder="Seleccionar..."` o `[placeholder]="'common.select' | transloco"` a **todo** `<mat-select>` del sistema.
  ```html
  <mat-form-field appearance="outline" class="w-full">
    <mat-label>{{ 'catalogs.products.category' | transloco }}</mat-label>
    <mat-select [(ngModel)]="selectedCategoriaId" [placeholder]="'common.select' | transloco">
      @for (cat of categories(); track cat.id) {
        <mat-option [value]="cat.id">{{ cat.nombre }}</mat-option>
      }
    </mat-select>
  </mat-form-field>
  ```

---

## 1.4 Estándar de Carga: Prohibición de Spinners -> USO OBLIGATORIO DE SKELETONS

* **Prohibición de Loaders Circulares Flotantes**: Queda terminantemente prohibido utilizar `<mat-spinner>` o círculos de carga flotantes en el centro de tablas, listados, dashboards o módulos de reportes.
* **Uso Obligatorio de Skeletons**:
  - En estados de carga de datos iniciales o transiciones de filtros, utiliza componentes `<app-skeleton>` o layouts esqueléticos con `animate-pulse` que reproduzcan la estructura visual real de las tarjetas y tablas.

---

## 1.5 Colores y Estandarización de Badges (Spans)

* **Prohibición de Tonos Púrpuras/Morados Arbitrarios**: No uses colores `purple-*`, `violet-*` o `indigo-*` en badges, filtros o tags de estado comunes.
* **Paleta Estandarizada**:
  * **Neutral / Inactivo / General**: `bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50`
  * **Éxito / Activo / Pagada**: `bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20`
  * **Alerta / Anulada / Crítico**: `bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20`
  * **Pendiente / Borrador**: `bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20`
  * **Informativo / e-CF**: `bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20`

---

## 1.6 Estilo de Filas de Tablas en Modo Oscuro (Dark Mode)

* **Regla de Fondos Condicionales**: **Nunca** apliques `[class.bg-neutral-50/40]` o fondos blancos fijos en tablas para marcar filas inactivas o anuladas, ya que en modo oscuro generan parches blanquecinos translúcidos descoloridos.
* **Patrón Oficial para Filas Anuladas/Inactivas**:
  - Conserva el fondo base del tema (`dark:hover:bg-neutral-800/40`).
  - Indica el estado mediante tipografía atenuada (`[class.line-through]="isAnulada"` y `[class.text-neutral-400]="isAnulada"` `[class.dark:text-neutral-500]="isAnulada"`).
  - Muestra el badge representativo (`🚫 Anulada`).
* **Permisividad de Acciones**: Las filas anuladas/inactivas deben permitir la acción de **visualización / consulta / reimpresión** (tanto al hacer clic en la fila como en el menú `...`), deshabilitando únicamente las operaciones de mutación o notas de crédito.

---

## 1.7 Moneda Oficial Dominicana (`RD$`)

* **Prohibición de Símbolo Dólar Fijo (`$`)**: **Nunca** escribas `$ {{ total }}` de forma fija en templates de ventas o compras.
* **Uso Obligatorio de `RD$`**:
  - En la República Dominicana la moneda base oficial es el Peso Dominicano (`DOP`), y debe mostrarse siempre con el prefijo **`RD$`** (ejemplo: `RD$ 1,474.01`).
  - Si el módulo es multidivisa, utiliza un helper de resolución dinámica:
    ```typescript
    getCurrencySymbol(code?: string | null): string {
      return code === 'USD' ? '$' : code === 'EUR' ? '€' : 'RD$';
    }
    ```

---

## 1.8 Impresión de Reportes Formales (Motor Iframe Aislado)

* **Prohibición de `window.print()` sobre la UI General**: Nunca ejecutes `window.print()` directamente sobre la vista web de la aplicación, ya que el navegador captura el sidebar lateral, la cabecera de la aplicación y elementos interactivos.
* **Uso Obligatorio de Iframe Invisible**:
  - Genera un documento HTML limpio con CSS contable embebido (`@page { size: letter portrait; margin: 1.2cm; }`, tipografía Inter, tablas con bordes `#cbd5e1`, encabezado institucional, RNC, metadatos, resumen ejecutivo y totales destacados).
  - Inyéctalo en un `iframe` dinámico invisible y dispara `printFrame.contentWindow.print()`.

---

## 1.9 Diseño Oficial de Facturas Dominicanas (DGII / e-CF Estilo Altice)

Toda plantilla de factura en Dolphin ERP debe seguir la distribución estructurada estándar oficial:

1. **Encabezado en 2 Columnas**:
   - **Izquierda**: Logo corporativo, Razón Social de la empresa, **RNC**, dirección física, Punto de Emisión e-NCF y Fecha de Emisión.
   - **Derecha**: Tipo de comprobante en mayúsculas (ej: *Factura De Consumo Electrónica*, *Factura De Crédito Fiscal Electrónica*), número de **e-NCF / NCF** destacado en azul, RNC/Cédula del cliente, Fecha de Vencimiento y Número de Factura (`FAC-XXXX`).
2. **Caja del Cliente**:
   - Recuadro en azul cielo suave (`bg-sky-50/80 border border-sky-100`) con Nombre/Razón Social en negrita mayúsculas, dirección, cédula/RNC y correo.
3. **Estado de Cuenta / Balance al Corte**:
   - Franja `Balance pendiente al corte` con Balance previo, Pagos realizados y Saldo adeudado.
4. **Tabla de Cargos y Productos**:
   - Columnas: `#`, `Descripción del Producto o Servicio`, `Cantidad`, `Precio Unit.`, `ITBIS`, `Importe`.
5. **Desglose Contable y Franja de Total**:
   - Desglose de Subtotal neto, Base imponible, ITBIS (18%), Descuentos y Total cargos.
   - **Franja ancha azul cielo `Total a pagar`** con fecha límite de pago y monto destacado en `RD$ #,##0.00`.
6. **Pie de Página en 3 Columnas**:
   - *Columna 1*: Badge `QR verificación e-Ncf`, código QR oficial DGII, Código de Seguridad y Fecha de Firma Digital.
   - *Columna 2*: Formas y métodos de pago (Efectivo, Tarjeta, Transferencias bancarias).
   - *Columna 3*: Badge `Aplica pago`, indicaciones de validación y sello del sistema.

---

## 1.10 Asistente IA e Historial Multi-Tenant

* **Aislamiento por Cuenta y Usuario**:
  - Todo historial de conversaciones, sesiones y contexto del Asistente IA debe persistirse usando claves particionadas que incluyan el `empresaId` y `userId` (ej: `ai_chat_history_${empresaId}_${userId}`).
  - Las cuentas jerárquicamente subordinadas o sucursales deben mantener sus propios historiales aislados sin filtraciones de datos entre empresas.
* **Cero Botones Inutilizables**: No incluyas controles de retroalimentación innecesarios (como botones "útil / no útil") a menos que estén formalmente integrados y requeridos.

---

## 2. Componentes Reutilizables Disponibles

Antes de crear código desde cero, **revisa y reutiliza los componentes existentes en `src/app/shared/components/`**:
* **`stat-card`**: Tarjetas de métricas e indicadores clave con estilos unificados (Dashboard y Reportes).
* **`status-badge`**: Badges de estado con estilos (Active, Inactive, Pending, etc.).
* **`avatar-group`**: Listas o grupos superpuestos de avatares con contador excedente (`+N`).
* **`data-table`**: Tablas de datos estandarizadas.
* **`breadcrumbs`**: Migas de pan para navegación.
* **`empty-state`**: Ilustraciones y mensajes de estado vacío.
* **`skeleton`**: Placeholders de carga esqueléticos.
* **`confirm-dialog`**: Diálogo de confirmación estándar con soporte para acciones destructivas, íconos y match string de seguridad.

---

## 3. Iconografía y Assets Estáticos

### Íconos Animados Estándar (`ng-animated-icons`)
El proyecto utiliza **`ng-animated-icons`** como el estándar oficial de íconos animados e interactivos basados en Lucide para Angular.

* **Importación Standalone**:
  ```typescript
  import {
    PlusIcon,
    TrashIcon,
    CheckIcon,
    SearchIcon,
    SettingsIcon,
    UserRoundIcon,
    UserCheckIcon,
    UserCogIcon,
    ActivityIcon,
    DownloadIcon,
    RefreshCwIcon,
    RotateCwIcon,
    RotateCcwIcon,
    SlidersHorizontalIcon,
    BellIcon,
    EyeOffIcon,
    AwardIcon,
    TagIcon,
    PencilIcon,
    SparklesIcon,
    ClockIcon,
    ArrowRightIcon,
    ArrowUpRightIcon,
    TriangleAlertIcon,
    CircleAlertIcon,
    XIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon
  } from 'ng-animated-icons';
  ```

---

## 4. Anti-patrones: QUÉ NO HACER (Prompts Negativos)

Para evitar resultados repetitivos, genéricos y de baja calidad, la IA **NUNCA** debe:

1. **Spinners circulares en cargas de página**: Nunca uses spinners giratorios en el centro de tablas ni reportes; usa **skeletons**.
2. **Selects en blanco**: Nunca olvides el atributo `placeholder="..."` en un `<mat-select>`.
3. **Toasts flotantes superiores**: Nunca muestres toasts en la esquina superior (`top-right`); usa `MatSnackBar` en la **parte inferior central**.
4. **Impresión de UI web**: Nunca uses `window.print()` sobre la pantalla principal; usa el **iframe aislado** con documento formal.
5. **Dólares fijos (`$`)**: Nunca escribas `$ {{ total }}` para moneda dominicana; usa **`RD$`**.
6. **Fondos claros en Dark Mode**: Nunca apliques `bg-neutral-50` sobre filas en modo oscuro sin la correspondiente clase `dark:bg-*`.
7. **Bloqueo de consulta en anulados**: Nunca deshabilites la visualización o previsualización de facturas o registros anulados.
8. **Datos mock inventados**: Nunca pongas series temporales falsas ni métricas simuladas en reportes financieros.
9. **Historial IA global**: Nunca guardes chats de IA en claves genéricas sin particionar por `empresaId` y `userId`.
10. **Íconos decorativos al lado de títulos H1**: Mantén las cabeceras tipográficas y limpias.

---

## 5. Regla de Oro para la IA
1. Siempre inspecciona los componentes en `src/app/shared/components/` antes de escribir nueva interfaz.
2. Mantén estricta compatibilidad con el modo oscuro (`dark:` en todas las clases de Tailwind).
3. Usa la paleta de colores `neutral-*`, `blue-*` y `emerald-*` documentada.
4. Todo input/select de formularios y filtros debe incluir un **placeholder con el formato real** del dato (sin "Ej." ni "Ingrese el X").
5. Para facturas y reportes fiscales, aplica la estructura oficial dominicana con membrete, e-NCF, RNC y prefijo `RD$`.
6. Genera siempre impresiones contables en un **iframe aislado** y estados de carga mediante **skeletons**.

