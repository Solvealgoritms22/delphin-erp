import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  viewChild,
  effect,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import * as Prism from 'prismjs';

// Common prism language modules
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';

@Component({
  selector: 'markdown-renderer',
  standalone: true,
  template: `
    <div
      #container
      class="markdown-body select-text text-neutral-800 dark:text-neutral-200"
      [innerHTML]="renderedHtml()"
    ></div>
  `,
})
export class MarkdownRendererComponent {
  private sanitizer = inject(DomSanitizer);
  private container = viewChild<ElementRef<HTMLDivElement>>('container');

  // Input raw markdown text
  content = input<string>('');

  // Computed parsed safe HTML
  renderedHtml = computed<SafeHtml>(() => {
    const raw = this.content() || '';
    if (!raw.trim()) return '';

    // Configure marked renderer
    const renderer = new marked.Renderer();

    renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
      const language = (lang || 'text').trim().toLowerCase();
      let highlighted = text;
      try {
        if (Prism.languages[language]) {
          highlighted = Prism.highlight(text, Prism.languages[language], language);
        }
      } catch {
        highlighted = text;
      }

      return `<div class="relative group my-3 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-900 text-neutral-100 font-mono text-xs">
        <div class="flex items-center justify-between px-3 py-1.5 bg-neutral-800/80 border-b border-neutral-700/60 text-[11px] text-neutral-400">
          <span>${language}</span>
          <button type="button" class="copy-code-btn px-2 py-0.5 rounded bg-neutral-700/60 hover:bg-neutral-600 text-neutral-200 hover:text-white transition-colors cursor-pointer text-[10px]" data-code="${encodeURIComponent(text)}">
            Copiar
          </button>
        </div>
        <pre class="p-3.5 overflow-x-auto m-0 bg-transparent"><code>${highlighted}</code></pre>
      </div>`;
    };

    try {
      let html = marked.parse(raw, { renderer, gfm: true, breaks: true }) as string;
      html = html.replace(/<table>/g, '<div class="markdown-table-wrapper"><table>').replace(/<\/table>/g, '</table></div>');
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch {
      return this.sanitizer.bypassSecurityTrustHtml(raw);
    }
  });

  constructor() {
    effect(() => {
      this.renderedHtml();
      setTimeout(() => {
        const el = this.container()?.nativeElement;
        if (!el) return;
        const copyBtns = el.querySelectorAll<HTMLButtonElement>('.copy-code-btn');
        copyBtns.forEach((btn) => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const rawCode = decodeURIComponent(btn.getAttribute('data-code') || '');
            if (rawCode && navigator.clipboard) {
              navigator.clipboard.writeText(rawCode).then(() => {
                const originalText = btn.textContent;
                btn.textContent = '¡Copiado!';
                btn.classList.add('bg-green-600', 'text-white');
                setTimeout(() => {
                  btn.textContent = originalText;
                  btn.classList.remove('bg-green-600', 'text-white');
                }, 2000);
              });
            }
          };
        });
      }, 50);
    });
  }
}
