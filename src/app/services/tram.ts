import { Injectable } from '@angular/core';
import { Departure, Stop, TransportBackend } from '../models/transport-backend';
import { BehaviorSubject, catchError, Observable, of, forkJoin, map } from 'rxjs';
import { SwuBackend } from '../models/backends/swu-backend';
import { EfaBackend } from '../models/backends/efa/efa-backend';

@Injectable({
  providedIn: 'root',
})
export class TramService {
  private backends: Map<string, TransportBackend> = new Map();
  private currentBackendName = 'efa';
  private activeBackend!: TransportBackend;

  // notify if backend changed
  public backendChanged$ = new BehaviorSubject<string>('efa');

  constructor(
    private efaBackend: EfaBackend,
    private swuBackend: SwuBackend
  ) {
    // set backends
    this.backends.set('efa', efaBackend);
    this.backends.set('swu', swuBackend);

    let saved = localStorage.getItem('tram-display-backend');

    // set generic efa (before IDs)
    if (!saved) saved = 'efa:efa-avv';

    try {
      this.setBackend(saved);
    } catch {
      // set fallback
      this.setBackend('efa:efa-avv');
    }
  }

  getCurrentBackendName(): string {
    return this.currentBackendName;
  }

  getAvailableBackends(): {name: string, label: string}[] {
    const list: {name: string, label: string}[] = [];

    const swu = this.backends.get('swu');
    if (swu) list.push({ name: 'swu', label: swu.label });

    const efaConfigs = this.efaBackend.getConfigs();
    efaConfigs.forEach(config => {
      list.push({
        name: `efa:${config.id}`,
        label: config.name
      });
    });

    return list;
  }

  setBackend(name: string) {
    if (name.startsWith('efa:')) {
      const configId = name.split(':')[1];
      const configs = this.efaBackend.getConfigs();
      const config = configs.find(c => c.id === configId);
      if (config) {
        this.efaBackend.setConfig(config);
        this.currentBackendName = name;
        this.activeBackend = this.efaBackend;
        localStorage.setItem('tram-display-backend', name);
        this.backendChanged$.next(name);
      }
    } else if (this.backends.has(name)) {
      this.currentBackendName = name;
      this.activeBackend = this.backends.get(name)!;
      localStorage.setItem('tram-display-backend', name);
      this.backendChanged$.next(name);
    }
  }

  searchStops(query: string): Observable<Stop[]> {
    return this.activeBackend.searchStops(query);
  }

  resolveStopsFromIds(ids: string[]): Observable<Stop[]> {
    if (!ids || ids.length === 0) return of([]);

    return forkJoin(ids.map(id =>
      this.activeBackend.getStopInfo(id).pipe(
        catchError(() => of(undefined))
      )
    )).pipe(
      map(results => results.filter((stop): stop is Stop => !!stop))
    );
  }

  getDepartures(stopId: string, minOffset = 0): Observable<Departure[]> {
    return this.activeBackend.getDepartures(stopId, minOffset);
  }

  private getStorageKey(): string {
    return `tram-display-stops-${this.currentBackendName}`;
  }

  getSavedStops(): Stop[] {
    const raw = localStorage.getItem(this.getStorageKey());
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  setStops(stops: Stop[]) {
    this.saveStopsToStorage(stops);
  }

  addStop(stop: Stop) {
    const stops = this.getSavedStops();
    if (!stops.find(s => s.id === stop.id)) {
      stops.push(stop);
      this.saveStopsToStorage(stops);
    }
  }

  removeStop(stopId: string) {
    const stops = this.getSavedStops().filter(s => s.id !== stopId);
    this.saveStopsToStorage(stops);
  }

  updateStop(updatedStop: Stop) {
    const stops = this.getSavedStops();
    const index = stops.findIndex(s => s.id === updatedStop.id);

    if (index !== -1) {
      stops[index] = updatedStop;
      this.saveStopsToStorage(stops);
    }
  }

  private saveStopsToStorage(stops: Stop[]) {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(stops));
  }

  deleteBackendData(backendName: string) {
    localStorage.removeItem(`tram-display-stops-${backendName}`);
  }
}