import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import { environment } from '@/environments/environment';

type Design = { subject:string; heading:string; body:string; footer:string; accent:string };
type Template = Design & { key:string; editable:boolean; customized:boolean; revision:number; variables:string[] };
type Payload = { templates:Template[] };

@Component({
  selector: 'app-email-templates',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSnackBarModule, TranslocoPipe, SkeletonComponent],
  template: `
    <div class="flex h-full min-w-0 flex-col overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">
      <div class="relative shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'emailTemplates.title' | transloco }}</h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'emailTemplates.description' | transloco }}</p>
        </div>
      </div>
      @if (loading()) {
        <div class="p-6 md:p-8 space-y-5"><app-skeleton type="card" height="7rem"/><app-skeleton type="card" height="7rem"/><app-skeleton type="card" height="7rem"/></div>
      } @else {
        <div class="flex-auto overflow-y-auto p-4 sm:p-6 md:p-8">
          <div class="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6">
            <aside class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 h-fit">
              @for (item of templates(); track item.key) {
                <button type="button" (click)="select(item)" class="w-full text-left rounded-xl px-4 py-3 mb-1 transition-colors" [class.bg-blue-50]="selected()?.key===item.key" [class.text-blue-700]="selected()?.key===item.key" [class.dark:bg-blue-500/10]="selected()?.key===item.key" [class.dark:text-blue-300]="selected()?.key===item.key">
                  <div class="text-sm font-semibold">{{ label(item.key) }}</div>
                  <div class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{{ item.editable ? ('emailTemplates.editable' | transloco) : ('emailTemplates.systemManaged' | transloco) }}</div>
                </button>
              }
            </aside>
            @if (selected(); as item) {
              <section class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <div class="p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ label(item.key) }}</h2>
                    <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ item.editable ? ('emailTemplates.editorHelp' | transloco) : ('emailTemplates.systemHelp' | transloco) }}</p>
                  </div>
                  <span class="inline-flex self-start rounded-full px-2.5 py-1 text-xs font-medium border" [class.bg-emerald-50]="item.editable" [class.text-emerald-700]="item.editable" [class.border-emerald-200]="item.editable" [class.bg-neutral-100]="!item.editable" [class.text-neutral-700]="!item.editable" [class.border-neutral-200]="!item.editable">{{ item.editable ? ('emailTemplates.editable' | transloco) : ('emailTemplates.systemManaged' | transloco) }}</span>
                </div>
                <div class="p-5 sm:p-6 grid grid-cols-1 2xl:grid-cols-2 gap-6">
                  <div class="space-y-3">
                    <div class="rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
                      {{ 'emailTemplates.variables' | transloco }}: @for (variable of item.variables; track variable; let last = $last) { <code>{{ '{{' }}{{ variable }}{{ '}}' }}</code>@if (!last) {, } }
                    </div>
                    <mat-form-field appearance="outline" class="w-full"><mat-label>{{ 'emailTemplates.subject' | transloco }}</mat-label><input matInput [(ngModel)]="item.subject" [disabled]="!item.editable" [placeholder]="'emailTemplates.subjectPlaceholder' | transloco"/></mat-form-field>
                    <mat-form-field appearance="outline" class="w-full"><mat-label>{{ 'emailTemplates.heading' | transloco }}</mat-label><input matInput [(ngModel)]="item.heading" [disabled]="!item.editable" [placeholder]="'emailTemplates.headingPlaceholder' | transloco"/></mat-form-field>
                    <mat-form-field appearance="outline" class="w-full"><mat-label>{{ 'emailTemplates.body' | transloco }}</mat-label><textarea matInput rows="9" [(ngModel)]="item.body" [disabled]="!item.editable" [placeholder]="'emailTemplates.bodyPlaceholder' | transloco"></textarea></mat-form-field>
                    <mat-form-field appearance="outline" class="w-full"><mat-label>{{ 'emailTemplates.footer' | transloco }}</mat-label><textarea matInput rows="3" [(ngModel)]="item.footer" [disabled]="!item.editable" [placeholder]="'emailTemplates.footerPlaceholder' | transloco"></textarea></mat-form-field>
                    <label class="flex items-center gap-3 text-sm font-medium text-neutral-700 dark:text-neutral-300"><input type="color" [(ngModel)]="item.accent" [disabled]="!item.editable" class="h-9 w-12 rounded cursor-pointer disabled:cursor-not-allowed"/> {{ 'emailTemplates.accent' | transloco }}</label>
                    <div class="flex flex-wrap gap-3 pt-2">
                      <button mat-stroked-button type="button" (click)="preview(item)" [disabled]="previewing()"><mat-icon svgIcon="eye" class="icon-size-4 mr-2"></mat-icon>{{ 'emailTemplates.preview' | transloco }}</button>
                      @if (item.editable) {
                        <button mat-stroked-button type="button" (click)="reset(item)" [disabled]="saving()"><mat-icon svgIcon="rotate-ccw" class="icon-size-4 mr-2"></mat-icon>{{ 'emailTemplates.restore' | transloco }}</button>
                        <button mat-flat-button type="button" class="bg-blue-600 text-white" (click)="save(item)" [disabled]="saving()"><mat-icon svgIcon="check" class="icon-size-4 mr-2"></mat-icon>{{ 'common.save' | transloco }}</button>
                      }
                    </div>
                  </div>
                  <div class="min-w-0">
                    <p class="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">{{ 'emailTemplates.preview' | transloco }}</p>
                    @if (previewHtml()) { <iframe class="h-[640px] w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white" title="Vista previa de correo" [srcdoc]="previewHtml()"></iframe> }
                    @else { <div class="h-64 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-sm text-neutral-500">{{ 'emailTemplates.previewHint' | transloco }}</div> }
                  </div>
                </div>
              </section>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class EmailTemplatesComponent {
  private readonly http = inject(HttpClient);
  private readonly snack = inject(MatSnackBar);
  private readonly i18n = inject(TranslocoService);
  private readonly api = `${environment.apiUrl}/email-templates`;
  readonly templates = signal<Template[]>([]);
  readonly selected = signal<Template | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly previewing = signal(false);
  readonly previewHtml = signal('');
  constructor() { this.load(); }
  label(key:string) { return this.i18n.translate('emailTemplates.types.' + key); }
  load() {
    this.loading.set(true);
    this.http.get<Payload>(this.api).subscribe({next:data => {
      this.templates.set(data.templates);
      this.selected.set(data.templates[0] || null);
      this.loading.set(false);
    }, error:() => { this.loading.set(false); this.notice('emailTemplates.loadError'); }});
  }
  select(item:Template) { this.selected.set(item); this.previewHtml.set(''); }
  preview(item:Template) {
    this.previewing.set(true);
    this.http.post<{html:string}>(`${this.api}/${item.key}/preview`, this.design(item)).subscribe({
      next:value => { this.previewHtml.set(value.html); this.previewing.set(false); },
      error:() => { this.previewing.set(false); this.notice('emailTemplates.previewError'); },
    });
  }
  save(item:Template) {
    this.saving.set(true);
    this.http.put<Template>(`${this.api}/${item.key}`, {...this.design(item),revision:item.revision}).subscribe({
      next:value => { this.replace(value); this.saving.set(false); this.notice('emailTemplates.saved'); },
      error:err => { this.saving.set(false); this.notice(err.status === 409 ? 'emailTemplates.conflict' : 'emailTemplates.saveError'); },
    });
  }
  reset(item:Template) {
    this.saving.set(true);
    this.http.post<Template>(`${this.api}/${item.key}/reset`, {revision:item.revision}).subscribe({
      next:value => { this.replace(value); this.saving.set(false); this.notice('emailTemplates.restored'); },
      error:err => { this.saving.set(false); this.notice(err.status === 409 ? 'emailTemplates.conflict' : 'emailTemplates.saveError'); },
    });
  }
  private design(item:Template):Design { return {subject:item.subject,heading:item.heading,body:item.body,footer:item.footer,accent:item.accent}; }
  private replace(updated:Template) {
    const value = {...this.selected()!,...updated,customized:true};
    this.templates.update(list => list.map(item => item.key === value.key ? value : item));
    this.selected.set(value); this.preview(value);
  }
  private notice(key:string) { this.snack.open(this.i18n.translate(key),this.i18n.translate('common.close'),{duration:3500}); }
}
