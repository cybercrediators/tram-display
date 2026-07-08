import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { EfaSettingsComponent } from './efa-settings';
import { EfaBackend } from '../../models/backends/efa/efa-backend';
import { TramService } from '../../services/tram';
import { EfaConfig } from '../../models/backends/efa/efa-config';

const CONFIG = {
  id: 'efa-test',
  name: 'Test Config',
  regionCodes: ['de:08421'],
} as EfaConfig;

describe('EfaSettings', () => {
  let component: EfaSettingsComponent;
  let fixture: ComponentFixture<EfaSettingsComponent>;
  let efaBackend: any;
  let tramService: any;

  beforeEach(async () => {
    efaBackend = {
      getCurrentConfig: vi.fn(() => CONFIG),
      setConfig: vi.fn(),
      removeConfig: vi.fn(),
      naiveSearchGID: vi.fn(() => of([])),
    };
    tramService = {
      setBackend: vi.fn(),
      deleteBackendData: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [EfaSettingsComponent],
      providers: [
        { provide: EfaBackend, useValue: efaBackend },
        { provide: TramService, useValue: tramService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EfaSettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.initialConfig = CONFIG;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('works on a deep copy of the initial config', () => {
    component.initialConfig = CONFIG;
    component.ngOnInit();

    expect(component.config).toEqual(CONFIG);
    expect(component.config).not.toBe(CONFIG);

    component.addRegion('de:09775');
    expect(CONFIG.regionCodes).toEqual(['de:08421']);
  });

  it('falls back to the active config when no initial config is given', () => {
    component.ngOnInit();

    expect(efaBackend.getCurrentConfig).toHaveBeenCalled();
    expect(component.config).toEqual(CONFIG);
  });

  it('saves the config, activates the backend and closes', () => {
    const closed = vi.fn();
    component.closeSettings.subscribe(closed);
    component.initialConfig = CONFIG;
    component.ngOnInit();

    component.save();

    expect(efaBackend.setConfig).toHaveBeenCalledWith(component.config);
    expect(tramService.setBackend).toHaveBeenCalledWith('efa:efa-test');
    expect(closed).toHaveBeenCalled();
  });

  it('adds and removes region codes without duplicates', () => {
    component.initialConfig = CONFIG;
    component.ngOnInit();

    component.addRegion('de:08421'); // already present
    component.addRegion('de:09775');
    expect(component.config.regionCodes).toEqual(['de:08421', 'de:09775']);

    component.removeRegion('de:08421');
    expect(component.config.regionCodes).toEqual(['de:09775']);

    component.manualCode = 'de:09775'; // already present
    component.addManual();
    expect(component.config.regionCodes).toEqual(['de:09775']);

    component.manualCode = 'de:08111';
    component.addManual();
    expect(component.config.regionCodes).toEqual(['de:09775', 'de:08111']);
    expect(component.manualCode).toBeNull();
  });

  it('refuses to delete the built-in AVV config', () => {
    component.initialConfig = { ...CONFIG, id: 'efa-avv' };
    component.ngOnInit();

    component.deleteConfig();

    expect(efaBackend.removeConfig).not.toHaveBeenCalled();
    expect(tramService.deleteBackendData).not.toHaveBeenCalled();
  });

  it('groups GID search results by region and sorts by hit count', () => {
    efaBackend.naiveSearchGID.mockReturnValue(
      of([
        { gid: 'de:08421:1', name: 'A', city: 'Ulm' },
        { gid: 'de:08421:2', name: 'B', city: 'Ulm' },
        { gid: 'de:09775:7', name: 'C', city: 'Neu-Ulm' },
        { gid: null, name: 'ignored' },
      ])
    );
    component.initialConfig = CONFIG;
    component.ngOnInit();
    component.searchQuery = 'ulm';

    component.search();

    expect(component.searchResults).toEqual([
      { name: 'Ulm', gid: 'de:08421', count: 2 },
      { name: 'Neu-Ulm', gid: 'de:09775', count: 1 },
    ]);
  });
});
