import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StopSearchComponent } from './stop-search';

describe('StopSearch', () => {
  let component: StopSearchComponent;
  let fixture: ComponentFixture<StopSearchComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StopSearchComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
