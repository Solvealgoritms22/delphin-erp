import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { EmailEditorComponent } from '@shared/components/email-editor/email-editor.component';
import { environment } from '@/environments/environment';

type Design = { subject: string; heading: string; body: string; footer: string; accent: string };
type Template = Design & { key: string; editable: boolean; customized: boolean; revision: number; variables: string[] };
type Payload = { templates: Template[] };

const PRESET_COLORS = [
  { name: 'Azul Corporativo', value: '#2563eb' },
  { name: 'Índigo Real', value: '#4f46e5' },
  { name: 'Esmeralda', value: '#059669' },
  { name: 'Ámbar Comercial', value: '#d97706' },
  { name: 'Rosa Carmín', value: '#e11d48' },
  { name: 'Carbón Clásico', value: '#0f172a' },
];

@Component({
  selector: 'app-email-templates',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslocoPipe,
    SkeletonComponent,
    EmptyStateComponent,
    EmailEditorComponent,
  ],
  template: `
    <div class="flex h-full min-w-0 flex-col overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">
      <!-- Header Estándar Oficial Dolphin ERP -->
      <div class="relative shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between py-6 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {{ 'emailTemplates.title' | transloco }}
          </h1>
          <p class="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'emailTemplates.description' | transloco }}
          </p>
        </div>

        @if (selected(); as item) {
          @if (item.editable) {
            <div class="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <button
                mat-stroked-button
                type="button"
                class="!rounded-xl !h-10 !px-4 text-xs font-medium"
                (click)="reset(item)"
                [disabled]="saving()"
              >
                <mat-icon svgIcon="rotate-ccw" class="!w-4 !h-4 mr-1.5 text-neutral-500"></mat-icon>
                <span>{{ 'emailTemplates.restore' | transloco }}</span>
              </button>

              <button
                mat-flat-button
                type="button"
                class="!rounded-xl !h-10 !px-5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                (click)="save(item)"
                [disabled]="saving()"
              >
                <mat-icon [svgIcon]="saving() ? 'refresh-cw' : 'check'" class="!w-4 !h-4 mr-1.5" [class.animate-spin]="saving()"></mat-icon>
                <span>{{ (saving() ? 'common.saving' : 'common.save') | transloco }}</span>
              </button>
            </div>
          }
        }
      </div>

      <!-- Contenido Principal -->
      @if (loading()) {
        <div class="p-6 md:p-8 space-y-5">
          <app-skeleton type="card" height="7rem" />
          <app-skeleton type="card" height="7rem" />
          <app-skeleton type="card" height="7rem" />
        </div>
      } @else if (error() || templates().length === 0) {
        <div class="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
          <app-empty-state
            illustration="18.svg"
            illustrationDark="18-dark.svg"
            type="error"
            [title]="'emailTemplates.loadError' | transloco"
            [description]="'common.serverErrorDescription' | transloco"
            [actionLabel]="'common.retry' | transloco"
            actionIcon="refresh-cw"
            (action)="load()"
          />
        </div>
      } @else {
        <div class="flex-auto overflow-y-auto p-4 sm:p-6 md:p-8">
          <div class="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] gap-6 h-full items-start">
            
            <!-- Barra Lateral: Lista de Plantillas -->
            <aside class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-xs space-y-1">
              <div class="px-3 py-2 text-2xs font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                {{ 'emailTemplates.title' | transloco }}
              </div>
              @for (item of templates(); track item.key) {
                <button
                  type="button"
                  (click)="select(item)"
                  class="w-full text-left rounded-xl px-3.5 py-3 transition-all flex flex-col gap-1.5 group cursor-pointer"
                  [class.bg-blue-50]="selected()?.key === item.key"
                  [class.text-blue-900]="selected()?.key === item.key"
                  [class.dark:bg-blue-500/10]="selected()?.key === item.key"
                  [class.dark:text-blue-200]="selected()?.key === item.key"
                  [class.hover:bg-neutral-50]="selected()?.key !== item.key"
                  [class.dark:hover:bg-neutral-800/50]="selected()?.key !== item.key"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-semibold truncate">{{ label(item.key) }}</span>
                    <span
                      class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-2xs font-medium border"
                      [class.bg-emerald-50]="item.editable"
                      [class.text-emerald-700]="item.editable"
                      [class.border-emerald-200]="item.editable"
                      [class.dark:bg-emerald-500/10]="item.editable"
                      [class.dark:text-emerald-300]="item.editable"
                      [class.dark:border-emerald-500/20]="item.editable"
                      [class.bg-neutral-100]="!item.editable"
                      [class.text-neutral-600]="!item.editable"
                      [class.border-neutral-200]="!item.editable"
                      [class.dark:bg-neutral-800]="!item.editable"
                      [class.dark:text-neutral-400]="!item.editable"
                      [class.dark:border-neutral-700]="!item.editable"
                    >
                      {{ item.editable ? ('emailTemplates.editable' | transloco) : ('emailTemplates.systemManaged' | transloco) }}
                    </span>
                  </div>
                  <span class="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                    {{ item.subject }}
                  </span>
                </button>
              }
            </aside>

            <!-- Sección Central y Derecha: Editor + Live Preview -->
            @if (selected(); as item) {
              <div class="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 items-start">
                
                <!-- Panel de Edición -->
                <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden">
                  <!-- Cabecera de la plantilla -->
                  <div class="p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/40 dark:bg-neutral-900">
                    <div>
                      <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ label(item.key) }}</h2>
                      <p class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {{ item.editable ? ('emailTemplates.editorHelp' | transloco) : ('emailTemplates.systemHelp' | transloco) }}
                      </p>
                    </div>
                  </div>

                  <!-- Formulario de Configuración -->
                  <div class="p-5 sm:p-6 space-y-5">
                    <!-- Asunto -->
                    <div class="space-y-1.5">
                      <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                        {{ 'emailTemplates.subject' | transloco }}
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="item.subject"
                        (ngModelChange)="onDesignChange(item)"
                        [disabled]="!item.editable"
                        [placeholder]="'emailTemplates.subjectPlaceholder' | transloco"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-neutral-100 dark:disabled:bg-neutral-800/50 disabled:text-neutral-500 transition-all shadow-2xs"
                      />
                    </div>

                    <!-- Título (Heading) -->
                    <div class="space-y-1.5">
                      <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                        {{ 'emailTemplates.heading' | transloco }}
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="item.heading"
                        (ngModelChange)="onDesignChange(item)"
                        [disabled]="!item.editable"
                        [placeholder]="'emailTemplates.headingPlaceholder' | transloco"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-neutral-100 dark:disabled:bg-neutral-800/50 disabled:text-neutral-500 transition-all shadow-2xs"
                      />
                    </div>

                    <!-- Color de Acento -->
                    <div class="space-y-2 pt-1">
                      <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                        {{ 'emailTemplates.accentColor' | transloco }}
                      </label>
                      <div class="flex flex-wrap items-center gap-2.5">
                        @for (preset of presets; track preset.value) {
                          <button
                            type="button"
                            (click)="setAccentColor(item, preset.value)"
                            [disabled]="!item.editable"
                            class="size-7 rounded-full transition-transform border-2 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed hover:scale-110 active:scale-95 shadow-2xs"
                            [style.background-color]="preset.value"
                            [class.border-white]="item.accent === preset.value"
                            [class.ring-2]="item.accent === preset.value"
                            [class.ring-blue-500]="item.accent === preset.value"
                            [class.border-transparent]="item.accent !== preset.value"
                            [matTooltip]="preset.name"
                          >
                            @if (item.accent === preset.value) {
                              <mat-icon svgIcon="check" class="!w-3.5 !h-3.5 text-white"></mat-icon>
                            }
                          </button>
                        }

                        <div class="flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-neutral-700">
                          <input
                            type="color"
                            [(ngModel)]="item.accent"
                            (ngModelChange)="onDesignChange(item)"
                            [disabled]="!item.editable"
                            class="size-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent disabled:cursor-not-allowed"
                          />
                          <span class="text-xs font-mono font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                            {{ item.accent }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Editor Enriquecido TipTap -->
                    <div class="space-y-1.5 pt-1">
                      <div class="flex items-center justify-between">
                        <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                          {{ 'emailTemplates.body' | transloco }}
                        </label>
                        <span class="text-2xs text-neutral-400 dark:text-neutral-500">
                          HTML & Imágenes permitidas
                        </span>
                      </div>
                      <app-email-editor
                        [content]="item.body"
                        [editable]="item.editable"
                        [variables]="item.variables"
                        (contentChange)="onBodyChange(item, $event)"
                      />
                    </div>

                    <!-- Pie de correo (Footer) -->
                    <div class="space-y-1.5 pt-1">
                      <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                        {{ 'emailTemplates.footer' | transloco }}
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="item.footer"
                        (ngModelChange)="onDesignChange(item)"
                        [disabled]="!item.editable"
                        [placeholder]="'emailTemplates.footerPlaceholder' | transloco"
                        class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-neutral-100 dark:disabled:bg-neutral-800/50 disabled:text-neutral-500 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </section>

                <!-- Panel de Vista Previa en Vivo (Live Preview) -->
                <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden sticky top-4">
                  <!-- Header del Live Preview -->
                  <div class="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900">
                    <div class="flex items-center gap-2">
                      <span class="relative flex size-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                      </span>
                      <span class="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                        {{ 'emailTemplates.livePreview' | transloco }}
                      </span>
                      @if (previewing()) {
                        <mat-icon svgIcon="refresh-cw" class="!w-3 !h-3 text-neutral-400 animate-spin"></mat-icon>
                      }
                    </div>

                    <!-- Selector Escritorio / Móvil -->
                    <div class="flex items-center bg-neutral-200/70 dark:bg-neutral-800 p-0.5 rounded-lg">
                      <button
                        type="button"
                        (click)="previewDevice.set('desktop')"
                        class="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
                        [class.bg-white]="previewDevice() === 'desktop'"
                        [class.dark:bg-neutral-700]="previewDevice() === 'desktop'"
                        [class.text-neutral-900]="previewDevice() === 'desktop'"
                        [class.dark:text-white]="previewDevice() === 'desktop'"
                        [class.shadow-2xs]="previewDevice() === 'desktop'"
                        [class.text-neutral-500]="previewDevice() !== 'desktop'"
                      >
                        <mat-icon svgIcon="monitor" class="!w-3.5 !h-3.5"></mat-icon>
                        <span>{{ 'emailTemplates.previewDesktop' | transloco }}</span>
                      </button>

                      <button
                        type="button"
                        (click)="previewDevice.set('mobile')"
                        class="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer"
                        [class.bg-white]="previewDevice() === 'mobile'"
                        [class.dark:bg-neutral-700]="previewDevice() === 'mobile'"
                        [class.text-neutral-900]="previewDevice() === 'mobile'"
                        [class.dark:text-white]="previewDevice() === 'mobile'"
                        [class.shadow-2xs]="previewDevice() === 'mobile'"
                        [class.text-neutral-500]="previewDevice() !== 'mobile'"
                      >
                        <mat-icon svgIcon="smartphone" class="!w-3.5 !h-3.5"></mat-icon>
                        <span>{{ 'emailTemplates.previewMobile' | transloco }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- Frame Container -->
                  <div class="p-4 sm:p-6 bg-neutral-100/70 dark:bg-neutral-950/80 flex items-center justify-center min-h-[600px] overflow-hidden">
                    @if (previewHtml()) {
                      <div
                        class="transition-all duration-300 shadow-md rounded-xl overflow-hidden bg-white"
                        [class.w-full]="previewDevice() === 'desktop'"
                        [class.max-w-[390px]]="previewDevice() === 'mobile'"
                        [class.border-4]="previewDevice() === 'mobile'"
                        [class.border-neutral-800]="previewDevice() === 'mobile'"
                        [class.rounded-3xl]="previewDevice() === 'mobile'"
                      >
                        <iframe
                          class="w-full h-[640px] bg-white block border-0"
                          title="Vista previa de correo"
                          [srcdoc]="previewHtml()"
                        ></iframe>
                      </div>
                    } @else {
                      <div class="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-2">
                        <mat-icon svgIcon="refresh-cw" class="!w-6 !h-6 animate-spin text-neutral-400"></mat-icon>
                        <span class="text-xs">{{ 'emailTemplates.previewHint' | transloco }}</span>
                      </div>
                    }
                  </div>
                </section>

              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class EmailTemplatesComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly snack = inject(MatSnackBar);
  private readonly i18n = inject(TranslocoService);
  private readonly api = `${environment.apiUrl}/email-templates`;

  readonly presets = PRESET_COLORS;
  readonly templates = signal<Template[]>([]);
  readonly selected = signal<Template | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly previewing = signal(false);
  readonly previewHtml = signal('');
  readonly previewDevice = signal<'desktop' | 'mobile'>('desktop');

  private previewSubject$ = new Subject<Template>();
  private previewSub?: Subscription;

  ngOnInit(): void {
    this.previewSub = this.previewSubject$
      .pipe(debounceTime(350))
      .subscribe((tpl) => {
        this.fetchPreview(tpl);
      });

    this.load();
  }

  ngOnDestroy(): void {
    this.previewSub?.unsubscribe();
  }

  label(key: string): string {
    return this.i18n.translate('emailTemplates.types.' + key);
  }

  load(): void {
    this.loading.set(true);
    this.http.get<Payload>(this.api).subscribe({
      next: (data) => {
        this.templates.set(data.templates);
        const first = data.templates[0] || null;
        this.selected.set(first);
        this.error.set(false);
        this.loading.set(false);
        if (first) {
          this.triggerPreview(first);
        }
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
        this.notice('emailTemplates.loadError');
      },
    });
  }

  select(item: Template): void {
    this.selected.set(item);
    this.triggerPreview(item);
  }

  onDesignChange(item: Template): void {
    this.triggerPreview(item);
  }

  onBodyChange(item: Template, newHtml: string): void {
    item.body = newHtml;
    this.triggerPreview(item);
  }

  setAccentColor(item: Template, color: string): void {
    if (!item.editable) return;
    item.accent = color;
    this.triggerPreview(item);
  }

  private triggerPreview(item: Template): void {
    this.previewSubject$.next(item);
  }

  private fetchPreview(item: Template): void {
    this.previewing.set(true);
    this.http.post<{ html: string }>(`${this.api}/${item.key}/preview`, this.design(item)).subscribe({
      next: (value) => {
        this.previewHtml.set(value.html);
        this.previewing.set(false);
      },
      error: () => {
        this.previewing.set(false);
      },
    });
  }

  save(item: Template): void {
    this.saving.set(true);
    this.http.put<Template>(`${this.api}/${item.key}`, { ...this.design(item), revision: item.revision }).subscribe({
      next: (value) => {
        this.replace(value);
        this.saving.set(false);
        this.notice('emailTemplates.saved');
      },
      error: (err) => {
        this.saving.set(false);
        this.notice(err.status === 409 ? 'emailTemplates.conflict' : 'emailTemplates.saveError');
      },
    });
  }

  reset(item: Template): void {
    this.saving.set(true);
    this.http.post<Template>(`${this.api}/${item.key}/reset`, { revision: item.revision }).subscribe({
      next: (value) => {
        this.replace(value);
        this.saving.set(false);
        this.notice('emailTemplates.restored');
      },
      error: (err) => {
        this.saving.set(false);
        this.notice(err.status === 409 ? 'emailTemplates.conflict' : 'emailTemplates.saveError');
      },
    });
  }

  private design(item: Template): Design {
    return {
      subject: item.subject,
      heading: item.heading,
      body: item.body,
      footer: item.footer,
      accent: item.accent,
    };
  }

  private replace(updated: Template): void {
    const value = { ...this.selected()!, ...updated, customized: true };
    this.templates.update((list) => list.map((item) => (item.key === value.key ? value : item)));
    this.selected.set(value);
    this.triggerPreview(value);
  }

  private notice(key: string): void {
    this.snack.open(this.i18n.translate(key), this.i18n.translate('common.close'), { duration: 3500 });
  }
}

