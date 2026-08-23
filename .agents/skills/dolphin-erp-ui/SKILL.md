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

5. **Analíticas**
   * Si el módulo produce métricas, tendencias, conteos o estados útiles, define qué datos deben alimentar el dashboard y los reportes.
   * Evita gráficas con datos inventados: si no existe una serie temporal real, muestra distribución o estado actual y etiquétalo correctamente.

6. **Relación con otros módulos**
   * Identifica dependencias con empresas, usuarios, roles, productos, clientes, proveedores, sucursales, facturación, notificaciones y actividad.
   * Define comportamiento para cambio de empresa, eliminación, desactivación y falta de permisos.
   * Reutiliza servicios, componentes y tipos existentes; no dupliques lógica ni modelos.

7. **Planes de pago y entitlements**
   * Define qué planes pueden utilizar el módulo y qué límites aplican.
   * Protege las operaciones limitadas con `RequireEntitlement` y `EntitlementGuard` en backend.
   * Refleja el estado del plan en el frontend con mensajes traducibles y acciones claras para actualizar el plan.
   * Verifica límites de cantidad, almacenamiento, usuarios, empresas o cualquier otro recurso antes de persistir.

### Criterio de aceptación

Un módulo no está terminado si falta cualquiera de los puntos aplicables. En la revisión final documenta explícitamente qué puntos no aplican y por qué.

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

## 1.3 Estándar de Formularios, Selects y Controles de Entrada

* **Prohibido usar `<select>` nativos sin estilizar**: Nunca uses etiquetas HTML `<select>` nativas del navegador en modales, formularios ni barras de herramientas.
* **Uso Obligatorio de Angular Material (`MatSelectModule`, `MatFormFieldModule`)**:
  - Utiliza siempre `<mat-form-field appearance="outline" class="w-full">` con `<mat-label>` y `<mat-select>` con `<mat-option>`.
  - Para filtros en barras de herramientas, usa botones de filtro con `<button [matMenuTriggerFor]="filterMenu">` o `<mat-form-field>`.
  ```html
  <mat-form-field appearance="outline" class="w-full">
    <mat-label>Producto</mat-label>
    <mat-select [(ngModel)]="selectedId">
      @for (item of items(); track item.id) {
        <mat-option [value]="item.id">{{ item.nombre }}</mat-option>
      }
    </mat-select>
  </mat-form-field>
  ```

---

## 1.4 Estándar de Estados Vacíos (Empty States)

* **Uso Obligatorio del componente compartido `<app-empty-state>`**:
  - En tablas, listas o paneles sin datos, **nunca** uses íconos diminutos ni contenedores improvisados.
  - Reutiliza `<app-empty-state>` (`src/app/shared/components/empty-state/empty-state.component.ts`), el cual incluye el contenedor circular proporcional (`size-24`), ícono destacado (`size-12`), título semántico, descripción y botón de acción opcional.
  ```html
  <app-empty-state
    icon="package"
    title="Sin existencias registradas"
    description="Realiza un ajuste de stock inicial o transfiere productos para registrar existencias."
    actionLabel="Nuevo Ajuste"
    actionIcon="plus"
    (action)="openModal()"
  />
  ```

---

## 2. Componentes Reutilizables Disponibles

Antes de crear código desde cero, **revisa y reutiliza los componentes existentes en `src/app/shared/components/`**:
* **`stat-card`**: Tarjetas de métricas e indicadores clave.
* **`status-badge`**: Badges de estado con estilos (Active, Inactive, Pending, etc.).
* **`avatar-group`**: Listas o grupos superpuestos de avatares con contador excedente (`+N`).
* **`data-table`**: Tablas de datos estandarizadas.
* **`breadcrumbs`**: Migas de pan para navegación.
* **`empty-state`**: Ilustraciones y mensajes de estado vacío.
* **`skeleton`**: Placeholders de carga.
* **`confirm-dialog`**: Diálogo de confirmación estándar con soporte para acciones destructivas, íconos y match string de seguridad.

---

## 3. Iconografía y Assets Estáticos

### Íconos Animados Estándar (`ng-animated-icons`)
El proyecto utiliza **`ng-animated-icons`** como el estándar oficial de íconos animados e interactivos basados en Lucide para Angular:

* **Importación Standalone**:
  Importa únicamente los componentes de íconos requeridos en cada componente (asegúrate de usar los nombres exactos exportados):
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
* **Uso en Template**:
  ```html
  <!-- En botones -->
  <button mat-flat-button class="rounded-xl bg-blue-600 text-white">
    <i-plus [size]="18" class="mr-2"></i-plus>
    {{ 'common.create' | transloco }}
  </button>

  <!-- En búsquedas -->
  <i-search [size]="18" class="text-neutral-400"></i-search>

  <!-- En acciones de tabla o botones icon-only -->
  <button mat-icon-button [matTooltip]="'common.delete' | transloco">
    <i-trash [size]="18" class="text-red-500"></i-trash>
  </button>
  ```
* **Fallback a `<mat-icon>`**:
  Para íconos que no están presentes en `ng-animated-icons` (por ejemplo: `ellipsis-vertical`, `wallet`, `eye`), se utiliza el registro estándar de Angular Material:
  ```html
  <mat-icon svgIcon="ellipsis-vertical" class="icon-size-5"></mat-icon>
  ```
* **Propiedades Disponibles**:
  * `size`: number (recomendado `16` a `18` en botones, `20` en barras y `24` en cabeceras).
  * `color`: string (por defecto `'currentColor'`).
  * `strokeWidth`: number (por defecto `2`).
  * `animate`: boolean (permite disparar la animación programáticamente con Signals).
  * `class`: string (clases de Tailwind para espaciado, color, etc.).
* **Micro-animaciones**: Los íconos ejecutan animaciones fluidas y reactivas al pasar el cursor (`mouseenter`).

### Íconos en Botones (OBLIGATORIO)
Todo botón de acción debe incluir un **ícono representativo** junto al texto (o solo ícono en botones compactos/icon-button) que comunique visualmente la acción que ejecuta:
* **Acciones de creación**: `<i-plus [size]="18" class="mr-2"></i-plus>` en botones "Nuevo X", "Agregar X", "Crear X".
* **Acciones de edición**: `<i-edit [size]="18" class="mr-2"></i-edit>` para "Editar"; **eliminación**: `<i-trash [size]="18" class="mr-2"></i-trash>` para "Eliminar".
* **Acciones de guardado**: `<i-check [size]="18" class="mr-2"></i-check>` o `<i-save [size]="18" class="mr-2"></i-save>` en botones de "Guardar".
* **Búsqueda**: `<i-search [size]="18"></i-search>` dentro del input o como botón de búsqueda.
* **Exportar/Descargar**: `<i-download [size]="18" class="mr-2"></i-download>`; **Actualizar/Refrescar**: `<i-refresh-cw [size]="18" class="mr-2"></i-refresh-cw>`.
* **Filtros**: `<i-sliders-horizontal [size]="18" class="mr-2"></i-sliders-horizontal>` en el botón de filtros.
* **Regresar**: `<i-arrow-left [size]="18" class="mr-2"></i-arrow-left>` o `<i-chevron-left [size]="18" class="mr-2"></i-chevron-left>`.
* **Íconos de estado / alertas**: `<i-check>`, `<i-x>`, `<i-info>`, `<i-alert-triangle>`.
* El ícono debe ir **antes del texto** con separación `mr-2` (o `gap-2` usando flex).
* Cuando la acción sea icon-only (botón cuadrado o `mat-icon-button`), es **obligatorio** añadir `[matTooltip]` describiendo la acción.
* Para íconos estáticos o de terceros heredados, se mantiene compatibilidad con `<mat-icon svgIcon="name">`.

### Recursos Multimedia (`public/`)
* **Avatares locales**:
  * Ubicación: `public/avatars/`
  * Uso: `avatars/300-1.png` a `avatars/300-35.png`.
  * *Nunca uses URLs externas (como pravatar.cc) para avatares mock*.
* **Ilustraciones vectoriales**:
  * Ubicación: `public/illustrations/`
  * Formato: `.svg` (gráficos vectoriales nítidos).
  * Soporte Dark Mode automático:
    ```html
    <img class="dark:hidden max-h-[120px]" alt="Illustration" src="illustrations/31.svg">
    <img class="hidden dark:block max-h-[120px]" alt="Illustration" src="illustrations/31-dark.svg">
    ```
* **Otras carpetas disponibles**:
  * `public/banners/`, `public/brand-logos/`, `public/file-types/`, `public/flags/`, `public/ui/`, `public/images/`.

### Uso Obligatorio de Ilustraciones
Siempre que una pantalla de listado **no tenga datos** (estado vacío) o una sección no posea contenido, agrega una ilustración visual en el centro para dar contexto y guiar al usuario:
* **Estado vacío de listados**: Usa SIEMPRE el componente compartido `<app-empty-state>` (que incluye ilustración + título + descripción + acción). Ver sección 5.
* **Banners de bienvenida / onboarding**: Usa las ilustraciones de `public/illustrations/` con soporte dual light/dark (`dark:hidden` + `hidden dark:block`) dentro de una tarjeta destacada (ej. fondo `bg-blue-50 dark:bg-blue-900/10` con borde punteado `border-dashed border-blue-300 dark:border-blue-800`).
* **Sin resultados tras filtrar**: Si el filtro no devuelve coincidencias, muestra `<app-empty-state>` con un botón para **"Limpiar filtros"** en lugar de una tabla vacía.
* **Errores de carga**: Para errores de conexión o servidor usa una tarjeta centrada con ícono (ej. `mat-icon svgIcon="x"` en círculo rojo) y botón de reintento.
* Elige la ilustración que corresponda al contexto del módulo (productos, clientes, documentos, etc.) desde `public/illustrations/`.

---

## 4. Sistema de Diseño, Estilos y Colores (TailwindCSS)

### Paleta de Colores Estandarizada
* **Fondo Principal**: `bg-white dark:bg-neutral-900`
* **Contenedores y Tarjetas**: `bg-neutral-50 dark:bg-neutral-800` o `bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800`
* **Bordes**: `border-neutral-100 dark:border-neutral-800` o `border-neutral-200 dark:border-neutral-700`
* **Texto Principal**: `text-neutral-900 dark:text-white`
* **Texto Secundario**: `text-neutral-500 dark:text-neutral-400`
* **Texto Muted/Subtítulos**: `text-neutral-400 dark:text-neutral-500`
* **Color de Acento Primario**: `bg-blue-600 hover:bg-blue-700 text-white` / `text-blue-600 dark:text-blue-500`
* **Color Secundario / Éxito**: `bg-emerald-600 hover:bg-emerald-700 text-white` / `bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400`

### Tipografía y Espaciado
* Encabezados de Módulo: `text-2xl font-bold tracking-tight text-neutral-900 dark:text-white`
* Subtítulos / Labels: `text-sm font-bold text-neutral-500`
* Redondeado de Tarjetas: `rounded-2xl` o `rounded-3xl`
* Redondeado de Botones/Inputs: `rounded-xl` o `rounded-full`

### 4.1 Estándar de Modales y Diálogos de Confirmación (Glassmorphism Blur Backdrop & Zoom Animation)
Todo diálogo, modal de formulario o diálogo de confirmación abierto a través de `MatDialog` o CDK Overlay debe cumplir con el estándar visual de **Glassmorphism con fondo difuminado (Blur Effect)** y **animación Zoom**:

* **Fondo / Backdrop Blur (Global)**:
  * El backdrop de CDK (`.cdk-overlay-dark-backdrop`) aplica automáticamente `backdrop-filter: blur(8px) saturate(140%)` con tinte `rgba(15, 23, 42, 0.45)` en modo claro, y `blur(12px) saturate(150%)` con `rgba(0, 0, 0, 0.65)` en modo oscuro.
  * Los menús y selects (`transparent-backdrop`) no aplican blur para mantener fluidez y ligereza visual.
* **Animación Zoom (Entrada y Salida)**:
  * **Apertura (Zoom In)**: Escala suave desde `scale(0.90)` y opacidad `0` hasta `scale(1.0)` y opacidad `1` (`240ms cubic-bezier(0.16, 1, 0.3, 1)`).
  * **Cierre (Zoom Out)**: Escala descendente hacia `scale(0.90)` y desvanecimiento (`180ms cubic-bezier(0.4, 0, 1, 1)`).
* **Superficie del Diálogo**:
  * Bordes redondeados modernos `rounded-2xl` (`border-radius: 1.25rem`).
  * Sombras de alta elevación con micro-borde sutil (`shadow-2xl` + borde fino `border-neutral-200/50 dark:border-neutral-700/50`).
* **Diálogos de Confirmación (`ConfirmDialogComponent`)**:
  * Para confirmar acciones destructivas o críticas, usa siempre el componente reutilizable `src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`.
  * Ejemplo de invocación estándar:
    ```typescript
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('module.deleteTitle'),
        message: this.transloco.translate('module.deleteMessage'),
        confirmLabel: this.transloco.translate('common.delete'),
        cancelLabel: this.transloco.translate('common.cancel'),
        destructive: true,
        icon: 'trash',
      } satisfies ConfirmDialogData,
      autoFocus: false,
    });
    ```

---

## 5. Patrones de Diseño Específicos

### Nombres de Pestañas (Header Tabs)
```html
<div class="flex items-center gap-8 border-b border-neutral-100 dark:border-neutral-800">
  <button 
    (click)="activeTab = 'tab1'" 
    [ngClass]="activeTab === 'tab1' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 border-b-2 border-transparent'"
    class="pb-4 text-sm font-bold transition-colors">
    Pestaña 1
  </button>
</div>
```

### Modales / Dialogs Superpuestos
```html
<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm overflow-y-auto">
  <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl w-full max-w-3xl border border-neutral-200 dark:border-neutral-800 flex flex-col transform transition-all my-8">
    <!-- Modal Header -->
    <div class="flex items-center justify-between px-8 py-6 border-b border-neutral-100 dark:border-neutral-800">
      <h2 class="text-xl font-bold text-neutral-900 dark:text-white">Título</h2>
      <button (click)="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 transition-colors">
        <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
      </button>
    </div>
    <!-- Modal Body & Footer -->
  </div>
</div>
```

### Formularios y Placeholders (OBLIGATORIO)
* **Todo input de un formulario o filtro debe incluir un placeholder** que ejemplifique el dato esperado de forma concreta y útil.
* El placeholder debe mostrar el **formato real** del dato, no la palabra "Ej.":
  * RNC: `placeholder="130123456"`
  * Teléfono: `placeholder="(809) 555-0000"`
  * Correo: `placeholder="contacto@empresa.com"`
  * Web: `placeholder="https://www.empresa.com"`
  * Nombre: `placeholder="Nombre del producto"`
* Los inputs que ya tienen un label claro pueden usar un placeholder equivalente al dato, pero **nunca** texto tipo "Ingrese el X" redundante con el label, ni "Ej. ...".
* Aplica también a `mat-select` (placeholder "Seleccione una opción") y `mat-datepicker` (placeholder con formato de fecha).
* Usa `mat-hint` solo cuando sea necesario aportar ayuda adicional (ej. "Separa cada enlace con comas"), no como sustituto del placeholder.

### Listados y Tablas de Datos Estándar
Para las pantallas principales de módulos (listados CRUD), se debe utilizar estrictamente un layout basado en un **Grid CSS responsivo**, a pantalla completa, omitiendo la antigua estructura de tarjeta o `mat-table`.

### Regla Full-Width / Full-Height (OBLIGATORIA)
Todas las vistas de módulos deben ocupar todo el ancho y alto disponible del area de contenido, siguiendo el patron visual de la vista Sucursales:
* El contenedor raiz debe usar `w-full min-w-0` y, cuando corresponda, `h-full` o `sm:absolute sm:inset-0 sm:overflow-hidden`.
* El header de la pagina debe extenderse de borde a borde, con sus bordes horizontales alineados al area de contenido.
* Las tablas, grids y estados vacios deben extenderse por todo el ancho disponible; el estado vacio debe centrarse dentro del espacio restante, no dentro de una tarjeta angosta.
* Se permite padding interno responsivo (`px-6 md:px-8`), pero no se debe envolver la vista completa en `max-w-*`, `mx-auto` o una tarjeta centrada que limite su ancho.
* Los contenedores principales deben usar `flex-auto overflow-hidden` y el listado debe ocupar la altura restante con `flex-auto overflow-y-auto`.
* Las tarjetas pequenas solo se permiten para contenido secundario; nunca deben ser el contenedor principal de una vista de modulo.
* En mobile se conserva el ancho completo y se permite `overflow-x-auto` unicamente para tablas que lo necesiten.

### Titulo y Subtitulo de Modulo (OBLIGATORIO)
Cada vista de modulo debe presentar un titulo principal y un subtitulo contextual inmediatamente debajo. El subtitulo debe explicar que se gestiona o que accion puede realizar el usuario; no debe repetir literalmente el titulo.
* El titulo usa `text-3xl` o `text-4xl` y peso `font-extrabold`.
* El subtitulo usa `mt-1 text-sm` o `text-base`, con `text-neutral-500 dark:text-neutral-400`.
* Ambos deben vivir dentro del mismo bloque del header y mantener el layout full-width.
* No dejes titulos aislados en listados, formularios o pantallas de configuracion, excepto paginas especiales como errores, login o dashboards visuales.

```html
<div>
  <h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Sucursales</h1>
  <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Gestiona oficinas y puntos de venta de la empresa.</p>
</div>
```

```html
<div class="flex h-full w-full min-w-0 flex-col sm:absolute sm:inset-0 sm:overflow-hidden">
  
  <!-- Header de Página -->
  <div class="relative flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
    <div>
      <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Título de Página</div>
      <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Administra los registros de este módulo.</p>
    </div>
    <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4">
      <button mat-flat-button class="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
        <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
        Añadir Nuevo
      </button>
    </div>
  </div>

  <!-- Contenedor Principal Edge-to-Edge -->
  <div class="flex flex-auto overflow-hidden">
    <div class="flex flex-col flex-auto sm:mb-18 overflow-hidden sm:overflow-y-auto">
      
      <div class="grid">
        <!-- Header del Grid -->
        <div class="standard-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <div>Columna 1</div>
          <div class="hidden sm:block">Columna Opcional</div>
          <div>Acciones</div>
        </div>
        
        <!-- Estado Vacío -->
        @if (data().length === 0) {
          <div class="flex flex-auto justify-center p-6 sm:p-10">
            <app-empty-state 
              type="no-data" 
              title="Sin datos" 
              (action)="router.navigate(['/path/to/new'])" 
            />
          </div>
        } @else {
          <!-- Filas -->
          @for (item of data(); track item.id) {
            <div class="standard-grid grid items-center gap-4 py-3 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800">
              <div>{{ item.prop1 }}</div>
              <div class="hidden sm:block">{{ item.prop2 }}</div>
              <div><!-- Acciones --></div>
            </div>
          }
        }
      </div>
    </div>
  </div>
</div>
```
* **CSS Requerido**: El componente debe definir `.standard-grid { grid-template-columns: ... }` ajustando los anchos por cada breakpoint de manera responsiva.
* **Componente Vacío**: Usar siempre `app-empty-state` cuando no haya datos.
* Badges de estado: Usar elementos `span` con `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold` combinando bg/text en colores pasteles para light theme (ej. bg-emerald-100 text-emerald-800) y opacidades para dark theme (ej. dark:bg-emerald-500/10 dark:text-emerald-400).

### Filtros en Listados
Todo listado con volumen de datos debe incluir filtros para facilitar la búsqueda. Aplica según la complejidad:

* **Filtros básicos**: Cuando la lista tiene 1-3 criterios simples, ubícalos en la barra de la cabecera de la página (junto al botón "Añadir Nuevo") en una fila responsiva:
  ```html
  <div class="flex flex-col lg:flex-row lg:items-center gap-3">
    <mat-form-field appearance="outline" class="lg:max-w-xs w-full">
      <mat-icon matPrefix svgIcon="search" class="icon-size-4"></mat-icon>
      <mat-label>Buscar</mat-label>
      <input matInput (input)="filterByText($event)" placeholder="Buscar por nombre o correo...">
    </mat-form-field>
    <mat-form-field appearance="outline" class="lg:max-w-56 w-full">
      <mat-label>Estado</mat-label>
      <mat-select [(ngModel)]="filterEstado">
        <mat-option [value]="'TODOS'">Todos</mat-option>
        <mat-option value="ACTIVO">Activo</mat-option>
        <mat-option value="INACTIVO">Inactivo</mat-option>
      </mat-select>
    </mat-form-field>
  </div>
  ```
* **Filtros avanzados**: Cuando hay más de 3 criterios o filtros por rangos (fechas, montos, categorías, múltiples selects), agrupa en un panel desplegable bajo la cabecera:
  * Botón `mat-stroked-button` con ícono `filter` o `sliders-horizontal` que alterna la visibilidad del panel (`[matTooltip]="'Filtros'"`).
  * Panel `@if (showFilters)` con grid de `mat-form-field` (2-4 columnas) y acciones **"Aplicar"** y **"Limpiar"** (`mat-flat-button` + `mat-stroked-button`).
* **Filtrado reactivo**: Implementa el filtrado con **Angular Signals** (`computed`) sobre los datos cargados, o delega al backend mediante `queryParams`/`@Query()` si el dataset es grande (paginación server-side).
* **Estado sin resultados**: Si tras aplicar filtros la lista queda vacía, mostrar `<app-empty-state>` con botón **"Limpiar filtros"** que resetea todos los controles.
* **Estilos**: Mantener siempre `appearance="outline"`, fondos `bg-white dark:bg-neutral-900`, labels `text-neutral-500` y acento `blue-600` coherentes con la paleta.

---

## 6. Feedback Visual y Experiencia de Usuario (UX)

Para garantizar una experiencia premium e interactiva, aplica obligatoriamente los siguientes elementos donde corresponda:

* **Tooltips**: Añade tooltips (ej. `[matTooltip]="'Texto'"` de Angular Material) en botones de ícono, acciones secundarias y elementos donde la función no sea inmediatamente obvia por texto.
* **Loading Spinners & Skeletons**: 
  * Usa placeholders de carga (`skeleton` screens o clases de `animate-pulse`) durante la carga inicial de datos de una página.
  * Usa spinners de carga (ej. `<mat-spinner [diameter]="20">` o SVG spinners) dentro de botones cuando el usuario envía un formulario o ejecuta una acción, deshabilitando el botón temporalmente.
* **Alertas y Feedback (Snackbars en la parte inferior - OBLIGATORIO)**:
  - Proporciona feedback visual inmediato tras el resultado de cualquier acción importante (ej. "Producto creado con éxito", "Usuario actualizado", "Código generado", "Error al procesar").
  - **Uso Obligatorio de `MatSnackBar`**: Emite siempre mensajes breves con `MatSnackBar` ubicados en la **parte inferior central de la pantalla** (`verticalPosition: 'bottom'`).
  - **Prohibición de Toasts Superiores**: Queda terminantemente prohibido mostrar toasts flotantes en la esquina superior (`top-right` / `top-center`) o tarjetas superpuestas sobre el header o área de trabajo.
  - **Patrón Oficial de Invocación**:
    ```typescript
    import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

    // En imports del componente standalone:
    imports: [..., MatSnackBarModule]

    // Inyección:
    private snackBar = inject(MatSnackBar);

    // Acción exitosa o informativa:
    this.snackBar.open(
      'Producto guardado con éxito',
      this.transloco.translate('common.close') || 'Cerrar',
      { duration: 3000 }
    );

    // Error al procesar:
    this.snackBar.open(
      err?.error?.message || 'Error al guardar los cambios',
      this.transloco.translate('common.close') || 'Cerrar',
      { duration: 4000 }
    );
    ```

---

## 7. Anti-patrones: QUÉ NO HACER (Prompts Negativos)

Para evitar resultados repetitivos, genéricos y de baja calidad, la IA **NUNCA** debe:

### Notificaciones y Feedback
* **Nunca** usar ni crear notificaciones flotantes (toasts) en la parte superior derecha (`top-right`) ni cajas flotantes que se superpongan sobre el header, barra de usuario o contenido. Toda alerta de feedback debe renderizarse como snackbar en la **parte inferior** con `MatSnackBar`.

### Texto y contenido
* **Nunca** dejar inputs o selects sin placeholder. Todo campo editable de un formulario o filtro debe incluir un placeholder con el formato real del dato (ver sección 5, "Formularios y Placeholders").
* **Nunca** usar nombres de persona genéricos como "Juan Perez", "John Doe", "Pedro", "María" en datos demo, avatares o textos de ejemplo. Prefiere nombres neutros, abreviaturas o datos funcionales de negocio.
* **Nunca** inventar datos mock irrelevantes (correos tipo `usuario@gmail.com`, URLs `https://example.com`) cuando exista un contexto real. Usa datos coherentes con el dominio (RNC, productos, clientes del negocio).
* **Nunca** usar textos placeholder genéricos de saludo tipo "Lorem ipsum", "Pendiente de implementar", "Coming soon", "TODO". Escribe contenido real y útil.
* **Nunca** repetir la misma frase patrón en todos los módulos (ej. siempre "Gestión de X", "Administración de X"). Varía la redacción según el contexto.

### Diseño y estructura
* **No dupliques** componentes: SIEMPRE revisa y reutiliza los que ya existen en `src/app/shared/components/` antes de crear uno nuevo.
* **No** copies bloques idénticos de HTML/CSS entre pantallas sin adaptar las clases de grid (`standard-grid`), la paleta y el contexto real de cada módulo.
* **No dejes** contenido de plantilla sin personalizar (botones "Get Started", textos en inglés, imágenes mock, `http://...` externos).
* **No ignores** el modo oscuro: ninguna clase puede quedar sin su contraparte `dark:`.
* **No uses** íconos con prefijos desconocidos (`heroicons_solid:`, `heroicons_outline:`) ni URLs externas para avatares/imágenes.
* **No dejes** botones de acción sin un ícono representativo de la acción (ver sección 3, "Íconos en Botones"), ni uses un ícono que no coincida semánticamente con el botón.

### Comportamiento
* **No** agregues pestañas, secciones, botones o campos que no aporten valor real al flujo del módulo (ej. "Diccionario de Permisos" o "Nuevo Módulo" si se manejan internamente).
* **No** dejes acciones de UI sin lógica (botones decorativos que no hacen nada). Todo botón debe ejecutar una acción real o ser eliminado.
* **No** ocultes errores con `catchError(() => [])` sin antes intentar manejar correctamente la autenticación y el estado real (evita silenciar fallos de negocio).
* **No** crees rutas o menús rotos: cada item del sidebar debe tener una ruta válida y un componente cargado.
* No uses texto placeholder largo o genérico en los estados vacíos; sé específico y accionable.

---

## 8. Regla de Oro para la IA
1. Siempre inspecciona los componentes en `src/app/shared/components/` antes de escribir nueva interfaz.
2. Mantén estricta compatibilidad con el modo oscuro (`dark:` en todas las clases de Tailwind).
3. Usa la paleta de colores `neutral-*`, `blue-*` y `emerald-*` documentada arriba para mantener cohesión visual impecable.
4. Usa obligatoriamente `MatSnackBar` en la parte inferior para notificaciones y alertas de feedback (prohibido toasts superiores).
5. Antes de entregar, revisa la sección **7 (Anti-patrones)** y asegúrate de que el resultado no contenga placeholders "Ej.", datos mock genéricos, íconos inválidos ni componentes duplicados.
6. Todo input/select de formularios y filtros debe incluir un **placeholder con el formato real** del dato (sin "Ej." ni "Ingrese el X").

