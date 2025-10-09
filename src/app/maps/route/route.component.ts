import { AfterViewInit, Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { CommonModule } from '@angular/common';

import { MapBase } from '../../../components/map.base';
import { MapConfigService } from '../../../services/map-config.service';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [LeafletModule, CommonModule],
  templateUrl: './route.component.html',
  styleUrl: './route.component.scss'
})
export class RouteComponent extends MapBase implements AfterViewInit, OnDestroy {

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  coordinates: string = '';
  destinationLatitude: number = 0;
  destinationLongitude: number = 0;
  showStartButton: boolean = false;

  constructor(
        protected override mapConfig: MapConfigService,
        protected override locationService: LocationService,
        private router: Router,
        private aroute: ActivatedRoute
  ) {
    super(mapConfig, locationService);
  }

  ngOnInit() {
    this.coordinates = this.aroute.snapshot.paramMap.get('coordinates') || '';

        // Split coordinates by comma
    const coordArray = this.coordinates.split(',');
    this.destinationLatitude = parseFloat(coordArray[0]) || 0;
    this.destinationLongitude = parseFloat(coordArray[1]) || 0;

    console.log(`[Lattude, Longitude]: [${this.destinationLatitude}, ${this.destinationLongitude}]`);

    this.setDestinationCoordinates(this.destinationLatitude, this.destinationLongitude);
  }

  ngAfterViewInit(): void {
    this.mapElement = this.mapContainer;
    this.initializeMap();
    this.watchLocation();
    this.setRedMarker(this.destinationLatitude, this.destinationLongitude,  "<b>Your destination!</b>");
    this.setView(this.destinationLatitude, this.destinationLongitude);
  }

  onDestinationnClick(): void {
    // Add your button click logic here
    console.log('Destination clicked!');
    // Example: Open navigation app, show route, etc.
    this.routing();
    this.showStartButton = true;
  }

    onStartClick(): void {
    // Add your button click logic here
    console.log('Start clicked!');
    this.showStartButton = false;
    this.router.navigate([this.composeStartRoutePath()]);
  }

  composeStartRoutePath(): string {
    return `/maps/start-route/${this.destinationLatitude},${this.destinationLongitude}`
  }

}
