import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TramService } from './tram';
import { EfaBackend } from '../models/backends/efa/efa-backend';
import { SwuBackend } from '../models/backends/swu-backend';
import { Stop } from '../models/transport-backend';

const AVV = { id: 'efa-avv', name: 'AVV (Augsburg)' };

describe('TramService', () => {
  let service: TramService;
  let efaBackend: any;
  let swuBackend: any;

  beforeEach(() => {
    localStorage.clear();

    efaBackend = {
      name: 'efa',
      label: 'EFA',
      getConfigs: vi.fn(() => [AVV]),
      setConfig: vi.fn(),
      searchStops: vi.fn(),
      getStopInfo: vi.fn(),
      getDepartures: vi.fn(),
    };
    swuBackend = {
      name: 'swu',
      label: 'Ulm (SWU)',
      searchStops: vi.fn(),
      getStopInfo: vi.fn(),
      getDepartures: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: EfaBackend, useValue: efaBackend },
        { provide: SwuBackend, useValue: swuBackend },
      ],
    });
    service = TestBed.inject(TramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('defaults to the AVV EFA backend when nothing is stored', () => {
    expect(service.getCurrentBackendName()).toBe('efa:efa-avv');
    expect(efaBackend.setConfig).toHaveBeenCalledWith(AVV);
  });

  it('lists SWU and all EFA configs as available backends', () => {
    expect(service.getAvailableBackends()).toEqual([
      { name: 'swu', label: 'Ulm (SWU)' },
      { name: 'efa:efa-avv', label: 'AVV (Augsburg)' },
    ]);
  });

  it('persists and broadcasts backend switches', () => {
    service.setBackend('swu');

    expect(service.getCurrentBackendName()).toBe('swu');
    expect(localStorage.getItem('tram-display-backend')).toBe('swu');
    expect(service.backendChanged$.value).toBe('swu');
  });

  it('ignores unknown backend names', () => {
    service.setBackend('bogus');
    expect(service.getCurrentBackendName()).toBe('efa:efa-avv');

    service.setBackend('efa:does-not-exist');
    expect(service.getCurrentBackendName()).toBe('efa:efa-avv');
  });

  it('saves, updates and removes stops', () => {
    const stop: Stop = { id: '1', name: 'Rathaus' };
    service.addStop(stop);
    service.addStop(stop); // duplicate is ignored

    expect(service.getSavedStops()).toEqual([stop]);

    service.updateStop({ ...stop, pinned: true });
    expect(service.getSavedStops()[0].pinned).toBe(true);

    service.removeStop('1');
    expect(service.getSavedStops()).toEqual([]);
  });

  it('keeps saved stops separate per backend', () => {
    service.addStop({ id: '1', name: 'Rathaus' });

    service.setBackend('swu');
    expect(service.getSavedStops()).toEqual([]);

    service.addStop({ id: '9', name: 'Ehinger Tor' });
    service.setBackend('efa:efa-avv');
    expect(service.getSavedStops().map((s) => s.id)).toEqual(['1']);
  });

  it('resolves stop ids and silently drops failing lookups', async () => {
    efaBackend.getStopInfo.mockImplementation((id: string) =>
      id === '1' ? of({ id: '1', name: 'Rathaus' }) : throwError(() => new Error('404'))
    );

    const stops = await firstValueFrom(service.resolveStopsFromIds(['1', '2']));

    expect(stops).toEqual([{ id: '1', name: 'Rathaus' }]);
  });

  it('resolves an empty id list to an empty result', async () => {
    expect(await firstValueFrom(service.resolveStopsFromIds([]))).toEqual([]);
  });
});
