import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapConfigService {
  private readonly defaultCenter: [number, number] = [14.076733, 121.143158];
  private readonly defaultZoom = 19;
  private readonly minZoom = 17;
  private readonly maxZoom = 21;
  private readonly tileLayerUrl = environment.tileLayerUrl;
  private readonly tileLayerAttribution = '&copy; <h1>TPP Map</h1>';

  getDefaultBounds(): { southWest: [number, number]; northEast: [number, number] } {
    return {
      southWest: [14.069498, 121.133057],
      northEast: [14.082540, 121.152675]
    };
  }

  getDefaultCenter(): [number, number] {
    return this.defaultCenter;
  }

  getInitialCenter(): [number, number] {
    return this.defaultCenter;
  }

  getInitialZoom(): number {
    return this.defaultZoom;
  }

  getMinZoom(): number {
    return this.minZoom;
  }

  getMaxZoom(): number {
    return this.maxZoom;
  }

  getTileLayerUrl(): string {
    return this.tileLayerUrl;
  }

  getTileLayerAttribution(): string {
    return this.tileLayerAttribution;
  }

  getDefaultStartZoomLevel(): number {
    return this.maxZoom;
  }
} 