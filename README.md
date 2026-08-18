<div align="center">

  # 🐬 Dolphin ERP

  ### Sistema Integral de Gestión Empresarial & Facturación Fiscal Multi-Tenant

  [![Angular](https://img.shields.io/badge/Angular-22.1-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
  [![Electron](https://img.shields.io/badge/Electron-43.3-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
  [![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
  [![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

  <p align="center">
    <strong>Dolphin ERP</strong> es una solución moderna, reactiva y robusta diseñada para la administración empresarial integral, emisión de comprobantes fiscales electrónicos (e-CF DGII), control de inventarios multialmacén, facturación automatizada y analítica impulsada por Inteligencia Artificial local y en la nube.
  </p>

</div>

---

## 📑 Tabla de Contenidos

1. [🌟 Características Principales](#-características-principales)
2. [🏗️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
3. [🧩 Módulos del Sistema](#-módulos-del-sistema)
4. [🛠️ Stack Tecnológico](#️-stack-tecnológico)
5. [📁 Estructura del Monorepo](#-estructura-del-monorepo)
6. [🚀 Guía de Inicio Rápido](#-guía-de-inicio-rápido)
7. [⚙️ Configuración de Variables de Entorno](#️-configuración-de-variables-de-entorno)
8. [📦 Compilación y Distribución Desktop](#-compilación-y-distribución-desktop)
9. [🔒 Seguridad y Auditoría](#-seguridad-y-auditoría)
10. [👥 Contribución y Licencia](#-contribución-y-licencia)

---

## 🌟 Características Principales

* 🏢 **Arquitectura Multi-Tenant Aislada:** Soporte para múltiples empresas y sucursales por usuario con particionamiento de datos estricto a nivel de base de datos.
* 🤖 **AI Copilot & Agente ERP Inteligente:** Asistente conversacional con acceso seguro de solo lectura a la base de datos, soporte para modelos locales ultraligeros (**Ollama** `qwen2.5:3b` / `llama3.2:3b`) o en la nube (Groq, OpenRouter, Gemini), streaming de tokens en tiempo real (SSE) y persistencia en PostgreSQL.
* 🧾 **Facturación Fiscal e-CF (DGII República Dominicana):** Gestión de secuencias NCF (B01, B02, B14, B15, E31, E32, etc.), cálculo de ITBIS, control de vencimientos y transmisión directa a **FiscalBridge**.
* 📦 **Inventario & Kardex Multialmacén:** Trazabilidad completa de movimientos de entrada, salida, transferencias entre almacenes y ajustes de stock en tiempo real.
* 💳 **Suscripciones y Pagos SaaS:** Integración nativa con **Stripe** para planes mensuales/anuales (Trial de 15 días, Pro, Enterprise), checkout y portal de clientes.
* 🔔 **Notificaciones Omnicanal:** Notificaciones Push en el navegador (Web Push API), WebSockets en tiempo real y correos transaccionales (SMTP / Nodemailer / Resend).
* 🛡️ **Seguridad Empresarial:** Autenticación robusta con JWT, hashing Argon2/Bcrypt, verificación de cuenta mediante código OTP de 6 dígitos, soporte 2FA/MFA, control de sesiones activas y registro de auditoría (`ActivityLog`).
* 🔄 **Auto-Actualizaciones Desktop:** Empaquetado nativo con **Electron** y distribución automatizada vía GitHub Releases con `electron-updater`.

---

## 🏗️ Arquitectura del Sistema

El proyecto está estructurado como un **Monorepo NPM Workspace** desacoplado, comunicando la aplicación de escritorio y el servidor API mediante protocolos REST, Server-Sent Events (SSE) y WebSockets:

```mermaid
flowchart TB
    subgraph ClientLayer ["🖥️ Frontend & Desktop (apps/desktop)"]
        UI["Angular 22 + Angular Material\n(TailwindCSS 4 + Signals)"]
        Electron["Electron 43 Shell\n(Auto-updater + Preload Bridge)"]
        UI <--> Electron
    end

    subgraph APILayer ["⚡ Backend Gateway (apps/api)"]
        Nest["NestJS 11 Core API\n(Modular Architecture)"]
        AuthGuards["JWT Auth & Multi-Tenant Guard\n(RBAC + Session Validator)"]
        AIService["AI Agent Service\n(SSE Streaming + Context Collector)"]
        FiscalBridge["FiscalBridge Client\n(e-CF DGII Gateway)"]
        StripeService["Stripe Billing & Webhooks"]
    end

    subgraph DataLayer ["💾 Persistencia & Motores Locales"]
        Postgres[(PostgreSQL Database\nPrisma ORM 6)]
        Redis[(Redis Cache / Queue)]
        Ollama["🦙 Ollama Local Daemon\n(qwen2.5:3b / llama3.2:3b)"]
    end

    UI -- "HTTPS / REST / SSE" --> Nest
    Nest --> AuthGuards
    AuthGuards --> AIService
    AuthGuards --> FiscalBridge
    AuthGuards --> StripeService
    Nest -- "Prisma Client" --> Postgres
    Nest -- "PubSub / Queue" --> Redis
    AIService -- "Local HTTP (11434)" --> Ollama
```

---

## 🧩 Módulos del Sistema

### 1. 🤖 Agente de Inteligencia Artificial (`apps/api/src/modules/ai-agent`)
* **Consultas en Lenguaje Natural:** El usuario consulta ventas, stock, clientes, métricas o auditoría y el agente sintetiza respuestas en tablas y Markdown.
* **Aislamiento Seguro:** El agente solo tiene acceso en modo de lectura al contexto de la empresa activa del usuario.
* **Persistencia PostgreSQL:** Todas las conversaciones (`AiConversation`) y mensajes (`AiMessage`) quedan guardados en base de datos con soporte multi-hilo.

### 2. 🧾 Comercial & Facturación Fiscal (`apps/api/src/modules/invoices`, `sequences`)
* **Emisión de Facturas:** Generación de comprobantes con detalle de productos, impuestos y descuentos.
* **Secuencias NCF DGII:** Control de rangos numéricos, alertas de consumo y fechas límite de emisión.
* **Anulación Segura:** Cancelación de facturas con reversión automática de existencias al almacén de origen.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant UI as Desktop App (Angular)
    participant API as NestJS Backend
    participant DB as PostgreSQL (Prisma)
    participant FB as FiscalBridge (DGII)

    Usuario->>UI: Crear Factura de Venta
    UI->>API: POST /v1/invoices (Detalle + NCF Type)
    API->>DB: Validar Stock y Reservar Secuencia NCF
    API->>DB: Insertar FacturaVenta y Descontar Inventario
    alt Es Comprobante Electrónico (e-CF)
        API->>FB: Transmitir XML firmado a DGII
        FB-->>API: TrackID / Aprobación Comercial
        API->>DB: Actualizar estado fiscal a TRANSMITIDA
    end
    API-->>UI: Factura confirmada con NCF generado
```

### 3. 📦 Catálogos e Inventario (`apps/api/src/modules/catalogs`, `inventory`)
* **Gestión de Productos:** SKU, código de barras, precios de compra/venta, costos promedio y márgenes.
* **Categorías, Marcas y Unidades de Medida:** Jerarquías ordenadas y filtros avanzados.
* **Kardex y Movimientos:** Registro inmutable de cada entrada, salida o ajuste con referencia al usuario responsable.

### 4. 🏢 Multi-Tenancy & Configuración (`apps/api/src/modules/empresas`, `sucursales`)
* **Perfiles Empresariales:** RNC, país (optimizado para República Dominicana), dirección física, teléfono, sitio web y logo personalizado.
* **Sucursales:** Puntos de venta independientes por empresa.
* **Control de Accesos (RBAC):** Roles personalizados con matriz de permisos a nivel de lectura, escritura y eliminación.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | [Angular](https://angular.dev/) | `^22.1.0` | Arquitectura Standalone, Signals, Control Flow nativo |
| **Desktop Runtime** | [Electron](https://www.electronjs.org/) | `^43.3.0` | Empaquetado nativo para Windows / macOS / Linux |
| **UI Components** | [Angular Material](https://material.angular.io/) | `22.1.0` | Componentes de diseño accesibles y temas oscuros |
| **Styling Engine** | [TailwindCSS](https://tailwindcss.com/) | `^4.3.3` | Estilos utilitarios de alto rendimiento |
| **Iconografía** | [ng-animated-icons](https://www.npmjs.com/package/ng-animated-icons) | `^22.0.0` | Íconos animados SVG interactivos |
| **Internacionalización** | [Transloco](https://jsverse.github.io/transloco/) | `8.4.0` | Soporte multi-idioma (Español / Inglés) |
| **Backend Framework** | [NestJS](https://nestjs.com/) | `^11.0.1` | API Gateway modular, inyección de dependencias |
| **ORM & Database** | [Prisma](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/) | `^6.19.3` | Modelado tipado, migraciones y pool de conexiones |
| **Motor de IA Local** | [Ollama](https://ollama.com/) | `Latest` | Ejecución local de Small Language Models (`qwen2.5:3b`) |
| **Cache & Colas** | [Redis](https://redis.io/) / [ioredis](https://www.npmjs.com/package/ioredis) | `^6.0.0` | Caché en memoria y colas de tareas en segundo plano |
| **Pasarela de Pagos** | [Stripe SDK](https://stripe.com/) | `Latest` | Suscripciones, webhooks y facturación recurrente |

---

## 📁 Estructura del Monorepo

```text
delphin-erp/
├── apps/
│   ├── api/                              # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # Esquema central de datos PostgreSQL
│   │   │   └── seed.ts                   # Semillas de inicialización (Planes, Roles)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── activity-log/         # Logs de auditoría y seguridad
│   │       │   ├── ai-agent/             # Agente IA, herramientas DB y persistencia
│   │       │   ├── auth/                 # JWT, Passport, OTP, MFA y sesiones
│   │       │   ├── catalogs/             # Productos, Categorías, Marcas, Unidades
│   │       │   ├── commercial/           # Clientes y Proveedores
│   │       │   ├── dashboard/            # Métricas agregadas y analítica
│   │       │   ├── empresas/             # Multi-tenancy, perfiles fiscales y logos
│   │       │   ├── inventory/            # Almacenes, Stock y Movimientos
│   │       │   ├── invoices/             # Facturación de venta y FiscalBridge
│   │       │   ├── notifications/        # Web Push, WebSockets y Email
│   │       │   ├── payments/             # Integración con Stripe
│   │       │   ├── roles/                # RBAC y permisos
│   │       │   ├── sequences/            # Secuencias NCF DGII
│   │       │   ├── sucursales/           # Sucursales por empresa
│   │       │   └── users/                # Gestión de usuarios y membresías
│   │       └── main.ts                   # Bootstrap de la aplicación NestJS
│   │
│   └── desktop/                          # Frontend Angular + Electron
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/                 # Auth guards, interceptores HTTP, state
│       │   │   ├── domains/
│       │   │   │   ├── admin/            # Vistas administrativas y módulos de negocio
│       │   │   │   │   └── modules/
│       │   │   │   │       ├── apps/         # AI Chat Copilot
│       │   │   │   │       ├── catalogs/     # Vistas de productos e inventario
│       │   │   │   │       ├── commercial/   # Clientes, Proveedores, Facturas, NCF
│       │   │   │   │       └── settings/     # Configuración de empresa, usuarios, roles
│       │   │   │   └── auth/             # Sign-in, Sign-up, Verificación OTP
│       │   │   └── shared/               # Componentes UI reutilizables (ConfirmDialog, Skeletons)
│       ├── main.js                       # Proceso principal de Electron
│       └── preload.js                    # Preload script seguro con ContextBridge
│
├── .github/workflows/                    # CI/CD y publicación automatizada de releases
├── package.json                          # Raíz de NPM Workspaces
└── README.md                             # Documentación del proyecto
```

---

## 🚀 Guía de Inicio Rápido

### Prerrequisitos

* **Node.js:** `>= 24.0.0`
* **NPM:** `>= 10.0.0`
* **PostgreSQL:** `>= 15.0`
* **Ollama (Opcional para IA local):** [Descargar Ollama](https://ollama.com/)

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/Solvealgoritms22/delphin-erp.git
cd delphin-erp
npm ci
```

### 2. Configuración de la Base de Datos

Copia el archivo de ejemplo en el backend y ajusta la cadena de conexión a PostgreSQL:

```bash
cd apps/api
cp .env.example .env
```

Aplica el esquema y genera el cliente Prisma:

```bash
npx prisma migrate deploy
npx prisma db seed
cd ../..
```

### 3. Ejecución en Modo Desarrollo

Para levantar el entorno completo (Backend NestJS + Frontend Angular):

```bash
# Inicia la API (http://localhost:3000) y la App Desktop (http://localhost:3873)
npm run dev
```

O si prefieres iniciar los servicios por separado:

```bash
# Terminal 1: Backend API
npm run start:api

# Terminal 2: Frontend Angular
npm run start:desktop

# Terminal 3 (Opcional): Ejecutar dentro de la ventana de Electron
npm run electron:start --workspace=apps/desktop
```

---

## ⚙️ Configuración de Variables de Entorno

Archivo `apps/api/.env`:

```env
# Servidor & Entorno
PORT=3000
NODE_ENV=development
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3873

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dolphin_erp?schema=public"

# Autenticación JWT
JWT_SECRET=super_secret_jwt_key_dolphin_erp_2026
JWT_EXPIRES_IN=7d

# Motor de Inteligencia Artificial (Ollama Local o Cloud)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
USE_OLLAMA=true

# Proveedores Cloud de IA (Opcional como fallback)
OPENROUTER_API_KEY=
GROQ_API_KEY=

# Stripe Billing (SaaS)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Envío de Correos (SMTP / Invitaciones / Verificación)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=no-reply@dolphin-erp.com
SMTP_PASS=tu_password_de_aplicacion
SMTP_FROM="Dolphin ERP <no-reply@dolphin-erp.com>"
```

---

## 📦 Compilación y Distribución Desktop

Para generar los instaladores ejecutables de Windows (`.exe` NSIS):

```bash
# Compilar Angular en modo producción y empaquetar con electron-builder
npm run electron:build --workspace=apps/desktop
```

El instalador se generará en la carpeta `apps/desktop/dist/electron/`.

### Publicación Automatizada (GitHub Releases)

1. Actualiza la versión en `apps/desktop/package.json`:
   ```bash
   npm version patch --workspace=apps/desktop
   ```
2. Crea el commit y envía el tag a GitHub:
   ```bash
   git add .
   git commit -m "chore(release): v1.0.7"
   git tag v1.0.7
   git push origin main --tags
   ```
3. La acción de GitHub `.github/workflows/desktop-release.yml` compilará, firmará y publicará el `.exe` automáticamente en los Releases de GitHub.

---

## 🔒 Seguridad y Auditoría

* **Aislamiento Multi-Tenant:** Cada consulta de datos (`findMany`, `create`, `update`) valida estrictamente el `empresaId` extraído del token JWT validado en sesión.
* **Protección XSS & Injection:** `contextIsolation: true` y `nodeIntegration: false` activados en Electron con comunicación segura vía `contextBridge`.
* **Registro de Auditoría:** Registro automático de IPs, navegadores, inicios de sesión y acciones críticas en la tabla `ActivityLog`.
* **Manejo de Contraseñas:** Encriptación con Argon2 y Bcrypt con rondas de coste seguras.
* **Backups por empresa:** Exportaciones cifradas con AES-256-GCM, almacenamiento local privado y conector opcional de Google Drive para propietarios. Ver `docs/backups.md`.

---

## 👥 Contribución y Licencia

Este proyecto es software privado desarrollado por **Solvealgorithms**. Todos los derechos reservados.

<div align="center">
  <sub>Desarrollado con precisión e innovación por el equipo de Dolphin ERP.</sub>
</div>
