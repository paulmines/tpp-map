import { AfterViewInit, Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { MapBase } from '../../../components/map.base';
import { MapConfigService } from '../../../services/map-config.service';
import { LocationService } from '../../../services/location.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { Map, latLngBounds, LatLngBounds, Icon, latLng } from 'leaflet';

@Component({
  selector: 'app-current-location',
  standalone: true,
  imports: [],
  templateUrl: './current-location.component.html',
  styleUrl: './current-location.component.scss'
})
export class CurrentLocationComponent extends MapBase implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  private locationSubscription?: Subscription;
  private currentMarker?: L.Marker;

  constructor(
    protected override mapConfig: MapConfigService,
    private locationService: LocationService
  ) {
    super(mapConfig);
  }

  ngAfterViewInit(): void {
    this.mapElement = this.mapContainer;
    this.initializeMap();
    this.watchLocation();

    // this.addMarker(14.0779394, 121.1425760, "<b>You're Here!</b>");
  }

  ngOnDestroy(): void {
    this.locationSubscription?.unsubscribe();
  }

  private watchLocation(): void {
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

  addMarker(lat: number, lng: number, popupText: string): void {
    // Create custom icon
    const customIcon = new Icon({
      iconUrl: 'assets/marker-icon.png',
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      shadowUrl: 'assets/marker-shadow.png',
      iconSize: [25, 41],     // size of the icon
      iconAnchor: [12, 41],   // point of the icon which will correspond to marker's location
      popupAnchor: [1, -34],  // point from which the popup should open relative to the iconAnchor
      shadowSize: [41, 41]    // size of the shadow
    });

    // Add marker to the layer
    const marker = L.marker([lat, lng], { icon: customIcon });
    marker.bindPopup(popupText);
    this.getMarkerLayer().addLayer(marker);
    this.currentMarker = marker;
  }
} 