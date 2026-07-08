import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TramService } from '../../services/tram';
import { Stop } from '../../models/transport-backend';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({
  selector: 'app-stop-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stop-search.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './stop-search.scss'
})
export class StopSearchComponent {
  searchTerm: string = '';
  results: Stop[] = [];
  private searchSubject = new Subject<string>();
  
  @Output() stopAdded = new EventEmitter<Stop>();

  constructor(private tramService: TramService) {
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => this.tramService.searchStops(term))
    ).subscribe(stops => {
      this.results = stops;
    });
  }

  onSearch(term: string) {
    if (term.length > 2) {
      this.searchSubject.next(term);
    } else {
      this.results = [];
    }
  }

  add(stop: Stop) {
    this.tramService.addStop(stop);
    this.stopAdded.emit(stop);
    this.results = [];
    this.searchTerm = '';
  }
}