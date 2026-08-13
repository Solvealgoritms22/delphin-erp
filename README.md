# Dolphin ERP

Aplicación de escritorio multiplataforma (Electron + Angular 22) para gestión empresarial.

## Stack

- **Frontend**: Angular 22 (standalone, signals, control flow nativo)
- **Desktop**: Electron 43 + electron-builder (NSIS)
- **UI**: Angular Material 22 + TailwindCSS 4
- **Estado**: TanStack Angular Query + Signals
- **i18n**: Transloco (EN/ES)
- **Backend**: NestJS (apps/api) + Prisma + PostgreSQL

## Monorepo Structure

```
delphin-erp/
├── apps/
│   ├── desktop/     # Electron + Angular app
│   └── api/         # NestJS backend
├── .github/workflows/
└── package.json     # npm workspaces root
```

## Desarrollo

### Requisitos
- Node.js >= 24.0.0
- npm >= 10

### Instalación
```bash
npm ci
```

### Ejecutar en modo desarrollo (desktop)
```bash
npm run dev
# o solo desktop:
npm run start:desktop
```
Esto levanta:
- Angular dev server en `http://localhost:3873`
- Electron cargando desde el dev server (con hot reload)

### Solo backend (API)
```bash
npm run start:api
```

## Scripts Desktop (`apps/desktop/package.json`)

| Script | Descripción |
|--------|-------------|
| `npm run start` | Angular dev server (puerto 3873) |
| `npm run electron:start` | Dev completo: Angular + Electron |
| `npm run build` | Build Angular producción (`--base-href ./`) |
| `npm run electron:build` | Build Angular + `electron-builder` (empaqueta) |
| `npm run electron:pack` | Build + `electron-builder --dir` (desempaqueta para inspección) |
| `npm run electron:publish` | Build + publica a GitHub Releases |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## Build de producción local

```bash
cd apps/desktop
npm run electron:build
```
Genera instalador NSIS en `apps/desktop/dist/electron/`.

## Sistema de Actualizaciones Automáticas

- **Provider**: GitHub Releases (`Solvealgoritms22/delphin-erp`)
- **Canal**: Estable (tags `v*.*.*`)
- **Check**: Al iniciar la app (solo en build empaquetado) + manual desde Ajustes → Acerca de
- **UX**: Notificación discreta (snackbar) con progreso de descarga y botones Instalar / Más tarde / Reiniciar
- **Seguridad**: `contextIsolation: true`, `nodeIntegration: false`, preload script con `contextBridge`

## Publicar una nueva versión (Release)

1. Bumpear versión en `apps/desktop/package.json`:
   ```bash
   # Desde la raíz del repo
   npm version patch --workspace=apps/desktop
   # o minor/major según semver
   ```

2. Commit + tag:
   ```bash
   git add apps/desktop/package.json
   git commit -m "chore(release): v1.0.1"
   git tag v1.0.1
   git push origin main --tags
   ```

3. El workflow **Desktop Release** (`.github/workflows/desktop-release.yml`) se ejecuta en `windows-latest`:
   - Instala deps, lint, typecheck
   - `electron-builder --publish always`
   - Sube `.exe`, `latest.yml`, `.blockmap` a GitHub Releases

4. Usuarios con la app instalada detectan la actualización al siguiente inicio.

## Code Signing (Windows)

Para evitar SmartScreen, configurar en GitHub Secrets:
- `CSC_LINK` — certificado `.p12` codificado en base64
- `CSC_KEY_PASSWORD` — contraseña del certificado

El workflow ya tiene las variables de entorno preparadas (comentadas). Descomenta cuando tengas el certificado.

## Variables de entorno (Desktop)

No se requieren `.env` para la app de escritorio en desarrollo. La build de producción usa `base-href ./` y carga desde `file://`.

## Testing

```bash
# Desktop
cd apps/desktop
npm run test
npm run lint
npx tsc --noEmit
```

## Licencia

Privada - Dolphin ERP
