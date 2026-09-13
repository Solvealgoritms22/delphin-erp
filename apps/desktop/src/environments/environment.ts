export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/v1',
  webPushPublicKey: 'BDIxJQIr8sAho-J_QNIDgcRBUcGvBWcpRmOCQcu4Goc7jSStcaY-gJsJiwe8wGyH4zwKMEF8fIti7pJSmKLInvM',
  googleMapsApiKey: (typeof globalThis !== 'undefined' && (globalThis as any).window?.__GOOGLE_MAPS_API_KEY__) || ''
};
