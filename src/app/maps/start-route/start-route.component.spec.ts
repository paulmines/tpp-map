import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartRouteComponent } from './start-route.component';

describe('StartRouteComponent', () => {
  let component: StartRouteComponent;
  let fixture: ComponentFixture<StartRouteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartRouteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
