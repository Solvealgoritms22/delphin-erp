export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/v1',
  webPushPublicKey: 'BDIxJQIr8sAho-J_QNIDgcRBUcGvBWcpRmOCQcu4Goc7jSStcaY-gJsJiwe8wGyH4zwKMEF8fIti7pJSmKLInvM',
  googleMapsApiKey: (typeof window !== 'undefined' && ((window as any).__GOOGLE_MAPS_API_KEY__ || localStorage?.getItem('dolphin_google_maps_api_key'))) || ''
};
