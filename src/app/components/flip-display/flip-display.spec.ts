import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { vi } from 'vitest';

import { FlipDisplayComponent } from './flip-display';

function readBoard(fixture: ComponentFixture<FlipDisplayComponent>): string {
  const letters = fixture.nativeElement.querySelectorAll('.letter .bottom .text');
  return Array.from(letters)
    .map((el) => (el as HTMLElement).innerHTML || ' ')
    .join('');
}

describe('FlipDisplay', () => {
  let component: FlipDisplayComponent;
  let fixture: ComponentFixture<FlipDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlipDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FlipDisplayComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders 34 letter slots', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.letter').length).toBe(34);
  });

  it('shows the initial value instantly, uppercased and padded with spaces', () => {
    component.value = 'Ulm Hbf';
    fixture.detectChanges();

    const board = readBoard(fixture);
    expect(board.length).toBe(34);
    expect(board.startsWith('ULM HBF')).toBe(true);
    expect(board.substring(7).trim()).toBe('');
  });

  it('translates ß to ss before rendering', () => {
    component.value = 'Straße';
    fixture.detectChanges();

    expect(readBoard(fixture).startsWith('STRASSE ')).toBe(true);
  });

  it('renders unsupported characters as blanks', () => {
    component.value = 'A@B';
    fixture.detectChanges();

    expect(readBoard(fixture).startsWith('A B ')).toBe(true);
  });

  it('flips to a new value over time when the input changes', () => {
    component.value = '';
    fixture.detectChanges();

    vi.useFakeTimers();
    component.value = 'AB';
    component.ngOnChanges({ value: new SimpleChange('', 'AB', false) });

    // 20ms stagger + up to 400ms jitter per letter, then ~110ms per flap tick
    vi.advanceTimersByTime(10000);

    expect(readBoard(fixture).startsWith('AB ')).toBe(true);
  });
});
