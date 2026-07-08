import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TramService } from '../../services/tram';
import { Departure, Stop } from '../../models/transport-backend';
import { FlipDisplayComponent } from '../flip-display/flip-display';
import { Subscription, timer, switchMap, retry } from 'rxjs';

@Component({
  selector: 'app-stop-card',
  standalone: true,
  imports: [CommonModule, FormsModule, FlipDisplayComponent],
  templateUrl: './stop-card.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './stop-card.scss'
})
export class StopCardComponent implements OnInit, OnDestroy {
  @Input() stop!: Stop;
  // Modes: 'vfd' | 'static' | 'e-ink'
  @Input() displayMode: string = 'vfd';
  @Output() remove = new EventEmitter<string>();
  @Output() update = new EventEmitter<Stop>();
  
  departures: Departure[] = [];
  rawDepartures: Departure[] = [];
  loading = true;
  filterReachable = false;
  showSettings = false;
  
  private sub?: Subscription;

  constructor(private tramService: TramService) { }

  ngOnInit() {
    if (this.stop.hideUnreachable) {
        this.filterReachable = true;
    }

    // local timer loop for view updates every 10s
    this.sub = timer(0, 10000).subscribe(() => {
        this.updateView();
    });

    // synchronize API fetches to the start of each minute
    const now = new Date();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();
    let delayMs = (60 - seconds) * 1000 - ms;
    if (delayMs <= 0) delayMs += 60000;

    // // random jitter (0-2000ms) to prevent all cards hitting API exactly at once
    // const jitter = Math.floor(Math.random() * 2000);
    // delayMs += jitter;

    // update every minute
    const fetchSub = timer(delayMs, 60000).pipe(
      switchMap(() => {
        return this.fetchDepartures();
      })
    ).subscribe({
      next: deps => {
        this.processDepartures(deps);
      },
      error: (err) => {
        this.loading = false;
      }
    });
    
    this.sub.add(fetchSub);
    
    this.refreshOnce();
  }
  
  private fetchDepartures() {
      // check for walking time offset
      const offset = (this.filterReachable && this.stop.walkingTime) ? this.stop.walkingTime : 0;
      // console.log(`[StopCard] ${this.stop.name} - Refreshing departures with offset ${offset} min...`);
      return this.tramService.getDepartures(this.stop.id, offset).pipe(retry(1));
  }
  
  private processDepartures(deps: Departure[]) {
      // console.log(`[StopCard] ${this.stop.name} - Received ${deps.length} departures`);
      this.rawDepartures = deps;
      
      this.updateView();
      this.loading = false;
  }
  
  private refreshOnce() {
    // console.log(`[StopCard] ${this.stop.name} - Initial refresh...`);
    this.fetchDepartures().subscribe(deps => {
        this.processDepartures(deps);
    });
  }
  
  togglePin() {
    this.stop.pinned = !this.stop.pinned;
    this.update.emit(this.stop);
  }
  
  toggleSettings() {
    this.showSettings = !this.showSettings;
  }
  
  toggleFilter() {
    this.stop.hideUnreachable = this.filterReachable;
    this.update.emit(this.stop);
    
    this.updateView(); 
    this.refreshOnce();
  }
  
  saveWalkingTime() {
     this.stop.walkingTime = Number(this.stop.walkingTime);
     this.update.emit(this.stop);
     this.updateView();
  }

  private updateView() {
    const now = Date.now();
    
    // update time strings
    const updatedDeps = this.rawDepartures.map(d => {
       const diff = d.timestamp - now;
       let mins = Math.ceil(diff / 60000);
       
       // display as minutes or time
       let timeStr = "";
       if (mins <= 0) {
          timeStr = "now";
       } else if (mins > 600) {
           const date = new Date(d.timestamp);
           const h = date.getHours(); 
           const m = date.getMinutes().toString().padStart(2,'0');
           timeStr = `${h}:${m}`;
       } else {
           timeStr = `${mins} min`;
       }
       
       return { ...d, time: timeStr };
    });
    
    this.groupDepartures(updatedDeps);
  }

  private groupDepartures(deps: Departure[]) {
    // sort using timestamps from service by timestamp, line, direction
    let sorted = [...deps].sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      if (a.line !== b.line) return a.line.localeCompare(b.line);
      return a.direction.localeCompare(b.direction);
    });
    
    if (this.filterReachable && this.stop.walkingTime) {
       const now = Date.now();
       const buffer = this.stop.walkingTime * 60000;
       
       sorted = sorted.filter(d => {
           // keep if timestamp is > now + buffer
           // if timestamp - now < buffer -> Unreachable.
           return (d.timestamp - now) >= buffer;
       });
    }
    
    // next 5 departures only
    const limited = sorted.slice(0, 5);
    
    // pad with empty objects to ensure 5 lines exist
    const padded = [...limited];
    while (padded.length < 5) {
      padded.push({ line: '', direction: '', time: '', realtime: false, timestamp: 0, delayed: false });
    }
    
    this.departures = padded;
  }

  getParts(d: Departure) {
    const line = this.pad(d.line, 3);
    
    // safe replace for ß
    let safeDest = (d.direction || '').replace(/ß/g, 'ss');
    // safeDest = safeDest.replace(/ß/g, 'ss');
    
    const dest = this.pad(safeDest, 22);
    const time = (d.time || '').padStart(7, ' ');
    
    return { line, dest, time };
  }

  getRowString(d: Departure): string {
    const p = this.getParts(d);
    return `${p.line} ${p.dest} ${p.time}`;
  }

  isUrgent(d: Departure): boolean {
    if (!d.time) return false;
    
    if (d.time.includes('min')) {
      const parts = d.time.split(' ');
      const min = parseInt(parts[0]);
      if (!isNaN(min) && min <= 1) return true;
    }
    
    const t = d.time.toLowerCase().trim();
    if (t === '0' || t === 'sofort' || t === 'now') return true;

    return false;
  }
  
  private pad(str: string, len: number): string {
    if (str.length > len) {
       return str.substring(0, len);
    }
    return str.padEnd(len, ' ');
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onRemove() {
    this.remove.emit(this.stop.id);
  }
}
