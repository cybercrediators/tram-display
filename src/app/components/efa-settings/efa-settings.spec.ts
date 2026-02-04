import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EfaSettingsComponent } from './efa-settings';

describe('EfaSettings', () => {
  let component: EfaSettingsComponent;
  let fixture: ComponentFixture<EfaSettingsComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EfaSettingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EfaSettingsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
