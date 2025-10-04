import { AfterViewInit, Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MapBase } from '../../../components/map.base';
import { MapConfigService } from '../../../services/map-config.service';
import { LocationService } from '../../../services/location.service';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [],
  templateUrl: './route.component.html',
  styleUrl: './route.component.scss'
})
export class RouteComponent extends MapBase implements AfterViewInit, OnDestroy {

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  coordinates: string = '';
  latitude: number = 0;
  longitude: number = 0;

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
    this.latitude = parseFloat(coordArray[0]) || 0;
    this.longitude = parseFloat(coordArray[1]) || 0;
  }

  ngAfterViewInit(): void {
    this.mapElement = this.mapContainer;
    this.initializeMap();
    this.watchLocation();
    this.setRedMarker(this.latitude, this.longitude,  "<b>Your destination!</b>");
    this.setView(this.latitude, this.longitude);
  }

}
