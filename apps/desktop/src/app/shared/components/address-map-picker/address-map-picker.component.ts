// Source: Google Maps Platform Code Assist
import {
  Component,
  ElementRef,
  forwardRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GoogleMapsLoaderService, LatLngCoords } from '../../../core/maps/google-maps-loader.service';

export type PlacePrediction = {
  description: string;
  placeId: string;
};

@Component({
  selector: 'app-address-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="space-y-3 w-full">
      <!-- Buscador y Acciones Superiores -->
      <div class="relative">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input
              #searchInput
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchInput($event)"
              (keydown.enter)="onSearchEnter($event)"
              [disabled]="disabled()"
              [placeholder]="placeholder"
              class="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-2xs"
            />
            @if (searchQuery.trim()) {
              <button
                type="button"
                (click)="clearSearch()"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            }
          </div>

          <!-- Botón de Ubicación Actual (GPS) -->
          <button
            type="button"
            (click)="locateCurrentPosition()"
            [disabled]="locating() || disabled()"
            matTooltip="Usar mi ubicación actual"
            class="p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-2xs flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
          >
            @if (locating()) {
              <svg class="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
              </svg>
            }
          </button>
        </div>

        <!-- Menú desplegable de predicciones de Google Places -->
        @if (predictions().length > 0) {
          <div class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto">
            @for (item of predictions(); track item.placeId) {
              <button
                type="button"
                (click)="selectPrediction(item)"
                class="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-start gap-2.5 transition-colors cursor-pointer group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-neutral-400 group-hover:text-blue-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span class="text-xs text-neutral-800 dark:text-neutral-200 group-hover:text-blue-900 dark:group-hover:text-blue-200 leading-snug">
                  {{ item.description }}
                </span>
              </button>
            }
          </div>
        }
      </div>

      <!-- Contenedor del Mapa (Estilo tarjeta similar a la imagen enviada) -->
      <div class="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-xs bg-neutral-100 dark:bg-neutral-950">
        <!-- Mapa interactivo de Google Maps (Activo cuando hay clave y no hay error) -->
        <div
          #mapContainer
          class="w-full h-[220px] sm:h-[260px] bg-neutral-200 dark:bg-neutral-900"
          [class.hidden]="mapsError() || !mapsLoader.hasApiKey()"
        ></div>

        <!-- Placeholder con imagen del mapa en blanco y negro y letras pequeñas en la esquina 'Mapa no disponible' -->
        @if (mapsError() || !mapsLoader.hasApiKey()) {
          <div class="relative w-full h-[220px] sm:h-[260px] overflow-hidden select-none bg-neutral-100 dark:bg-neutral-950">
            <!-- Imagen mapa blanco y negro (estilo vector/callejero solicitado) -->
            <img
              src="images/map-placeholder.png"
              alt="Mapa"
              class="w-full h-full object-cover object-center opacity-90 dark:opacity-45 dark:invert dark:contrast-125 pointer-events-none"
            />

            <!-- Letras pequeñas en la esquina inferior derecha: 'Mapa no disponible' -->
            <div class="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xs text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Mapa no disponible
            </div>
          </div>
        }

        <!-- Indicador de carga de geocodificación o mapa -->
        @if ((loadingMap() || geocoding()) && !mapsError() && mapsLoader.hasApiKey()) {
          <div class="absolute inset-0 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center z-10">
            <div class="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md text-xs font-medium text-neutral-700 dark:text-neutral-200">
              <svg class="animate-spin h-3.5 w-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ geocoding() ? 'Obteniendo dirección...' : 'Cargando Google Maps...' }}</span>
            </div>
          </div>
        }

        <!-- Botón flotante inferior derecho para Abrir en Google Maps (Solo si el mapa está activo) -->
        @if (!mapsError() && mapsLoader.hasApiKey()) {
          <button
            type="button"
            (click)="openInGoogleMaps()"
            matTooltip="Abrir en Google Maps"
            class="absolute bottom-3 right-3 z-20 size-10 rounded-full bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        }
      </div>

      <!-- Tarjeta de Dirección Formateada (Debajo del mapa, igual a la captura de pantalla) -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="block text-2xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Dirección seleccionada
          </label>
          @if (formattedAddress()) {
            <span class="text-[10px] text-neutral-400 font-mono">
              {{ currentCoords().lat.toFixed(5) }}, {{ currentCoords().lng.toFixed(5) }}
            </span>
          }
        </div>

        @if (!isEditingAddress()) {
          <div
            (click)="enableAddressEdit()"
            class="group p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-blue-300 dark:hover:border-blue-700/60 transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="size-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <p
                class="text-sm font-medium leading-snug select-text"
                [class.text-neutral-500]="!formattedAddress()"
                [class.dark:text-neutral-400]="!formattedAddress()"
                [class.text-neutral-900]="!!formattedAddress()"
                [class.dark:text-white]="!!formattedAddress()"
              >
                {{ formattedAddress() || 'Ninguna dirección seleccionada. Haz clic en el mapa o busca un lugar.' }}
              </p>
            </div>
            <span class="text-xs text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              Editar texto
            </span>
          </div>
        } @else {
          <div class="space-y-2">
            <textarea
              [(ngModel)]="manualAddressInput"
              (blur)="saveManualAddress()"
              (keydown.enter)="$event.preventDefault(); saveManualAddress()"
              rows="2"
              class="w-full p-3 text-sm rounded-xl border border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none shadow-2xs"
              placeholder="Detalla o ajusta la dirección"
            ></textarea>
            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                (click)="cancelAddressEdit()"
                class="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="saveManualAddress()"
                class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Guardar</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AddressMapPickerComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressMapPickerComponent implements OnInit, OnDestroy, ControlValueAccessor {
  readonly mapsLoader = inject(GoogleMapsLoaderService);

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  @Input() placeholder = 'Av. 27 de Febrero #123, Ensanche Naco, Santo Domingo';
  @Input() defaultCoords: LatLngCoords = { lat: 18.4861, lng: -69.9312 }; // Santo Domingo, RD

  searchQuery = '';
  readonly formattedAddress = signal<string>('');
  readonly currentCoords = signal<LatLngCoords>(this.defaultCoords);
  readonly predictions = signal<PlacePrediction[]>([]);
  readonly loadingMap = signal(false);
  readonly geocoding = signal(false);
  readonly locating = signal(false);
  readonly disabled = signal(false);
  readonly mapsError = signal(false);
  readonly isEditingAddress = signal(false);
  manualAddressInput = '';

  private map: any = null;
  private marker: any = null;
  private autocompleteService: any = null;
  private placesService: any = null;
  private searchDebounceTimer: any = null;

  private onChange: (value: string) => void = () => { };
  private onTouched: () => void = () => { };

  ngOnInit(): void {
    this.currentCoords.set(this.defaultCoords);
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  // ControlValueAccessor
  writeValue(val: string): void {
    const address = val || '';
    this.formattedAddress.set(address);
    this.manualAddressInput = address;

    if (address.trim() && this.map) {
      void this.geocodeAndCenter(address);
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  private async initMap(): Promise<void> {
    if (!this.mapsLoader.hasApiKey()) {
      return;
    }

    this.loadingMap.set(true);
    try {
      const googleMaps = await this.mapsLoader.load();
      this.mapsError.set(false);

      const center = this.currentCoords();
      this.map = new googleMaps.Map(this.mapContainer.nativeElement, {
        center,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        clickableIcons: true,
      });

      // Marcador de pin rojo arrastrable
      this.marker = new googleMaps.Marker({
        position: center,
        map: this.map,
        draggable: true,
        animation: googleMaps.Animation.DROP,
        title: 'Ubicación seleccionada',
      });

      // Evento: Clic en el mapa para mover marcador y obtener dirección
      this.map.addListener('click', (e: any) => {
        if (this.disabled()) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        this.updateLocation(lat, lng);
      });

      // Evento: Fin del arrastre del marcador
      this.marker.addListener('dragend', (e: any) => {
        if (this.disabled()) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        this.updateLocation(lat, lng);
      });

      // Servicios de lugares
      if (googleMaps.places) {
        this.autocompleteService = new googleMaps.places.AutocompleteService();
        this.placesService = new googleMaps.places.PlacesService(this.map);
      }

      // Si ya existía una dirección previa, centrar en ella
      if (this.formattedAddress().trim()) {
        await this.geocodeAndCenter(this.formattedAddress());
      }
    } catch (err) {
      console.warn('[AddressMapPicker] Error initializing Google Maps:', err);
      this.mapsError.set(true);
    } finally {
      this.loadingMap.set(false);
    }
  }

  private async updateLocation(lat: number, lng: number): Promise<void> {
    const coords: LatLngCoords = { lat, lng };
    this.currentCoords.set(coords);

    if (this.marker) {
      this.marker.setPosition(coords);
    }
    if (this.map) {
      this.map.panTo(coords);
    }

    this.geocoding.set(true);
    try {
      const addr = await this.mapsLoader.reverseGeocode(coords);
      this.formattedAddress.set(addr);
      this.manualAddressInput = addr;
      this.onChange(addr);
      this.onTouched();
    } catch (e) {
      console.error('[AddressMapPicker] Reverse geocode error:', e);
    } finally {
      this.geocoding.set(false);
    }
  }

  onSearchInput(_event: Event): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const query = this.searchQuery.trim();
    if (!query || !this.autocompleteService) {
      this.predictions.set([]);
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.autocompleteService.getPlacePredictions(
        {
          input: query,
          locationBias: this.map ? this.map.getBounds() : undefined,
        },
        (predictions: any[], status: string) => {
          if (status === 'OK' && predictions) {
            this.predictions.set(
              predictions.slice(0, 5).map((p) => ({
                description: p.description,
                placeId: p.place_id,
              }))
            );
          } else {
            this.predictions.set([]);
          }
        }
      );
    }, 300);
  }

  async selectPrediction(item: PlacePrediction): Promise<void> {
    this.predictions.set([]);
    this.searchQuery = item.description;

    if (!this.placesService) {
      await this.geocodeAndCenter(item.description);
      return;
    }

    this.geocoding.set(true);
    this.placesService.getDetails(
      { placeId: item.placeId, fields: ['geometry', 'formatted_address'] },
      (place: any, status: string) => {
        this.geocoding.set(false);
        if (status === 'OK' && place?.geometry?.location) {
          const loc = place.geometry.location;
          const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
          const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
          const addr = place.formatted_address || item.description;

          this.currentCoords.set({ lat, lng });
          if (this.marker) this.marker.setPosition({ lat, lng });
          if (this.map) {
            this.map.setCenter({ lat, lng });
            this.map.setZoom(17);
          }

          this.formattedAddress.set(addr);
          this.manualAddressInput = addr;
          this.onChange(addr);
          this.onTouched();
        }
      }
    );
  }

  async onSearchEnter(event: Event): Promise<void> {
    event.preventDefault();
    const query = this.searchQuery.trim();
    if (!query) return;
    this.predictions.set([]);
    if (!this.mapsLoader.hasApiKey() || this.mapsError()) {
      this.formattedAddress.set(query);
      this.manualAddressInput = query;
      this.onChange(query);
      this.onTouched();
      return;
    }
    await this.geocodeAndCenter(query);
  }

  private async geocodeAndCenter(address: string): Promise<void> {
    this.geocoding.set(true);
    try {
      const res = await this.mapsLoader.geocodeAddress(address);
      if (res) {
        this.currentCoords.set({ lat: res.lat, lng: res.lng });
        if (this.marker) this.marker.setPosition({ lat: res.lat, lng: res.lng });
        if (this.map) {
          this.map.setCenter({ lat: res.lat, lng: res.lng });
          this.map.setZoom(17);
        }
        this.formattedAddress.set(res.formattedAddress);
        this.manualAddressInput = res.formattedAddress;
        this.onChange(res.formattedAddress);
        this.onTouched();
      }
    } finally {
      this.geocoding.set(false);
    }
  }

  locateCurrentPosition(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (this.mapsLoader.hasApiKey() && !this.mapsError()) {
          await this.updateLocation(lat, lng);
        } else {
          const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          this.currentCoords.set({ lat, lng });
          this.formattedAddress.set(coordsStr);
          this.manualAddressInput = coordsStr;
          this.onChange(coordsStr);
          this.onTouched();
        }
        this.locating.set(false);
      },
      (err) => {
        console.warn('[AddressMapPicker] Geolocation error:', err);
        this.locating.set(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.predictions.set([]);
  }

  openInGoogleMaps(): void {
    const coords = this.currentCoords();
    const url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  enableAddressEdit(): void {
    if (this.disabled()) return;
    this.manualAddressInput = this.formattedAddress();
    this.isEditingAddress.set(true);
  }

  saveManualAddress(): void {
    const trimmed = this.manualAddressInput.trim();
    this.formattedAddress.set(trimmed);
    this.isEditingAddress.set(false);
    this.onChange(trimmed);
    this.onTouched();
  }

  cancelAddressEdit(): void {
    this.isEditingAddress.set(false);
  }
}
