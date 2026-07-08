import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ClockComponent } from './clock';

describe('Clock', () => {
  let component: ClockComponent;
  let fixture: ComponentFixture<ClockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClockComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClockComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('generates 60 minute marks with hour marks every 5 and quarter marks every 15', () => {
    expect(component.marks.length).toBe(60);
    expect(component.marks.filter((m) => m.isHour).length).toBe(12);
    expect(component.marks.filter((m) => m.isQuarter).length).toBe(4);
    expect(component.marks[0]).toEqual({ angle: 0, isHour: true, isQuarter: true });
    expect(component.marks[7].angle).toBe(42);
    expect(component.marks[7].isHour).toBe(false);
  });

  it('scales the seconds hand so a full sweep takes 58.5s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 10, 30, 0, 0));

    component.updateTime();
    expect(component.seconds).toBe(0);

    // halfway through the swiss cycle the hand should point at 30
    vi.setSystemTime(new Date(2026, 0, 1, 10, 30, 29, 250));
    component.updateTime();
    expect(component.seconds).toBeCloseTo(30, 5);
  });

  it("holds the seconds hand at 12 o'clock during the pause window", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date(2026, 0, 1, 10, 30, 58, 500));
    component.updateTime();
    expect(component.seconds).toBe(60);

    vi.setSystemTime(new Date(2026, 0, 1, 10, 30, 59, 900));
    component.updateTime();
    expect(component.seconds).toBe(60);
  });

  it('computes hour hand position including minute fraction on a 12h dial', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 15, 30, 0, 0));

    component.updateTime();
    expect(component.hours).toBeCloseTo(3.5, 5);
    expect(component.minutes).toBe(30);
  });
});
