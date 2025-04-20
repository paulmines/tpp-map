import { ElementRef, ViewChild, Injectable, OnDestroy, AfterViewInit } from '@angular/core';
import { Map as LeafletMap, LatLngBounds, LayerGroup, latLngBounds, tileLayer, layerGroup, Marker, latLng, Icon, marker, circleMarker, CircleMarker } from 'leaflet';
import { MapConfigService } from '../services/map-config.service';
import { LocationService } from '../services/location.service';
import { Subscription } from 'rxjs';

@Injectable()
export abstract class MapBase implements OnDestroy {
  protected map!: LeafletMap;
  protected markerLayer!: LayerGroup;
  protected mapElement!: ElementRef;
//   @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
    // mapContainer!: ElementRef;
  protected locationSubscription?: Subscription;
  protected currentMarker?: Marker | CircleMarker;

  constructor(
    protected mapConfig: MapConfigService,
    protected locationService: LocationService
  ) {
  } 

  ngOnDestroy(): void {
    console.log("ngOnDestroy");
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  protected initializeMap(): void {
    const bounds = this.getDefaultBounds();
    
    const mapElement = this.mapElement.nativeElement.querySelector('#map');
    if (!mapElement) {
      console.error('Map element not found');
      return;
    }

    this.map = new LeafletMap(mapElement, {
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      minZoom: this.getMinZoom(),
      maxZoom: this.getMaxZoom(),
      bounceAtZoomLimits: true
    });

    this.setInitialView();
    this.setupTileLayer();
    this.setupMarkerLayer();
  }

  protected watchLocation(): void {
    this.locationSubscription = this.locationService.watchPosition().subscribe({
      next: (position) => {
        const positionLatLng = latLng(position.coords.latitude, position.coords.longitude);
        console.log("Current Location:", positionLatLng);
        
        // Remove existing marker if any
        if (this.currentMarker) {
          this.getMarkerLayer().removeLayer(this.currentMarker);
        }

        // Add marker with popup
        this.addMarker(
          position.coords.latitude,
          position.coords.longitude,
          "<b>You're Here!</b>"
        );

        // Center map on current location
        this.map.setView(positionLatLng, 15);
      },
      error: (error) => {
        console.error('Error getting location:', error);
        // Set default view if location is unavailable
        const defaultCenter = this.mapConfig.getDefaultCenter();
        this.map.setView(defaultCenter, this.mapConfig.getInitialZoom());
      }
    });
  }

  private addMarker(lat: number, lng: number, popupText: string): void {
    const circle = circleMarker([lat, lng], {
      radius: 12,
      fillColor: '#120596',
      color: '#ffffff',
      weight: 4,
      opacity: 1,
      fillOpacity: 0.9
    });
    circle.bindPopup(popupText);
    this.getMarkerLayer().addLayer(circle);
    this.currentMarker = circle;

    // Add pulsing circle
    const pulse = circleMarker([lat, lng], {
      radius: 12,
      fillColor: '#3388ff',
      color: '#6699ff',
      weight: 2,
      opacity: 0.3,
      fillOpacity: 0
    });
    this.getMarkerLayer().addLayer(pulse);

    // Animate the pulse
    let radius = 12;
    const animate = () => {
      radius += 0.5;
      pulse.setRadius(radius);
      pulse.setStyle({ opacity: 0.3 - (radius - 12) * 0.02 });
      
      if (radius < 30) {
        setTimeout(() => requestAnimationFrame(animate), 20);
      } else {
        radius = 12;
        pulse.setRadius(radius);
        pulse.setStyle({ opacity: 0.3 });
        setTimeout(() => requestAnimationFrame(animate), 20);
      }
    };
    animate();
  }

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
} 