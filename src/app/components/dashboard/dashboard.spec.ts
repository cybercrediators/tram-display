import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';

import { DashboardComponent } from './dashboard';
import { TramService } from '../../services/tram';
import { EfaBackend } from '../../models/backends/efa/efa-backend';
import { Stop } from '../../models/transport-backend';

describe('Dashboard', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let tramService: any;
  let efaBackend: any;

  beforeEach(async () => {
    localStorage.clear();
    document.body.classList.remove('e-ink-mode');
    history.replaceState(null, '', '/');

    tramService = {
      backendChanged$: new BehaviorSubject<string>('efa:efa-avv'),
      getAvailableBackends: vi.fn(() => [
        { name: 'swu', label: 'Ulm (SWU)' },
        { name: 'efa:efa-avv', label: 'AVV' },
      ]),
      getSavedStops: vi.fn(() => [] as Stop[]),
      getDepartures: vi.fn(() => of([])),
      setBackend: vi.fn(),
      setStops: vi.fn(),
      removeStop: vi.fn(),
      updateStop: vi.fn(),
      resolveStopsFromIds: vi.fn(() => of([])),
    };
    efaBackend = {
      getCurrentConfig: vi.fn(() => ({ id: 'efa-avv', name: 'AVV', regionCodes: [] })),
      setConfig: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: TramService, useValue: tramService },
        { provide: EfaBackend, useValue: efaBackend },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    document.body.classList.remove('e-ink-mode');
    history.replaceState(null, '', '/');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.currentBackend).toBe('efa:efa-avv');
  });

  it('sorts pinned stops before unpinned ones', () => {
    tramService.getSavedStops.mockReturnValue([
      { id: '1', name: 'Rathaus' },
      { id: '2', name: 'Hbf', pinned: true },
    ]);

    fixture.detectChanges();

    expect(component.savedStops.map((s) => s.id)).toEqual(['2', '1']);
  });

  it('persists the display mode and toggles the e-ink body class', () => {
    fixture.detectChanges();

    component.setDisplayMode('e-ink');
    expect(localStorage.getItem('tram-display-mode')).toBe('e-ink');
    expect(document.body.classList.contains('e-ink-mode')).toBe(true);

    component.setDisplayMode('vfd');
    expect(document.body.classList.contains('e-ink-mode')).toBe(false);
  });

  it('restores the saved display mode on init', () => {
    localStorage.setItem('tram-display-mode', 'static');

    fixture.detectChanges();

    expect(component.displayMode).toBe('static');
  });

  it('applies backend, mode and stop config from a share URL', () => {
    history.replaceState(null, '', '/?backend=swu&mode=e-ink&stops=10!1!5!1,20');
    tramService.resolveStopsFromIds.mockReturnValue(
      of([
        { id: '10', name: 'Rathaus' },
        { id: '20', name: 'Hbf' },
      ])
    );

    fixture.detectChanges();

    expect(tramService.setBackend).toHaveBeenCalledWith('swu');
    expect(component.displayMode).toBe('e-ink');
    expect(tramService.resolveStopsFromIds).toHaveBeenCalledWith(['10', '20']);

    const stored = tramService.setStops.mock.calls[0][0];
    expect(stored[0]).toEqual({
      id: '10',
      name: 'Rathaus',
      pinned: true,
      walkingTime: 5,
      hideUnreachable: true,
    });
    expect(stored[1].pinned).toBeUndefined();
  });

  it('refreshes the stop list when the backend changes', () => {
    fixture.detectChanges();

    tramService.getSavedStops.mockReturnValue([{ id: '7', name: 'Theater' }]);
    tramService.backendChanged$.next('swu');

    expect(component.currentBackend).toBe('swu');
    expect(component.savedStops.map((s) => s.id)).toEqual(['7']);
  });

  it('delegates stop removal and updates to the service', () => {
    fixture.detectChanges();

    component.onRemoveStop('1');
    expect(tramService.removeStop).toHaveBeenCalledWith('1');

    const stop: Stop = { id: '1', name: 'Rathaus', pinned: true };
    component.onUpdateStop(stop);
    expect(tramService.updateStop).toHaveBeenCalledWith(stop);
  });
});
