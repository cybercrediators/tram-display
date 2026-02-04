import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlipDisplayComponent } from './flip-display';

describe('FlipDisplay', () => {
  let component: FlipDisplayComponent;
  let fixture: ComponentFixture<FlipDisplayComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlipDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlipDisplayComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
