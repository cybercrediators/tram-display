import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopCardComponent } from './stop-card';

describe('StopCardComponent', () => {
  let component: StopCardComponent;
  let fixture: ComponentFixture<StopCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopCardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
