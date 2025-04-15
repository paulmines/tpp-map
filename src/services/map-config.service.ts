import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapConfigService {
  private config = environment.map;

  getDefaultBounds(): { southWest: [number, number]; northEast: [number, number] } {
    return {
      southWest: this.config.defaultBounds.southWest as [number, number],
      northEast: this.config.defaultBounds.northEast as [number, number]
    };
  }

  getInitialCenter(): [number, number] {
    return this.config.initialCenter as [number, number];
  }

  getInitialZoom(): number {
    return this.config.initialZoom;
  }

  getMinZoom(): number {
    return this.config.minZoom;
  }

  getMaxZoom(): number {
    return this.config.maxZoom;
  }

  getTileLayerUrl(): string {
    return this.config.tileLayer.url;
  }

  getTileLayerAttribution(): string {
    return this.config.tileLayer.attribution;
  }
} 