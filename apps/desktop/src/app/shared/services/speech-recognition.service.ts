import { Injectable, signal, NgZone, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechRecognitionService {
  private ngZone = inject(NgZone);

  readonly isListening = signal<boolean>(false);
  readonly isSupported = signal<boolean>(false);
  readonly lastError = signal<string | null>(null);

  private recognition: any = null;
  private onResultCallback: ((spokenText: string) => void) | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      this.isSupported.set(false);
      return;
    }

    this.isSupported.set(true);

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = typeof navigator !== 'undefined' ? navigator.language || 'es-ES' : 'es-ES';

      this.recognition.onstart = () => {
        this.ngZone.run(() => {
          this.isListening.set(true);
          this.lastError.set(null);
        });
      };

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (const res of Array.from(event.results as any[])) {
          const transcript = res[0].transcript;
          if (res.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const fullText = (finalTranscript + interimTranscript).replace(/\s+/g, ' ').trim();
        if (fullText && this.onResultCallback) {
          this.ngZone.run(() => {
            this.onResultCallback?.(fullText);
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        this.ngZone.run(() => {
          if (event.error !== 'no-speech') {
            this.lastError.set(event.error || 'Error de reconocimiento');
          }
          this.isListening.set(false);
        });
      };

      this.recognition.onend = () => {
        this.ngZone.run(() => {
          this.isListening.set(false);
        });
      };
    } catch {
      this.isSupported.set(false);
    }
  }

  start(onResult: (spokenText: string) => void): boolean {
    if (!this.isSupported() || !this.recognition) {
      return false;
    }

    this.onResultCallback = onResult;

    try {
      if (this.isListening()) {
        this.recognition.stop();
      }
      this.recognition.start();
      return true;
    } catch {
      this.isListening.set(false);
      return false;
    }
  }

  stop(): void {
    if (this.recognition && this.isListening()) {
      try {
        this.recognition.stop();
      } catch {

      }
    }
    this.isListening.set(false);
    this.onResultCallback = null;
  }

  toggle(onResult: (spokenText: string) => void): boolean {
    if (this.isListening()) {
      this.stop();
      return false;
    } else {
      return this.start(onResult);
    }
  }
}
