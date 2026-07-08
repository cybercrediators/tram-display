import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi, type Mock } from 'vitest';

import { StopSearchComponent } from './stop-search';
import { TramService } from '../../services/tram';
import { Stop } from '../../models/transport-backend';

const ULM: Stop = { id: '1', name: 'Ulm Hbf' };

describe('StopSearch', () => {
  let component: StopSearchComponent;
  let fixture: ComponentFixture<StopSearchComponent>;
  let searchStops: Mock;
  let addStop: Mock;

  beforeEach(async () => {
    searchStops = vi.fn().mockReturnValue(of([ULM]));
    addStop = vi.fn();

    await TestBed.configureTestingModule({
      imports: [StopSearchComponent],
      providers: [{ provide: TramService, useValue: { searchStops, addStop } }],
    }).compileComponents();

    fixture = TestBed.createComponent(StopSearchComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('clears results and skips the backend for terms of 2 or fewer characters', () => {
    vi.useFakeTimers();
    component.results = [ULM];

    component.onSearch('ul');
    vi.advanceTimersByTime(400);

    expect(component.results).toEqual([]);
    expect(searchStops).not.toHaveBeenCalled();
  });

  it('searches after the debounce period', () => {
    vi.useFakeTimers();

    component.onSearch('ulm');
    expect(component.results).toEqual([]);

    vi.advanceTimersByTime(400);

    expect(searchStops).toHaveBeenCalledExactlyOnceWith('ulm');
    expect(component.results).toEqual([ULM]);
  });

  it('debounces rapid typing into a single request', () => {
    vi.useFakeTimers();

    component.onSearch('ulm');
    vi.advanceTimersByTime(100);
    component.onSearch('ulm h');
    vi.advanceTimersByTime(400);

    expect(searchStops).toHaveBeenCalledExactlyOnceWith('ulm h');
  });

  it('adds a stop, emits it and resets the search state', () => {
    const added: Stop[] = [];
    component.stopAdded.subscribe((s) => added.push(s));
    component.results = [ULM];
    component.searchTerm = 'ulm';

    component.add(ULM);

    expect(addStop).toHaveBeenCalledWith(ULM);
    expect(added).toEqual([ULM]);
    expect(component.results).toEqual([]);
    expect(component.searchTerm).toBe('');
  });
});
