import { ElementRef, ViewChild, Injectable, OnDestroy, AfterViewInit } from '@angular/core';
import { Map as LeafletMap, LatLngBounds, LayerGroup, latLngBounds, tileLayer, layerGroup, Marker, latLng, Icon, marker, circleMarker, CircleMarker, LatLng } from 'leaflet';
import { MapConfigService } from '../services/map-config.service';
import { LocationService } from '../services/location.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

// Declare Leaflet Routing interface for TypeScript
declare global {
  interface Window {
    L: any;
  }
}

declare module 'leaflet' {
  namespace Routing {
    function control(options?: any): any;
    function osrmv1(options?: any): any;
  }
}

interface RouteState {
  firstRun: boolean;
  isRouting: boolean;
  lastRouteUpdate: number;
  routeError: string | null;
  isOffline: boolean;
}

@Injectable()
export abstract class MapBase implements OnDestroy {
  protected map!: LeafletMap;
  protected markerLayer!: LayerGroup;
  protected mapElement!: ElementRef;
  protected locationSubscription?: Subscription;
  protected currentMarker?: Marker | CircleMarker;
  private pulseAnimation?: number;
  private pulseMarker?: CircleMarker;
  private routingControl: any;
  
  // Route state management
  private routeState: RouteState = {
    firstRun: false,
    isRouting: false,
    lastRouteUpdate: 0,
    routeError: null,
    isOffline: false
  };
  
  // Performance optimization constants
  private readonly MIN_DISTANCE_FOR_UPDATE = 1; // meters - ultra sensitive, even few steps
  private readonly ROUTE_UPDATE_THROTTLE = 1000; // ms - very frequent route updates
  private readonly MAX_ROUTE_RETRIES = 3;
  private routeRetryCount = 0;
  
  // Observable GPS waypoint with debouncing
  protected gpsWaypointSubscription?: Subscription;
  private gpsWaypoint: L.LatLng = L.latLng(14.078302653244693, 121.1424087146165);
  private previousGpsWaypoint: L.LatLng = L.latLng(14.078302653244693, 121.1424087146165);
  private gpsWaypointSubject = new Subject<L.LatLng>();
  public gpsWaypoint$ = this.gpsWaypointSubject.asObservable();

  private destinationWaypoint: L.LatLng = L.latLng(14.073384687936823, 121.14390748782859);

  // Cached route for offline fallback
  private cachedRoute: any = null;
  private cachedRouteInstructions: any[] = [];

  constructor(
    protected mapConfig: MapConfigService,
    protected locationService: LocationService
  ) {
    // Subscribe to GPS waypoint changes with minimal debouncing for ultra-sensitive updates
    this.gpsWaypointSubscription = this.gpsWaypoint$
      .pipe(
        debounceTime(200), // Minimal debounce - only filter GPS noise
        distinctUntilChanged((prev, curr) => {
          // Update on any movement >= 0.5 meters (few steps)
          const distance = this.calculateDistance(prev, curr);
          return distance < this.MIN_DISTANCE_FOR_UPDATE;
        })
      )
      .subscribe((position) => {
        this.onGpsWaypointChange(position);
      });

    // Monitor online/offline status
    window.addEventListener('online', () => this.handleOnlineStatus(true));
    window.addEventListener('offline', () => this.handleOnlineStatus(false));
  }

  /**
   * Enhanced ngOnDestroy with proper cleanup
   */
  ngOnDestroy(): void {
    console.log("ngOnDestroy");
    
    // Cleanup animations
    if (this.pulseAnimation) {
      cancelAnimationFrame(this.pulseAnimation);
    }
    
    // Cleanup subscriptions
    if (this.locationSubscription) {
      this.locationSubscription.unsubscribe();
    }
    if (this.gpsWaypointSubscription) {
      this.gpsWaypointSubscription.unsubscribe();
    }
    
    // Cleanup routing properly
    this.cleanupRoutingControl();
    
    // Cleanup map
    if (this.map) {
      this.map.remove();
    }

    // Remove event listeners
    window.removeEventListener('online', () => this.handleOnlineStatus(true));
    window.removeEventListener('offline', () => this.handleOnlineStatus(false));
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
    
    // Add this: Start watching location after map is initialized
    console.log('Map initialized - starting location watch');
    this.startLocationTracking();
  }
  
  /**
   * Start location tracking - call this after map initialization
   */
  private startLocationTracking(): void {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }
    
    console.log('Starting location tracking...');
    
    // Request initial position first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Initial position obtained:', position.coords);
        const { latitude, longitude } = position.coords;
        
        // Set initial coordinates
        this.setCurrentCoordinates(latitude, longitude);
        
        // Center map on current location
        this.map.setView([latitude, longitude], this.getDefaultStartZoomLevel());
        
        console.log('Location tracking started successfully');
      },
      (error) => {
        console.error('Error getting initial location:', error);
        this.handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  protected watchLocation(): void {
    console.log('watchLocation() called');
    
    if (!navigator.geolocation) {
      console.error('Geolocation not available');
      return;
    }
    
    this.locationSubscription = this.locationService.watchPosition().subscribe({
      next: (position) => {
        const positionLatLng = latLng(position.coords.latitude, position.coords.longitude);
        console.log("Current Location:", positionLatLng);
        
        // Update coordinates through observable pipeline
        this.setCurrentCoordinates(position.coords.latitude, position.coords.longitude);
      },
      error: (error) => {
        console.error('Error getting location:', error);
        this.handleLocationError(error);
      }
    });
    
    console.log('Location watch subscription created');
  }

  protected watchLocationAutoCenter(): void {
    console.log('watchLocationAutoCenter() called');
    
    if (!navigator.geolocation) {
      console.error('Geolocation not available');
      return;
    }
    
    this.locationSubscription = this.locationService.watchPosition().subscribe({
      next: (position) => {
        const positionLatLng = latLng(position.coords.latitude, position.coords.longitude);
        console.log("Current Location (auto-center):", positionLatLng);
        
        // Update coordinates
        this.setCurrentCoordinates(position.coords.latitude, position.coords.longitude);

        // Smooth center map on current location
        this.smoothPanTo(positionLatLng, 15);
      },
      error: (error) => {
        console.error('Error getting location:', error);
        this.handleLocationError(error);
      }
    });
    
    console.log('Location watch (auto-center) subscription created');
  }

  protected watchStartMovement(): void {
    console.log('watchStartMovement() called');
    
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Position update:', latitude, longitude);
          
          // Smooth pan instead of hard setView
          this.smoothPanTo(latLng(latitude, longitude), this.getDefaultStartZoomLevel());

          // Update coordinates immediately for ultra-responsive tracking
          this.setCurrentCoordinates(latitude, longitude);

          // Calculate and rotate map
          const angle = this.calculateAngleToWaypoint(
            latitude, 
            longitude, 
            this.destinationWaypoint.lat, 
            this.destinationWaypoint.lng
          );
          console.log(`Heading: ${angle.toFixed(2)}°`);
          this.rotateMap(angle);
        },
        (error) => {
          console.error('Error getting location:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          this.handleLocationError(error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0, // No caching - always get fresh position
          timeout: 3000 // Faster timeout for more responsive updates
        }
      );
      console.log('Geolocation watch started with ID:', watchId);
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  private addMarker(lat: number, lng: number, popupText: string): void {
    // Remove existing marker if any
    if (this.currentMarker) {
      this.getMarkerLayer().removeLayer(this.currentMarker);
    }

    // Clean up previous animation and marker
    if (this.pulseAnimation) {
      cancelAnimationFrame(this.pulseAnimation);
    }
    if (this.pulseMarker) {
      this.getMarkerLayer().removeLayer(this.pulseMarker);
    }

    // Main marker
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

    // Pulsing circle
    this.pulseMarker = circleMarker([lat, lng], {
      radius: 12,
      fillColor: '#3388ff',
      color: '#6699ff',
      weight: 2,
      opacity: 0.3,
      fillOpacity: 0
    });
    this.getMarkerLayer().addLayer(this.pulseMarker);

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
    // Create custom red marker icon
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
  }

  /**
   * Optimized routing with throttling, caching, and error handling
   */
  routing(): void {

    // Throttle route updates
    const now = Date.now();
    if (!this.routeState.firstRun && (this.routeState.isRouting ||
        (now - this.routeState.lastRouteUpdate) < this.ROUTE_UPDATE_THROTTLE)) {
      console.log('Route update throttled');
      return;
    }
  
    this.routeState.firstRun = false;
    this.routeState.isRouting = true;
    this.routeState.lastRouteUpdate = now;

    // Remove existing routing control
    if (this.routingControl) {
      try {
        this.map.removeControl(this.routingControl);
      } catch (e) {
        console.warn('Error removing routing control:', e);
      }
    }

    // Check online status
    if (this.routeState.isOffline && this.cachedRoute) {
      console.log('Using cached route (offline mode)');
      this.displayCachedRoute();
      this.routeState.isRouting = false;
      return;
    }

    // Initialize routing with retry logic
    const initRouting = () => {
      const leafletObj = (window as any).L || L;
      
      if (!leafletObj.Routing || !leafletObj.Routing.control) {
        console.error('Leaflet Routing Machine not loaded yet');
        setTimeout(initRouting, 100);
        return;
      }

      try {
        this.routingControl = leafletObj.Routing.control({
          waypoints: [
            this.gpsWaypoint,
            this.destinationWaypoint,
          ],
          routeWhileDragging: false,
          router: leafletObj.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving', // car, driving
            timeout: 8000 // 5 second timeout
          }),
          show: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: false,
          showAlternatives: false,
          createMarker: () => null, // Hide waypoint markers
          lineOptions: {
            styles: [
              { color: '#2196F3', opacity: 0.8, weight: 6 }
            ],
            extendToWaypoints: true,
            missingRouteTolerance: 10
          }
        }).addTo(this.map);

        // Handle routing events
        this.routingControl.on('routesfound', (e: any) => {
          console.log('Route found successfully');
          this.routeState.routeError = null;
          this.routeRetryCount = 0;
          
          // Cache the route for offline use
          this.cachedRoute = e.routes[0];
          this.cachedRouteInstructions = e.routes[0].instructions;
          
          this.routeState.isRouting = false;
        });

        this.routingControl.on('routingerror', (e: any) => {
          console.error('Routing error:', e);
          this.handleRoutingError(e);
        });

        console.log('Routing initialized successfully');
      } catch (error) {
        console.error('Error initializing routing:', error);
        this.handleRoutingError(error);
      }
    };

    initRouting();
  }

/**
 * Update waypoints without recreating the routing control
 * This prevents flickering and improves performance
 */
private updateRouteWaypoints(): void {
  if (!this.routingControl) {
    console.warn('Cannot update waypoints - routing control not initialized');
    return;
  }

  // Throttle waypoint updates
  const now = Date.now();
  if (this.routeState.isRouting || 
      (now - this.routeState.lastRouteUpdate) < this.ROUTE_UPDATE_THROTTLE) {
    console.log('Waypoint update throttled');
    return;
  }

  this.routeState.lastRouteUpdate = now;
  this.routeState.isRouting = true;

  try {
    // Update waypoints using setWaypoints method
    this.routingControl.setWaypoints([
      this.gpsWaypoint,
      this.destinationWaypoint
    ]);
    
    console.log('Waypoints updated successfully');
    // this.routeState.isRouting = false;
  } catch (error) {
    console.error('Error updating waypoints:', error);
    this.routeState.isRouting = false;
  }
}

  /**
   * Handle routing errors with retry logic
   */
  private handleRoutingError(error: any): void {
    this.routeState.isRouting = false;
    this.routeState.routeError = error.message || 'Routing failed';

    if (this.routeRetryCount < this.MAX_ROUTE_RETRIES) {
      this.routeRetryCount++;
      console.log(`Retrying route calculation (${this.routeRetryCount}/${this.MAX_ROUTE_RETRIES})...`);
      
      setTimeout(() => {
        this.routing();
      }, 2000 * this.routeRetryCount); // Exponential backoff
    } else {
      console.error('Max route retries reached');
      
      // Fall back to cached route if available
      if (this.cachedRoute) {
        console.log('Using cached route as fallback');
        this.displayCachedRoute();
      } else {
        // Draw straight line as last resort
        this.drawStraightLine();
      }
    }
  }

  /**
   * Display cached route when offline or routing fails
   */
  private displayCachedRoute(): void {
    if (!this.cachedRoute) return;

    try {
      const leafletObj = (window as any).L || L;
      const routeLine = leafletObj.polyline(
        this.cachedRoute.coordinates.map((c: any) => [c.lat, c.lng]),
        {
          color: '#FF9800',
          opacity: 0.6,
          weight: 6,
          dashArray: '10, 10'
        }
      ).addTo(this.map);

      console.log('Cached route displayed');
    } catch (error) {
      console.error('Error displaying cached route:', error);
    }
  }

  /**
   * Draw straight line as fallback when no route available
   */
  private drawStraightLine(): void {
    try {
      const leafletObj = (window as any).L || L;
      leafletObj.polyline(
        [
          [this.gpsWaypoint.lat, this.gpsWaypoint.lng],
          [this.destinationWaypoint.lat, this.destinationWaypoint.lng]
        ],
        {
          color: '#F44336',
          opacity: 0.5,
          weight: 4,
          dashArray: '5, 10'
        }
      ).addTo(this.map);

      console.log('Straight line fallback displayed');
    } catch (error) {
      console.error('Error drawing straight line:', error);
    }
  }

  /**
   * Calculate distance between two points in meters
   */
  private calculateDistance(point1: LatLng, point2: LatLng): number {
    return this.map.distance(point1, point2);
  }

  /**
   * Smooth pan to location instead of hard jump
   */
  private smoothPanTo(latlng: LatLng, zoom?: number): void {
    if (zoom && this.map.getZoom() !== zoom) {
      this.map.setView(latlng, zoom, {
        animate: true,
        duration: 0.5
      });
    } else {
      this.map.panTo(latlng, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.25
      });
    }
  }

  private calculateAngleToWaypoint(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    
    return (angle + 360) % 360;
  }

  private rotateMap(angle: number): void {
    const mapContainer = this.mapElement.nativeElement;
    const scaleFactor = Math.sqrt(2);
    
    mapContainer.style.transition = 'transform 0.3s ease-out';
    mapContainer.style.transform = `rotate(${-angle}deg) scale(${scaleFactor})`;
  }

  protected disableInteractions(): void {
    this.getMap().dragging.disable();
    this.getMap().touchZoom.disable();
    this.getMap().doubleClickZoom.disable();
    this.getMap().scrollWheelZoom.disable();
    this.getMap().boxZoom.disable();
    this.getMap().zoomControl.remove();
  }

  /**
   * Handler for GPS waypoint changes (debounced)
   */
  private onGpsWaypointChange(position: L.LatLng): void {
    console.log('GPS Waypoint changed:', position);
    
    // Update marker
    this.addMarker(
      position.lat,
      position.lng,
      "<b>You're Here!</b>"
    );

      // Don't continue if routing is disabled
    // if (!this.routeState.isRouting) {
    //   console.log('Routing disabled - skipping route update');
    //   return;
    // }

    // Update route if significant movement
    const distance = this.calculateDistance(this.previousGpsWaypoint, position);
    if (distance >= this.MIN_DISTANCE_FOR_UPDATE) {
      console.log(`Movement detected: ${distance.toFixed(2)}m - updating route`);
      // this.routing();
      // Update waypoints instead of recreating routing control
      this.updateRouteWaypoints();
      this.previousGpsWaypoint = position;
    } else {
      console.log(`Minor movement: ${distance.toFixed(2)}m - skipping route update`);
    }
  }

  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatus(isOnline: boolean): void {
    this.routeState.isOffline = !isOnline;
    console.log(`Network status: ${isOnline ? 'Online' : 'Offline'}`);
    
    if (isOnline && this.routeState.routeError) {
      // Retry routing when back online
      console.log('Back online - retrying route calculation');
      this.routeRetryCount = 0;
      this.routing();
    }
  }

  /**
   * Handle location errors
   */
  private handleLocationError(error: any): void {
    console.error('=== Location Error Details ===');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    let errorMessage = 'Unknown location error';
    
    switch(error.code) {
      case 1: // PERMISSION_DENIED
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
        console.error('User denied location permission');
        break;
      case 2: // POSITION_UNAVAILABLE
        errorMessage = 'Location information unavailable. Please check your GPS/network connection.';
        console.error('Location position unavailable');
        break;
      case 3: // TIMEOUT
        errorMessage = 'Location request timed out. Retrying...';
        console.error('Location request timeout');
        // Retry on timeout
        setTimeout(() => {
          console.log('Retrying location request...');
          this.startLocationTracking();
        }, 2000);
        break;
    }
    
    console.error(errorMessage);
    
    // Show default view
    const defaultCenter = this.mapConfig.getDefaultCenter();
    this.map.setView(defaultCenter, this.mapConfig.getInitialZoom());
    
    // You can emit this error to your component to show a toast/alert
    // this.locationError$.next(errorMessage);
  }

  // Getters
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
    console.log(`setCurrentCoordinates called: [${lat}, ${lng}]`);
    this.gpsWaypoint = L.latLng(lat, lng);
    this.gpsWaypointSubject.next(this.gpsWaypoint);
  }

  protected setDestinationCoordinates(lat: number, lng: number): void {
    this.destinationWaypoint = L.latLng(lat, lng);
    
    // Trigger route recalculation if needed
    if (this.gpsWaypoint && this.routingControl) {
      // this.routing(); - old codes
      this.updateRouteWaypoints();
    }
  }

  public getDefaultStartZoomLevel(): number {
    return this.mapConfig.getDefaultStartZoomLevel();
  }

  /**
   * Public method to manually trigger route update
   * Now uses waypoint update instead of recreation
   */
  public updateRoute(): void {
    this.routeRetryCount = 0;
    if (this.routingControl) {
      this.updateRouteWaypoints();
    } else {
      this.routing();
    }
  }

  /**
   * Get current route state for UI display
   */
  public getRouteState(): RouteState {
    return { ...this.routeState };
  }

  // Add new method to control routing state (add near the end)
  protected setRoutingEnabled(enabled: boolean): void {
    this.routeState.firstRun = enabled;
    console.log(`Routing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clean up routing control properly
   */
  private cleanupRoutingControl(): void {
    if (this.routingControl) {
      try {
        // Remove event listeners
        this.routingControl.off('routesfound');
        this.routingControl.off('routingerror');
        
        // Remove from map
        this.map.removeControl(this.routingControl);
        this.routingControl = null;
        
        console.log('Routing control cleaned up');
      } catch (e) {
        console.warn('Error cleaning up routing control:', e);
      }
    }
  }
}