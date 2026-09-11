// Source: Google Maps Platform Code Assist
import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface LatLngCoords {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  private loadPromise: Promise<any> | null = null;
  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly activeApiKey = signal<string>(this.resolveInitialKey());

  private resolveInitialKey(): string {
    if (typeof window === 'undefined') return '';
    const envKey = (environment as any).googleMapsApiKey || '';
    if (envKey) return envKey;
    return localStorage.getItem('dolphin_google_maps_api_key') || '';
  }

  hasApiKey(): boolean {
    return !!this.activeApiKey().trim();
  }

  setApiKey(key: string): void {
    const trimmed = key.trim();
    this.activeApiKey.set(trimmed);
    if (typeof localStorage !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('dolphin_google_maps_api_key', trimmed);
      } else {
        localStorage.removeItem('dolphin_google_maps_api_key');
      }
    }
    this.loadPromise = null;
    this.isLoaded.set(false);
    this.loadError.set(null);
  }

  load(): Promise<any> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Window no disponible'));
    }

    if ((window as any).google?.maps) {
      this.isLoaded.set(true);
      return Promise.resolve((window as any).google.maps);
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    const key = this.activeApiKey();
    if (!key) {
      const err = 'No se ha configurado una clave de API de Google Maps.';
      this.loadError.set(err);
      return Promise.reject(new Error(err));
    }

    this.isLoading.set(true);
    this.loadError.set(null);

    this.loadPromise = new Promise<any>((resolve, reject) => {
      const callbackName = '__dolphin_gmaps_callback_' + Math.random().toString(36).substring(2, 9);

      (window as any)[callbackName] = () => {
        this.isLoading.set(false);
        this.isLoaded.set(true);
        delete (window as any)[callbackName];
        resolve((window as any).google.maps);
      };

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      // Libraries places, marker, geometry and internal usage attribution tracking
      const params = new URLSearchParams({
        key: key,
        libraries: 'places,marker,geometry',
        v: 'weekly',
        callback: callbackName,
        internalUsageAttributionIds: 'gmp_mcp_codeassist_v0.1_github',
      });
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

      script.onerror = (e) => {
        this.isLoading.set(false);
        const errMsg = 'Error al cargar el script de Google Maps JavaScript API.';
        this.loadError.set(errMsg);
        delete (window as any)[callbackName];
        this.loadPromise = null;
        reject(new Error(errMsg));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  async reverseGeocode(coords: LatLngCoords): Promise<string> {
    const maps = await this.load();
    const geocoder = new maps.Geocoder();

    return new Promise<string>((resolve, reject) => {
      geocoder.geocode({ location: coords }, (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          resolve(results[0].formatted_address);
        } else {
          resolve(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        }
      });
    });
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address.trim()) return null;
    const maps = await this.load();
    const geocoder = new maps.Geocoder();

    return new Promise<GeocodeResult | null>((resolve) => {
      geocoder.geocode({ address }, (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const loc = results[0].geometry.location;
          resolve({
            lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
            lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng,
            formattedAddress: results[0].formatted_address,
            placeId: results[0].place_id,
          });
        } else {
          resolve(null);
        }
      });
    });
  }
}
