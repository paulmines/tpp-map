import { AfterViewInit, Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MapBase } from '../../../components/map.base';
import { MapConfigService } from '../../../services/map-config.service';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'start-route',
  standalone: true,
  imports: [],
  templateUrl: './start-route.component.html',
  styleUrl: './start-route.component.scss'
})
export class StartRouteComponent extends MapBase implements AfterViewInit, OnDestroy {

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  
  coordinates: string = '';
  destinationLatitude: number = 0;
  destinationLongitude: number = 0;

  constructor(private route: ActivatedRoute,
    protected override mapConfig: MapConfigService,
        protected override locationService: LocationService
  ) {
    super(mapConfig, locationService);
  }

  ngOnInit() {
    this.coordinates = this.route.snapshot.paramMap.get('coordinates') || '';

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
    this.disableInteractions();
    this.watchStartMovement();
    this.setRedMarker(this.destinationLatitude, this.destinationLongitude,  "<b>Your destination!</b>");
  }

}
