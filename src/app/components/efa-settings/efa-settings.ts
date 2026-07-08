import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EfaBackend } from '../../models/backends/efa/efa-backend';
import { EfaConfig } from '../../models/backends/efa/efa-config';
import { TramService } from '../../services/tram';

@Component({
  selector: 'app-efa-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './efa-settings.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./efa-settings.scss']
})
export class EfaSettingsComponent implements OnInit {
  @Input() initialConfig!: EfaConfig;
  @Output() closeSettings = new EventEmitter<void>();
  
  config!: EfaConfig;
  
  searchQuery = '';
  searchResults: any[] = [];
  manualCode: string | null = null;

  constructor(private efaBackend: EfaBackend, private tramService: TramService) {}

  ngOnInit() {
      if (this.initialConfig) {
          this.config = JSON.parse(JSON.stringify(this.initialConfig));
      } else {
          const current = this.efaBackend.getCurrentConfig();
          this.config = JSON.parse(JSON.stringify(current));
      }
  }

  save() {
    this.efaBackend.setConfig(this.config);
    this.tramService.setBackend(`efa:${this.config.id}`);
    this.close();
  }

  deleteConfig() {
    if (this.config.id === 'efa-avv') return;
    
    if (confirm(`Are you sure you want to delete "${this.config.name}"?`)) {
        this.tramService.deleteBackendData(`efa:${this.config.id}`);

        this.efaBackend.removeConfig(this.config.id);
        this.tramService.setBackend('efa:efa-avv');
        this.close();
    }
  }
  
  close() {
    this.closeSettings.emit();
  }
  
  removeRegion(code: string) {
    this.config.regionCodes = this.config.regionCodes.filter(c => c !== code);
  }
  
  addRegion(code: string) {
    if (!this.config.regionCodes.includes(code)) {
        this.config.regionCodes.push(code);
    }
  }
  
  addManual() {
     if (this.manualCode && !this.config.regionCodes.includes(this.manualCode)) {
        this.config.regionCodes.push(this.manualCode);
        this.manualCode = null;
     }
  }

  search() {
    if (!this.searchQuery) return;
    
    this.efaBackend.naiveSearchGID(this.searchQuery).subscribe(results => {
        const rawResults = results.filter(r => !!r.gid);
        
        const regionMap = new Map<string, {name: string, gid: string, count: number}>();
        
        rawResults.forEach(r => {
            // try to find a city name for the region if possible, but fallback to the name of the result if not available
             
             const parts = r.gid.split(':');
             let regionCode = r.gid;
             
             if (parts.length >= 3) {
                 regionCode = `${parts[0]}:${parts[1]}`;
             }
             
             if (!regionMap.has(regionCode)) {
                 regionMap.set(regionCode, {
                     name: r.city || r.name,
                     gid: regionCode,
                     count: 0
                 });
             }
             
             const entry = regionMap.get(regionCode)!;
             entry.count++;
             if (!entry.name && r.city) entry.name = r.city;
        });
        // sourt by count desc
        this.searchResults = Array.from(regionMap.values()).sort((a, b) => b.count - a.count);
    });
  }
}
