import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clock.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './clock.scss'
})
export class ClockComponent implements OnInit, OnDestroy {
  hours = 0;
  minutes = 0;
  seconds = 0;
  
  marks: { angle: number, isHour: boolean, isQuarter: boolean }[] = [];
  
  private animationFrameId: any;

  constructor() {
    // minute ticks
    for (let i = 0; i < 60; i++) {
      this.marks.push({
        angle: i * 6,
        isHour: i % 5 === 0,
        isQuarter: i % 15 === 0
      });
    }
  }

  ngOnInit() {
    this.startLoop();
  }

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  startLoop() {
    const loop = () => {
      this.updateTime();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  updateTime() {
    const now = new Date();
    
    // Swiss Clock Seconds: 
    // Cycle is 0 to 60s.
    // Motion: Hand sweeps 360deg in 58.5s.
    // Pause: Hand holds at 12 o'clock for 1.5s.
    
    const ms = now.getMilliseconds();
    const sec = now.getSeconds() + ms / 1000;
    
    const SWISS_CYCLE = 58.5;
    
    if (sec < SWISS_CYCLE) {
      this.seconds = (sec / SWISS_CYCLE) * 60;
    } else {
      this.seconds = 60;
    }
    this.minutes = now.getMinutes();
    this.hours = (now.getHours() % 12) + now.getMinutes() / 60;
  }
}