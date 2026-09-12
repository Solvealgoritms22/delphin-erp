// Entorno de Producción Cloud para Dolphin ERP.
// Resuelve dinámicamente la URL del API Cloud:
// 1. Runtime injection de Electron / Windows (window.__DOLPHIN_API_URL__)
// 2. Configuración guardada en perfil local (dolphin_custom_api_url)
// 3. Endpoint Cloud de producción predeterminado (https://api.dolphinerp.com/v1)
const getCloudApiUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).__DOLPHIN_API_URL__) {
    return (window as any).__DOLPHIN_API_URL__;
  }
  if (typeof localStorage !== 'undefined') {
    const custom = localStorage.getItem('dolphin_custom_api_url');
    if (custom) return custom;
  }
  return 'https://api.dolphinerp.com/v1';
};

export const environment = {
  production: true,
  apiUrl: getCloudApiUrl(),
  webPushPublicKey: '',
  googleMapsApiKey: (typeof window !== 'undefined' && (window as any).__GOOGLE_MAPS_API_KEY__) || ''
};
