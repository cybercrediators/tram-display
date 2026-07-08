import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChildren, QueryList, AfterViewInit, NgZone, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

// explicitly define characters
const LETTERS = " ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789.,':()&!?+-";
const DROP_TIME = 100;

class LetterController {
  private _element: HTMLElement;
  private _bottomText: HTMLElement;
  private _topText: HTMLElement;
  private _falling: HTMLElement;
  private _fallingText: HTMLElement;
  
  private _index = 0;
  private _interval: any = null;
  private _stopAt: number | null = null;

  constructor(el: HTMLElement) {
    this._element = el;
    this._bottomText = el.querySelector('.bottom .text') as HTMLElement;
    this._topText = el.querySelector('.top .text') as HTMLElement;
    this._falling = el.querySelector('.falling') as HTMLElement;
    this._fallingText = el.querySelector('.falling .text') as HTMLElement;

    // transition duration
    this._fallingText.style.transitionDuration = (DROP_TIME * 0.5) + 'ms';
  }

  setValue(value: string, instant = false) {
    let processed = value.toUpperCase();
    
    this._stopAt = LETTERS.indexOf(processed);
    
    if (this._stopAt < 0) this._stopAt = 0; // set space if char not found
    
    if (instant) {
      this.jumpTo(this._stopAt);
      return;
    }
    
    if (!this._interval && this._index !== this._stopAt) {
      this.spin(false);
    }
  }

  jumpTo(index: number) {
    this.destroy(); // stop any animation
    this._index = index;
    const char = LETTERS.charAt(this._index);
    
    this._topText.innerHTML = char;
    this._bottomText.innerHTML = char;
    this._falling.style.display = 'none';
  }

  spin(clear: boolean = true) {
    if (clear !== false) this._stopAt = null;
    this._interval = window.setInterval(() => this.tick(), DROP_TIME * 1.1);
  }

  private tick() {
    const oldValue = LETTERS.charAt(this._index);
    
    this._index = (this._index + 1) % LETTERS.length;
    const newValue = LETTERS.charAt(this._index);

    this._fallingText.innerHTML = oldValue;
    this._falling.style.display = 'block';
    this._topText.innerHTML = newValue;

    // reset falling text position
    window.setTimeout(() => {
      this._fallingText.style.transitionTimingFunction = 'ease-in';
      this._fallingText.style.transform = 'scaleY(0)';
    }, 1);

    window.setTimeout(() => {
      this._fallingText.innerHTML = newValue;
      
      this._falling.style.top = '-.03em';
      this._falling.style.bottom = 'auto';
      
      this._fallingText.style.top = '-.65em';
      
      this._fallingText.style.transitionTimingFunction = 'ease-out';
      this._fallingText.style.transform = 'scaleY(1)';
    }, DROP_TIME / 2);

    window.setTimeout(() => {
      this._bottomText.innerHTML = newValue;
      this._falling.style.display = 'none';
      
      this._falling.style.top = 'auto';
      this._falling.style.bottom = '0';
      this._fallingText.style.top = '0';
    }, DROP_TIME);

    if (this._index === this._stopAt) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  destroy() {
    if (this._interval) clearInterval(this._interval);
  }
}

@Component({
  selector: 'app-flip-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flip-display.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './flip-display.scss'
})
export class FlipDisplayComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() value: string = '';
  
  charIndices = new Array(34).fill(0); 

  private controllers: LetterController[] = [];
  private isInitialized = false;
  private pendingUpdates: any[] = [];
  
  @ViewChildren('board') boardRef!: QueryList<ElementRef>;

  constructor(private el: ElementRef, private ngZone: NgZone) {}

  ngAfterViewInit() {
    const letters = this.el.nativeElement.querySelectorAll('.letter');
    letters.forEach((l: HTMLElement) => {
      // run outside angular to avoid CD trashing on every tick
      this.ngZone.runOutsideAngular(() => {
        this.controllers.push(new LetterController(l));
      });
    });

    if (this.value) {
      // instant load on first init
      this.updateBoard(this.value, true);
      this.isInitialized = true;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && this.controllers.length > 0) {
      this.updateBoard(this.value || '');
    }
  }

  private updateBoard(val: string, instant = false) {
    // clear any pending updates from previous changes
    this.pendingUpdates.forEach(t => clearTimeout(t));
    this.pendingUpdates = [];

    // translate ß -> ss manually as it consumes 2 slots before "rendering"
    let safePad = val.replace(/ß/g, 'ss')
    const padded = safePad.padEnd(this.charIndices.length, ' ');
    
    
    this.controllers.forEach((ctrl, i) => {
      const char = padded[i] || ' ';
      
      if (instant) {
        ctrl.setValue(char, true);
      } else {
        // 20ms per index + random jitter
        const delay = 20 * i + Math.random() * 400;
        
        const timeoutId = setTimeout(() => {
          ctrl.setValue(char);
        }, delay);
        this.pendingUpdates.push(timeoutId);
      }
    });
  }

  ngOnDestroy() {
    this.pendingUpdates.forEach(t => clearTimeout(t));
    this.controllers.forEach(c => c.destroy());
  }
}