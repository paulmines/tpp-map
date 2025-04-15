import { ElementRef, ViewChild, Injectable } from '@angular/core';
import { Map as LeafletMap, LatLngBounds, LayerGroup, latLngBounds, tileLayer, layerGroup } from 'leaflet';
// import { MapConfigService } from '../../services/map-config.service';
import { MapConfigService } from '../services/map-config.service';

// @Injectable()
export abstract class MapBase {
  protected map!: any;
  protected markerLayer!: any;
//   protected mapElement: ElementRef;
//   @ViewChild('mapContainer', { static: true }) mapElement!: ElementRef;

//   constructor(
//     mapElement: ElementRef,
//     protected mapConfig: MapConfigService
//   ) {
//     this.mapElement = mapElement;
//   }

constructor(
    protected mapConfig: MapConfigService
  ) {
  }

//   protected initializeMap(): void {
//     const bounds = this.getDefaultBounds();
    
//     const mapElement = this.mapElement.nativeElement.querySelector('#map');
//     if (!mapElement) {
//       console.error('Map element not found');
//       return;
//     }

//     this.map = new LeafletMap(mapElement, {
//       maxBounds: bounds,
//       maxBoundsViscosity: 1.0,
//       minZoom: this.getMinZoom(),
//       maxZoom: this.getMaxZoom(),
//       bounceAtZoomLimits: true
//     });

//     this.setInitialView();
//     this.setupTileLayer();
//     this.setupMarkerLayer();
//   }

  protected getDefaultBounds(): LatLngBounds {
    const bounds = this.mapConfig.getDefaultBounds();
    return latLngBounds(bounds.southWest, bounds.northEast);
  }

  protected getMinZoom(): number {
    return this.mapConfig.getMinZoom();
  }

  protected getMaxZoom(): number {
    return this.mapConfig.getMaxZoom();
  }

  protected getInitialZoom(): number {
    return this.mapConfig.getInitialZoom();
  }

  protected getInitialCenter(): [number, number] {
    return this.mapConfig.getInitialCenter();
  }

  protected getTileLayerUrl(): string {
    return this.mapConfig.getTileLayerUrl();
  }

  protected getTileLayerAttribution(): string {
    return this.mapConfig.getTileLayerAttribution();
  }

  protected setInitialView(): void {
    const [lat, lng] = this.getInitialCenter();
    this.map.setView([lat, lng], this.getInitialZoom());
  }

  protected setupTileLayer(): void {
    const tiles = tileLayer(this.getTileLayerUrl(), {
      maxZoom: this.getMaxZoom(),
      minZoom: this.getMinZoom(),
      attribution: this.getTileLayerAttribution()
    }).addTo(this.map);
  }

  protected setupMarkerLayer(): void {
    this.markerLayer = layerGroup().addTo(this.map);
  }

  public getMap(): LeafletMap {
    return this.map;
  }

  public getMarkerLayer(): LayerGroup {
    return this.markerLayer;
  }

  public destroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
} 