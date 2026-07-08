import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TramService } from '../../services/tram';
import { Stop } from '../../models/transport-backend';
import { EfaBackend } from '../../models/backends/efa/efa-backend';
import { EfaConfig, AVV_CONFIG } from '../../models/backends/efa/efa-config';
import { StopSearchComponent } from '../stop-search/stop-search';
import { StopCardComponent } from '../stop-card/stop-card';
import { ClockComponent } from '../clock/clock';
import { EfaSettingsComponent } from '../efa-settings/efa-settings';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StopSearchComponent, StopCardComponent, ClockComponent, EfaSettingsComponent],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  savedStops: Stop[] = [];
  
  displayMode: 'vfd' | 'static' | 'e-ink' = 'vfd';
  availableModes = [
    { id: 'vfd', label: 'VFD (Animated)' },
    { id: 'static', label: 'VFD (Static)' },
    { id: 'e-ink', label: 'E-Ink' }
  ];
  
  availableBackends: {name: string, label: string}[] = [];
  currentBackend = '';
  editingEfaConfig: EfaConfig | null = null;

  constructor(
    private tramService: TramService,
    private efaBackend: EfaBackend
  ) { }

  ngOnInit() {
    this.availableBackends = this.tramService.getAvailableBackends();
    
    // subscribe to backend changes
    this.tramService.backendChanged$.subscribe(name => {
      this.currentBackend = name;
      this.availableBackends = this.tramService.getAvailableBackends();
      this.refreshStops();
    });

    // check URL params for shared boards
    this.handleUrlParams();

    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('mode')) {
        const savedMode = localStorage.getItem('tram-display-mode');
        if (savedMode && ['vfd', 'static', 'e-ink'].includes(savedMode)) {
          this.setDisplayMode(savedMode as any);
        }
    }
  }

  private handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const backendParam = params.get('backend');
    const stopsParam = params.get('stops');
    const modeParam = params.get('mode');
    const efaConfigParam = params.get('efaConfig');

    if (efaConfigParam) {
        try {
            const config = JSON.parse(atob(efaConfigParam));
            this.efaBackend.setConfig(config);
            this.availableBackends = this.tramService.getAvailableBackends();
        } catch (e) {
            console.error("Invalid EFA config in URL", e);
        }
    }

    if (backendParam && this.availableBackends.find(b => b.name === backendParam)) {
      this.tramService.setBackend(backendParam);
    }
    
    if (modeParam && ['vfd', 'static', 'e-ink'].includes(modeParam)) {
        this.setDisplayMode(modeParam as any);
    }

    if (stopsParam) {
      const rawItems = stopsParam.split(',').map(s => s.trim()).filter(s => !!s);
      const idsToFetch: string[] = [];
      const configMap = new Map<string, {pinned: boolean, walkingTime?: number, hideUnreachable: boolean}>();

      for (const item of rawItems) {
         // format: id!pinned(1/0)!walkingTime!hide(1/0)
         const parts = item.split('!');
         const id = parts[0];
         idsToFetch.push(id);
         
         if (parts.length > 1) {
             configMap.set(id, {
                 pinned: parts[1] === '1',
                 walkingTime: parts[2] ? parseInt(parts[2], 10) : undefined,
                 hideUnreachable: parts[3] === '1'
             });
         }
      }

      if (idsToFetch.length > 0) {
        this.tramService.resolveStopsFromIds(idsToFetch).subscribe(stops => {
          if (stops && stops.length > 0) {
             stops.forEach(s => {
                 const conf = configMap.get(s.id);
                 if (conf) {
                     s.pinned = conf.pinned;
                     if (conf.walkingTime) s.walkingTime = conf.walkingTime;
                     s.hideUnreachable = conf.hideUnreachable;
                 }
             });

             this.tramService.setStops(stops);
             this.refreshStops();
          }
        });
      }
    }
  }
  
  copyShareUrl() {
    // Encode Config: ID!PINNED!WALKING!HIDE
    const stopStrings = this.savedStops.map(s => {
        const id = s.id;
        const p = s.pinned ? '1' : '0';
        const w = s.walkingTime || '';
        const h = s.hideUnreachable ? '1' : '0';
        // e.g. "1234!0!!0" or "1234!1!5!1"
        return `${id}!${p}!${w}!${h}`;
    });
    
    const ids = stopStrings.join(',');
    const url = new URL(window.location.href);
    url.searchParams.set('backend', this.currentBackend);
    url.searchParams.set('stops', ids);
    url.searchParams.set('mode', this.displayMode);
    
    if (this.currentBackend.startsWith('efa')) {
        const config = this.efaBackend.getCurrentConfig();
        // b64 representation of JSON
        url.searchParams.set('efaConfig', btoa(JSON.stringify(config)));
    }
    
    navigator.clipboard.writeText(url.toString()).then(() => {
      alert(`URL:\n ${url.toString()} \n copied to clipboard!`);
    });
  }

  onBackendChange(event: any) {
    const name = event.target.value;
    this.tramService.setBackend(name);
  }

  onDisplayModeChange(event: any) {
      this.setDisplayMode(event.target.value);
  }

  setDisplayMode(mode: 'vfd' | 'static' | 'e-ink') {
    this.displayMode = mode;
    localStorage.setItem('tram-display-mode', mode);
    
    if (mode === 'e-ink') {
      document.body.classList.add('e-ink-mode');
    } else {
      document.body.classList.remove('e-ink-mode');
    }
  }

  onStopAdded(stop: Stop) {
    this.refreshStops();
  }

  onRemoveStop(stopId: string) {
    this.tramService.removeStop(stopId);
    this.refreshStops();
  }
  
  onUpdateStop(stop: Stop) {
    this.tramService.updateStop(stop);
    this.refreshStops();
  }

  trackByStopId(index: number, stop: Stop): string {
    return stop.id;
  }

  private refreshStops() {
    const currentStops = this.savedStops;
    
    let newStops = this.tramService.getSavedStops().sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
    });
    
    this.savedStops = newStops;
  }

  openEfaSettings() {
      this.editingEfaConfig = this.efaBackend.getCurrentConfig();
  }

  addEfaConfig() {
      this.editingEfaConfig = {
          ...AVV_CONFIG,
          id: `efa-${Date.now()}`,
          name: 'New EFA Configuration',
          regionCodes: [] 
      };
  }

  closeEfaSettings() {
      this.editingEfaConfig = null;
  }
}


