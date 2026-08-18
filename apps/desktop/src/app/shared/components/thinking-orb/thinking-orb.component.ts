import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  NgZone,
  viewChild,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  resolvePreset,
  MODE_DRAWS,
  type OrbState,
  type OrbSize,
} from 'thinking-orbs/engine';

@Component({
  selector: 'thinking-orb',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas
      #orbCanvas
      [style.width.px]="displaySize"
      [style.height.px]="displaySize"
      class="block shrink-0 select-none pointer-events-none"
    ></canvas>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        line-height: 1;
      }
    `,
  ],
})
export class ThinkingOrbComponent implements OnInit, OnDestroy, OnChanges {
  private readonly ngZone = inject(NgZone);
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('orbCanvas');

  @Input() state: OrbState = 'composing';
  @Input() size = 24;
  @Input() theme: 'auto' | 'dark' | 'light' = 'auto';

  private animFrameId: number | null = null;
  private startTime = 0;

  get displaySize(): number {
    return this.size || 24;
  }

  // Always use the full-detail 64 preset so the 3D sphere is complete and identical everywhere
  readonly targetPresetSize: OrbSize = 64;

  ngOnInit(): void {
    this.startAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state'] || changes['size'] || changes['theme']) {
      this.restartAnimation();
    }
  }

  ngOnDestroy(): void {
    this.stopAnimation();
  }

  private isDarkMode(): boolean {
    if (this.theme === 'dark') return true;
    if (this.theme === 'light') return false;
    // Auto-detect from HTML dark class or media query
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
             document.documentElement.classList.contains('scheme-dark');
    }
    return true;
  }

  private startAnimation(): void {
    this.stopAnimation();

    this.ngZone.runOutsideAngular(() => {
      this.startTime = performance.now();
      const render = (now: number) => {
        this.drawFrame(now);
        this.animFrameId = requestAnimationFrame(render);
      };
      this.animFrameId = requestAnimationFrame(render);
    });
  }

  private stopAnimation(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private restartAnimation(): void {
    this.startAnimation();
  }

  private drawFrame(now: number): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const baseSize = this.targetPresetSize; // 20 or 64
    const scaleFactor = this.displaySize / baseSize;

    const pixelWidth = Math.round(this.displaySize * dpr);
    const pixelHeight = Math.round(this.displaySize * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.save();
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);

    // Apply scale for DPR and arbitrary size scaling
    ctx.scale(dpr * scaleFactor, dpr * scaleFactor);

    const preset = resolvePreset(this.state, baseSize);
    const drawFn = MODE_DRAWS[preset.mode];

    const elapsedSec = (now - this.startTime) / 1000;
    const t = elapsedSec * preset.speed;
    const dark = this.isDarkMode();

    if (drawFn) {
      drawFn(ctx, baseSize, t, dark, preset.opts);
    }

    ctx.restore();
  }
}
