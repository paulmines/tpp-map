import { ElementRef, ViewChild, Injectable, OnDestroy, AfterViewInit } from '@angular/core';
import { Map as LeafletMap, LatLngBounds, LayerGroup, latLngBounds, tileLayer, layerGroup, Marker, latLng, Icon, marker, circleMarker, CircleMarker } from 'leaflet';
import { MapConfigService } from '../services/map-config.service';
import { LocationService } from '../services/location.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

@Injectable()
export abstract class MapBase implements OnDestroy {
  protected map!: LeafletMap;
  protected markerLayer!: LayerGroup;
  protected mapElement!: ElementRef;
//   @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
    // mapContainer!: ElementRef;
  protected locationSubscription?: Subscription;
  protected currentMarker?: Marker | CircleMarker;
  private pulseAnimation?: number;
  private pulseMarker?: CircleMarker;
  private routingControl: any; // Store the routing control instance
  private gpsWaypoint: L.LatLng = L.latLng(14.078302653244693, 121.1424087146165);
  private destinationWaypoint: L.LatLng = L.latLng(14.073384687936823, 121.14390748782859);

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

        // update local variable with current user coordinates
        this.setCurrentCoordinates(position.coords.latitude, position.coords.longitude);

      },
      error: (error) => {
        console.error('Error getting location:', error);
        // Set default view if location is unavailable
        const defaultCenter = this.mapConfig.getDefaultCenter();
        this.map.setView(defaultCenter, this.mapConfig.getInitialZoom());
      }
    });
  }

  protected watchLocationAutoCenter(): void {
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

    protected watchStartMovement(): void {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.map.setView([latitude, longitude], this.getDefaultStartZoomLevel());

          // Update the user coordnates waypoint to the user's current locatione);
          this.setCurrentCoordinates(latitude, longitude);

          // Recalculate the route with the updated waypoints
          this.routing();

          const angle = this.calculateAngleToWaypoint(latitude, longitude, this.destinationWaypoint.lat, this.destinationWaypoint.lng);
          console.log(`Current Position: [${latitude}, ${longitude}], GPS Waypoint: [${this.gpsWaypoint.lat}, ${this.gpsWaypoint.lng}], Angle: ${angle}`);
          this.rotateMap(angle);
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  private addMarker(lat: number, lng: number, popupText: string): void {
    // Clean up previous animation and marker
    if (this.pulseAnimation) {
      cancelAnimationFrame(this.pulseAnimation);
    }
    if (this.pulseMarker) {
      this.getMarkerLayer().removeLayer(this.pulseMarker);
    }

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
    this.pulseMarker = circleMarker([lat, lng], {
      radius: 12,
      fillColor: '#3388ff',
      color: '#6699ff',
      weight: 2,
      opacity: 0.3,
      fillOpacity: 0
    });
    this.getMarkerLayer().addLayer(this.pulseMarker);
    // this.pulseMarker = pulse;

    // Animate the pulse
    let radius = 12;
    const animate = () => {
      if (!this.pulseMarker) return;
      
      radius += 0.5;
      this.pulseMarker.setRadius(radius);
      this.pulseMarker.setStyle({ opacity: 0.3 - (radius - 12) * 0.02 });
      
      if (radius < 30) {
        this.pulseAnimation = requestAnimationFrame(animate);
      } else {
        radius = 12;
        this.pulseMarker.setRadius(radius);
        this.pulseMarker.setStyle({ opacity: 0.3 });
        this.pulseAnimation = requestAnimationFrame(animate);
      }
    };
    this.pulseAnimation = requestAnimationFrame(animate);
  }

  protected getDefaultBounds(): LatLngBounds {
    const bounds = this.mapConfig.getDefaultBounds();
    return latLngBounds(bounds.southWest, bounds.northEast);
  }

  protected setRedMarker(lat: number, lng: number, popupText: string): void {
    // modified by red marker in below from circle.
    // const circle = circleMarker([lat, lng], {
    //   radius: 12,
    //   fillColor: '#960505ff',
    //   color: '#ffffff',
    //   weight: 4,
    //   opacity: 1,
    //   fillOpacity: 0.9
    // });
    // circle.bindPopup(popupText);
    // this.getMarkerLayer().addLayer(circle);
    // this.currentMarker = circle;

    // Create custom red marker icon similar to Google Maps destination pin
    const redIcon = new Icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
          <path fill="#EA4335" stroke="#FFFFFF" stroke-width="1.5" 
            d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 18 9 18s9-11.25 9-18c0-4.97-4.03-9-9-9z"/>
          <circle cx="12" cy="9" r="3.5" fill="#FFFFFF"/>
        </svg>
      `),
      iconSize: [34, 46],
      iconAnchor: [12, 36],
      popupAnchor: [0, -36]
    });

    const redMarkerInstance = marker([lat, lng], {
      icon: redIcon
    });
    
    redMarkerInstance.bindPopup(popupText);
    this.getMarkerLayer().addLayer(redMarkerInstance);
    // this.redMarker = redMarkerInstance;
    
  }

  routing(): void {

    if (!L.Routing) {
      console.error('Leaflet Routing Machine not loaded');
      return;
    }

    this.routingControl = L.Routing.control({
      waypoints: [
        this.gpsWaypoint,
        this.destinationWaypoint,
      ],
      routeWhileDragging: false,
      router: new L.Routing.OSRMv1({
        // serviceUrl: 'http://127.0.0.1:5001/route/v1',
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'car'
      }),
      show: false, // Do not show the route details
    }).addTo(this.map);
  }

  private calculateAngleToWaypoint(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    return (angle + 360) % 360; // Normalize to 0-360 degrees
  }

  private rotateMap(angle: number): void {
    const mapContainer = this.mapElement.nativeElement;
    mapContainer.style.transform = `rotate(${-angle}deg)`;
  }

  protected disableInteractions(): void {
    // Disable interactions after map is created
    this.getMap().dragging.disable();
    this.getMap().touchZoom.disable();
    this.getMap().doubleClickZoom.disable();
    this.getMap().scrollWheelZoom.disable();
    this.getMap().boxZoom.disable();
    this.getMap().zoomControl.remove();
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

  protected setView(lat: number, lng: number): void {
    this.map.setView([lat, lng], this.getInitialZoom());
  }

  private setCurrentCoordinates(lat: number, lng: number): void {
    this.gpsWaypoint = L.latLng(lat, lng);
  }

  protected setDestinationCoordinates(lat: number, lng: number): void {
    this.destinationWaypoint = L.latLng(lat, lng);
  }

  public getDefaultStartZoomLevel(): number {
    return this.mapConfig.getDefaultStartZoomLevel();
  }
  
} 