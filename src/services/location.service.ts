import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private defaultPosition = {
    coords: {
      latitude: 14.0779394,
      longitude: 121.1425760,
      accuracy: 0,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    } as GeolocationCoordinates,
    timestamp: Date.now()
  } as GeolocationPosition;

  private previousPosition = {
    coords: {
      latitude: 14.0779394,
      longitude: 121.1425760,
      accuracy: 0,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    } as GeolocationCoordinates,
    timestamp: Date.now()
  } as GeolocationPosition;

  setPreviousPosition(position: GeolocationPosition): void {
    this.previousPosition = position;
  }

  getCurrentPosition(): Observable<GeolocationPosition> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by your browser, using default location');
        observer.next(this.previousPosition);
        observer.complete();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          observer.next(position);
          this.setPreviousPosition(position);
          observer.complete();
        },
        (error) => {
          console.warn('Error getting location, using default location:', error);
          observer.next(this.previousPosition);
          observer.complete();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  watchPosition(): Observable<GeolocationPosition> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by your browser, using default location');
        observer.next(this.previousPosition);
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log("Position:", position);
          observer.next(position);
          this.setPreviousPosition(position);
        },
        (error) => {
          console.warn('Error watching location, using default location:', error);
          observer.next(this.previousPosition);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    });
  }
} 