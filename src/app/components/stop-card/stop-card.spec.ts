import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi, type Mock } from 'vitest';

import { StopCardComponent } from './stop-card';
import { TramService } from '../../services/tram';
import { Departure } from '../../models/transport-backend';

function dep(overrides: Partial<Departure>): Departure {
  return {
    line: '1',
    direction: 'Söflingen',
    time: '',
    realtime: true,
    timestamp: 0,
    delayed: false,
    ...overrides,
  };
}

describe('StopCardComponent', () => {
  let component: StopCardComponent;
  let fixture: ComponentFixture<StopCardComponent>;
  let getDepartures: Mock;

  beforeEach(async () => {
    getDepartures = vi.fn().mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [StopCardComponent],
      providers: [{ provide: TramService, useValue: { getDepartures } }],
    }).compileComponents();

    fixture = TestBed.createComponent(StopCardComponent);
    component = fixture.componentInstance;
    component.stop = { id: '42', name: 'Rathaus' };
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('formats departures relative to now and pads the board to 5 rows', () => {
    vi.useFakeTimers();
    const now = Date.now();
    getDepartures.mockReturnValue(
      of([
        dep({ line: '2', direction: 'Hbf', timestamp: now + 5 * 60000 }),
        dep({ line: '1', timestamp: now - 1000 }),
      ])
    );

    component.ngOnInit();

    expect(component.departures.length).toBe(5);
    expect(component.departures[0].time).toBe('now');
    expect(component.departures[1].time).toBe('5 min');
    expect(component.departures[2].line).toBe('');
    expect(component.loading).toBe(false);
  });

  it('shows an absolute time for departures more than 10 hours away', () => {
    vi.useFakeTimers();
    getDepartures.mockReturnValue(of([dep({ timestamp: Date.now() + 601 * 60000 })]));

    component.ngOnInit();

    expect(component.departures[0].time).toMatch(/^\d{1,2}:\d{2}$/);
  });

  it('sorts departures by timestamp, then line, then direction', () => {
    vi.useFakeTimers();
    const t = Date.now() + 10 * 60000;
    getDepartures.mockReturnValue(
      of([
        dep({ line: '7', direction: 'B', timestamp: t }),
        dep({ line: '7', direction: 'A', timestamp: t }),
        dep({ line: '1', direction: 'Z', timestamp: t }),
        dep({ line: '5', direction: 'X', timestamp: t - 60000 }),
      ])
    );

    component.ngOnInit();

    expect(component.departures.map((d) => `${d.line}${d.direction}`).slice(0, 4)).toEqual([
      '5X',
      '1Z',
      '7A',
      '7B',
    ]);
  });

  it('hides unreachable departures when walking-time filter is active', () => {
    vi.useFakeTimers();
    component.stop = { id: '42', name: 'Rathaus', walkingTime: 10, hideUnreachable: true };
    const now = Date.now();
    getDepartures.mockReturnValue(
      of([
        dep({ line: '1', timestamp: now + 5 * 60000 }),
        dep({ line: '2', timestamp: now + 15 * 60000 }),
      ])
    );

    component.ngOnInit();

    expect(component.filterReachable).toBe(true);
    // walking time is passed to the backend as offset
    expect(getDepartures).toHaveBeenCalledWith('42', 10);
    // the 5-min departure cannot be reached anymore
    expect(component.departures[0].line).toBe('2');
    expect(component.departures[1].line).toBe('');
  });

  it('limits the board to the next five departures', () => {
    vi.useFakeTimers();
    const now = Date.now();
    const deps = Array.from({ length: 7 }, (_, i) =>
      dep({ line: `${i + 1}`, timestamp: now + (i + 1) * 60000 })
    );
    getDepartures.mockReturnValue(of(deps));

    component.ngOnInit();

    expect(component.departures.length).toBe(5);
    expect(component.departures.every((d) => d.line !== '')).toBe(true);
    expect(component.departures[4].line).toBe('5');
  });

  it('builds fixed-width row strings for the flip display', () => {
    const row = component.getRowString(
      dep({ line: '1', direction: 'Straße', time: '5 min' })
    );

    // 3 (line) + 1 + 22 (destination) + 1 + 7 (time)
    expect(row.length).toBe(34);
    expect(row.startsWith('1   Strasse')).toBe(true);
    expect(row.endsWith('  5 min')).toBe(true);
  });

  it('truncates overlong line and destination fields', () => {
    const parts = component.getParts(
      dep({ line: 'S123', direction: 'Some very long destination name', time: '' })
    );

    expect(parts.line).toBe('S12');
    expect(parts.dest.length).toBe(22);
    expect(parts.dest).toBe('Some very long destina');
  });

  it('flags departures leaving within a minute as urgent', () => {
    expect(component.isUrgent(dep({ time: 'now' }))).toBe(true);
    expect(component.isUrgent(dep({ time: '1 min' }))).toBe(true);
    expect(component.isUrgent(dep({ time: 'sofort' }))).toBe(true);
    expect(component.isUrgent(dep({ time: '2 min' }))).toBe(false);
    expect(component.isUrgent(dep({ time: '12:30' }))).toBe(false);
    expect(component.isUrgent(dep({ time: '' }))).toBe(false);
  });

  it('emits remove with the stop id', () => {
    const removed: string[] = [];
    component.remove.subscribe((id) => removed.push(id));

    component.onRemove();

    expect(removed).toEqual(['42']);
  });

  it('toggles pinning and emits the updated stop', () => {
    const updates: any[] = [];
    component.update.subscribe((s) => updates.push(s));

    component.togglePin();

    expect(component.stop.pinned).toBe(true);
    expect(updates.length).toBe(1);
    expect(updates[0].pinned).toBe(true);
  });
});
