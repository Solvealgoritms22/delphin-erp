import { Component, OnDestroy, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthState } from '@core/auth/auth.state';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
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
type Template = Design & { key: string; editable: boolean; scope?: 'system' | 'tenant'; customized: boolean; revision: number; variables: string[] };
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
            <aside class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-xs space-y-1 max-h-80 lg:max-h-[calc(100vh-240px)] overflow-y-auto">
              <div class="px-3 py-2 text-2xs font-bold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                {{ 'emailTemplates.title' | transloco }}
              </div>
              <input class="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent p-2 text-sm mb-2" [placeholder]="'emailTemplates.search' | transloco" [attr.aria-label]="'emailTemplates.search' | transloco" [(ngModel)]="search" />
              @for (item of filteredTemplates(); track item.key) {
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
                    @if (item.scope === 'system') {
                      <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                        Sistema
                      </span>
                    }
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
                      <div class="flex items-center gap-2">
                        <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ label(item.key) }}</h2>
                        @if (item.scope === 'system') {
                          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            Plantilla del Sistema
                          </span>
                        } @else {
                          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                            Plantilla de la Empresa
                          </span>
                        }
                      </div>
                      <p class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {{ item.scope === 'system' ? 'Esta plantilla pertenece a la plataforma Dolphin ERP (solo lectura).' : ('emailTemplates.editorHelp' | transloco) }}
                      </p>
                    </div>
                  </div>

                  <!-- Formulario de Configuración -->
                  <div class="p-5 sm:p-6 space-y-5">
                    @if (!item.editable) {
                      <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <mat-icon svgIcon="shield" class="!w-4 !h-4 shrink-0"></mat-icon>
                        <span>Plantilla protegida del sistema. Utiliza el logo oficial de Dolphin ERP y sus textos son administrados por la plataforma.</span>
                      </div>
                    }

                    <!-- Asunto -->
                    <div class="space-y-1.5">
                      <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                        {{ 'emailTemplates.subject' | transloco }}
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="item.subject"
                        (ngModelChange)="onDesignChange(item)"
                        [disabled]="!item.editable || saving()"
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
                        [disabled]="!item.editable || saving()"
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
                            [disabled]="!item.editable || saving()"
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
                            [disabled]="!item.editable || saving()"
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
                      </div>
                      <app-email-editor
                        [content]="item.body"
                        [editable]="item.editable && !saving()"
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
                        [disabled]="!item.editable || saving()"
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
                  <div class="p-4 sm:p-6 bg-neutral-100/70 dark:bg-neutral-950/80 flex flex-col items-center justify-center min-h-[600px] overflow-hidden">
                    @if (previewHtml()) {
                      <div
                        class="transition-all duration-300 shadow-md rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                        [class.w-full]="previewDevice() === 'desktop'"
                        [class.max-w-[420px]]="previewDevice() === 'mobile'"
                        [class.border-4]="previewDevice() === 'mobile'"
                        [class.border-neutral-800]="previewDevice() === 'mobile'"
                        [class.rounded-3xl]="previewDevice() === 'mobile'"
                      >
                        <!-- Email Header Envelope (De, Para, Asunto) -->
                        <div class="px-5 py-3.5 bg-neutral-50/90 dark:bg-neutral-800/90 border-b border-neutral-200 dark:border-neutral-700/80 text-xs space-y-1.5 select-none">
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-neutral-400 dark:text-neutral-500 w-14 shrink-0">De:</span>
                            <span class="text-neutral-700 dark:text-neutral-300 font-medium truncate">
                              @if (item.scope === 'system') {
                                Dolphin ERP &lt;soporte&#64;delphin-erp.com&gt;
                              } @else {
                                {{ currentCompanyName() }} &lt;notificaciones&#64;delphin.com&gt;
                              }
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-neutral-400 dark:text-neutral-500 w-14 shrink-0">Para:</span>
                            <span class="text-neutral-600 dark:text-neutral-400 truncate">Cliente de demostración &lt;cliente&#64;ejemplo.com&gt;</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-neutral-400 dark:text-neutral-500 w-14 shrink-0">Asunto:</span>
                            <span class="font-bold text-neutral-900 dark:text-white truncate">{{ previewSubject() || item.subject }}</span>
                          </div>
                        </div>

                        <iframe
                          class="w-full h-[600px] bg-white block border-0"
                          style="scrollbar-width: thin;"
                          [title]="'emailTemplates.preview' | transloco"
                          sandbox="" referrerpolicy="no-referrer"
                          [srcdoc]="previewHtml()"
                        ></iframe>
                      </div>
                    } @else {
                      <div class="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-2">
                        <app-skeleton class="w-full" />
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

  search = '';
  filteredTemplates(): Template[] { const query=this.search.trim().toLowerCase(); return this.templates().filter(item=>this.label(item.key).toLowerCase().includes(query)); }
  readonly presets = PRESET_COLORS;
  readonly templates = signal<Template[]>([]);
  readonly selected = signal<Template | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly previewing = signal(false);
  readonly previewSubject = signal<string>('');
  readonly previewHtml = signal<SafeHtml | null>(null);
  readonly previewDevice = signal<'desktop' | 'mobile'>('desktop');

  readonly currentCompanyName = computed(() => {
    const id = this.auth.empresaId();
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem('cached_my_empresas');
        if (cached) {
          const list = JSON.parse(cached);
          const found = list.find((e: any) => e.id === id);
          if (found?.razonSocial) return found.razonSocial;
        }
      } catch {}
    }
    return 'Dolphin ERP';
  });

  private readonly auth = inject(AuthState);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dialog = inject(MatDialog);
  private readonly requests = new Subscription();
  private previewSubject$ = new Subject<Template>();
  private previewSub?: Subscription;
  private previewRequest?: Subscription;
  private previewVersion = 0;
  private tenantVersion = 0;

  constructor() {
    effect(() => {
      this.auth.empresaId();
      untracked(() => this.load());
    });
  }

  ngOnInit(): void {
    this.previewSub = this.previewSubject$.pipe(debounceTime(350)).subscribe(tpl => this.fetchPreview(tpl));
  }

  ngOnDestroy(): void {
    this.tenantVersion++;
    this.previewSub?.unsubscribe();
    this.previewRequest?.unsubscribe();
    this.requests.unsubscribe();
  }

  label(key: string): string {
    return this.i18n.translate('emailTemplates.types.' + key);
  }

  load(): void {
    const version = ++this.tenantVersion;
    this.previewRequest?.unsubscribe();
    this.previewVersion++;
    this.previewHtml.set(null);
    this.selected.set(null);
    this.templates.set([]);
    this.saving.set(false);
    this.loading.set(true);
    this.requests.add(this.http.get<Payload>(this.api).subscribe({
      next: data => {
        if (version !== this.tenantVersion) return;
        this.templates.set(data.templates);
        this.error.set(false);
        this.loading.set(false);
        if (data.templates[0]) this.select(data.templates[0]);
      },
      error: () => {
        if (version !== this.tenantVersion) return;
        this.error.set(true);
        this.loading.set(false);
        this.notice('emailTemplates.loadError');
      },
    }));
  }

  select(item: Template): void {
    if (this.saving()) return;
    const current = this.selected();
    const saved = this.templates().find(t => t.key === current?.key);
    if (current && saved && JSON.stringify(this.design(current)) !== JSON.stringify(this.design(saved))) {
      this.confirm('emailTemplates.discardConfirm', () => this.openTemplate(item));
      return;
    }
    this.openTemplate(item);
  }

  private openTemplate(item: Template): void {
    this.selected.set({...item});
    this.previewSubject.set(item.subject);
    this.previewHtml.set(null);
    this.triggerPreview(this.selected()!);
  }

  onDesignChange(item: Template): void {
    this.previewSubject.set(item.subject);
    this.triggerPreview(item);
  }

  onBodyChange(item: Template, newHtml: string): void {
    if (this.saving()) return;
    item.body = newHtml;
    this.triggerPreview(item);
  }

  setAccentColor(item: Template, color: string): void {
    if (this.saving()) return;
    item.accent = color;
    this.triggerPreview(item);
  }

  private triggerPreview(item: Template): void {
    this.previewVersion++;
    this.previewRequest?.unsubscribe();
    this.previewSubject$.next({...item});
  }

  private fetchPreview(item: Template): void {
    if (this.selected()?.key !== item.key) return;
    const version = this.previewVersion, tenant = this.tenantVersion;
    this.previewing.set(true);
    this.previewRequest = this.http.post<{html:string; subject?:string}>(this.api + '/' + item.key + '/preview', this.design(item)).subscribe({
      next: value => {
        if (version !== this.previewVersion || tenant !== this.tenantVersion) return;
        if (value.subject) this.previewSubject.set(value.subject);
        // Only server-sanitized email HTML, inside an opaque sandbox without scripts/navigation.
        const styled = this.injectPreviewStyles(value.html);
        this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(styled));
        this.previewing.set(false);
      },
      error: () => {
        if (version !== this.previewVersion || tenant !== this.tenantVersion) return;
        this.previewHtml.set(null);
        this.previewing.set(false);
        this.notice('emailTemplates.previewError');
      },
    });
  }

  private injectPreviewStyles(rawHtml: string): string {
    if (!rawHtml) return '';
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const thumbColor = isDark ? '#525252' : '#cbd5e1';
    const thumbHover = isDark ? '#737373' : '#94a3b8';
    const scrollbarCss =
      '<style id="preview-custom-scrollbar">' +
      `html,body,*{scrollbar-width:thin;scrollbar-color:${thumbColor} transparent;}` +
      '::-webkit-scrollbar{width:6px;height:6px;}' +
      '::-webkit-scrollbar-button{display:none!important;width:0!important;height:0!important;}' +
      '::-webkit-scrollbar-track{background:transparent;}' +
      `::-webkit-scrollbar-thumb{background:${thumbColor};border-radius:9999px;}` +
      `::-webkit-scrollbar-thumb:hover{background:${thumbHover};}` +
      '::-webkit-scrollbar-corner{background:transparent;}' +
      '</style>';

    if (rawHtml.includes('</head>')) {
      return rawHtml.replace('</head>', `${scrollbarCss}</head>`);
    }
    return scrollbarCss + rawHtml;
  }

  save(item: Template): void {
    if (this.saving()) return;
    const version = this.tenantVersion;
    this.saving.set(true);
    this.requests.add(this.http.put<Template>(this.api + '/' + item.key, {...this.design(item),revision:item.revision}).subscribe({
      next: value => {
        if (version !== this.tenantVersion) return;
        this.replace(value);
        this.saving.set(false);
        this.notice('emailTemplates.saved');
      },
      error: err => {
        if (version !== this.tenantVersion) return;
        this.saving.set(false);
        this.notice(err.status === 409 ? 'emailTemplates.conflict' : 'emailTemplates.saveError');
      },
    }));
  }

  reset(item: Template): void {
    if (this.saving()) return;
    this.confirm('emailTemplates.resetConfirm', () => {
      const version = this.tenantVersion;
      this.saving.set(true);
      this.requests.add(this.http.post<Template>(this.api + '/' + item.key + '/reset', {revision:item.revision}).subscribe({
        next: value => {
          if (version !== this.tenantVersion) return;
          this.replace(value);
          this.saving.set(false);
          this.notice('emailTemplates.restored');
        },
        error: err => {
          if (version !== this.tenantVersion) return;
          this.saving.set(false);
          this.notice(err.status === 409 ? 'emailTemplates.conflict' : 'emailTemplates.saveError');
        },
      }));
    });
  }

  private confirm(key: string, action: () => void): void {
    const version = this.tenantVersion;
    this.requests.add(this.dialog.open(ConfirmDialogComponent, {data:{
      title:this.i18n.translate('emailTemplates.title'), message:this.i18n.translate(key),
      confirmLabel:this.i18n.translate('common.confirm'), cancelLabel:this.i18n.translate('common.cancel'),
    }}).afterClosed().subscribe(confirmed => {
      if (confirmed && version === this.tenantVersion) action();
    }));
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
    const previous = this.templates().find(item => item.key === updated.key);
    const value = { ...previous!, ...updated };
    this.templates.update((list) => list.map((item) => (item.key === value.key ? value : item)));
    if (this.selected()?.key === value.key) {
      this.selected.set({...value});
      this.triggerPreview(value);
    }
  }

  private notice(key: string): void {
    this.snack.open(this.i18n.translate(key), this.i18n.translate('common.close'), { duration: 3500 });
  }
}
