// Source: Google Maps Platform Code Assist
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type LatLngCoords = {
  lat: number;
  lng: number;
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
};

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  private readonly http = inject(HttpClient);
  private loadPromise: Promise<any> | null = null;
  private configFetched = false;

  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly activeApiKey = signal<string>(this.resolveInitialKey());

  private resolveInitialKey(): string {
    if (typeof window === 'undefined') return '';
    return (environment as any).googleMapsApiKey || '';
  }

  hasApiKey(): boolean {
    return !!this.activeApiKey().trim();
  }

  setApiKey(key: string): void {
    this.activeApiKey.set(key?.trim() || '');
    if (this.loadPromise && !(typeof window !== 'undefined' && (window as any).google?.maps)) {
      this.loadPromise = null;
    }
  }

  async fetchPlatformKey(): Promise<string> {
    if (this.hasApiKey()) return this.activeApiKey();
    if (this.configFetched) return this.activeApiKey();

    this.configFetched = true;
    try {
      const config = await firstValueFrom(
        this.http.get<{ googleMapsApiKey?: string }>(`${environment.apiUrl}/system/config`)
      );
      if (config?.googleMapsApiKey) {
        const key = config.googleMapsApiKey.trim();
        this.activeApiKey.set(key);
        return key;
      }
    } catch {
      // Si el endpoint no está disponible en offline
    }
    return '';
  }

  async load(): Promise<any> {
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

    let key = this.activeApiKey();
    if (!key) {
      key = await this.fetchPlatformKey();
    }

    if (!key) {
      const err = 'La clave de Google Maps Platform no está configurada en las variables de entorno de Dolphin ERP.';
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

      script.onerror = (_e) => {
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

    return new Promise<string>((resolve, _reject) => {
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
