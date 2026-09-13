// Entorno de Producción para Dolphin ERP Desktop.
// Resuelve dinámicamente la URL del API:
// 1. Runtime injection de Electron / Preload (window.__DOLPHIN_API_URL__ o window.dolphinServer.getApiUrl())
// 2. Configuración personalizada en perfil local (dolphin_custom_api_url)
// 3. Fallback al servidor local por defecto (http://localhost:3000/v1)
const getApiUrl = (): string => {
  const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : undefined;
  if (win) {
    if (win.__DOLPHIN_API_URL__) {
      return win.__DOLPHIN_API_URL__;
    }
    if (win.dolphinServer?.getApiUrl?.()) {
      return win.dolphinServer.getApiUrl();
    }
  }
  const local = typeof globalThis !== 'undefined' ? (globalThis as any).localStorage : undefined;
  if (local) {
    const custom = local.getItem('dolphin_custom_api_url');
    if (custom?.trim()) return custom.trim();
  }
  return 'http://localhost:3000/v1';
};

export const environment = {
  production: true,
  apiUrl: getApiUrl(),
  webPushPublicKey: '',
  googleMapsApiKey: (typeof globalThis !== 'undefined' && (globalThis as any).window?.__GOOGLE_MAPS_API_KEY__) || ''
};
