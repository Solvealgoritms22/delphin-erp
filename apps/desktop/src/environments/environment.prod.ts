// Entorno de Producción para Dolphin ERP Desktop.
// Resuelve dinámicamente la URL del API:
// 1. Runtime injection de Electron / Preload (window.__DOLPHIN_API_URL__ o window.dolphinServer.getApiUrl())
// 2. Configuración personalizada en perfil local (dolphin_custom_api_url)
// 3. Fallback al servidor local por defecto (http://localhost:3000/v1)
const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    if ((window as any).__DOLPHIN_API_URL__) {
      return (window as any).__DOLPHIN_API_URL__;
    }
    if ((window as any).dolphinServer?.getApiUrl?.()) {
      return (window as any).dolphinServer.getApiUrl();
    }
    if (typeof localStorage !== 'undefined') {
      const custom = localStorage.getItem('dolphin_custom_api_url');
      if (custom?.trim()) return custom.trim();
    }
  }
  return 'http://localhost:3000/v1';
};

export const environment = {
  production: true,
  apiUrl: getApiUrl(),
  webPushPublicKey: '',
  googleMapsApiKey: (typeof window !== 'undefined' && (window as any).__GOOGLE_MAPS_API_KEY__) || ''
};
