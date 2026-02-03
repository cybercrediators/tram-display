import { Injectable } from '@angular/core';
import { TransportBackend } from '../models/transport-backend';
import { BehaviorSubject } from 'rxjs';
import { SwuBackend } from '../models/backends/swu-backend';
import { EfaBackend } from '../models/backends/efa-backend';

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
  }
  
}
