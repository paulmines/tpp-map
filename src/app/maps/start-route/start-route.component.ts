import { AfterViewInit, Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';

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
  
  constructor(protected override mapConfig: MapConfigService,
        protected override locationService: LocationService
  ) {
    super(mapConfig, locationService);
  }

  ngAfterViewInit(): void {
    this.mapElement = this.mapContainer;
    this.initializeMap();
    this.disableInteractions();
    this.watchStartMovement();
  }

}
