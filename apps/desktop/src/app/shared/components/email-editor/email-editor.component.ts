import {
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

@Component({
  selector: 'app-email-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslocoPipe],
  template: `
    <div class="flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs overflow-hidden transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
      <!-- Toolbar -->
      @if (editable()) {
        <div class="flex flex-wrap items-center gap-1 p-2 bg-neutral-50/80 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
          <!-- Text formatting -->
          <button
            type="button"
            class="editor-btn"
            [class.active]="isBold()"
            (click)="toggleBold()"
            [matTooltip]="'emailEditor.bold' | transloco"
          >
            <span class="font-bold text-sm">B</span>
          </button>

          <button
            type="button"
            class="editor-btn"
            [class.active]="isItalic()"
            (click)="toggleItalic()"
            [matTooltip]="'emailEditor.italic' | transloco"
          >
            <span class="italic font-serif text-sm">I</span>
          </button>

          <button
            type="button"
            class="editor-btn"
            [class.active]="isStrike()"
            (click)="toggleStrike()"
            [matTooltip]="'emailEditor.strike' | transloco"
          >
            <span class="line-through text-sm">S</span>
          </button>

          <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>

          <!-- Headings -->
          <button
            type="button"
            class="editor-btn"
            [class.active]="isHeading2()"
            (click)="toggleHeading(2)"
            [matTooltip]="'emailEditor.h2' | transloco"
          >
            <span class="text-xs font-bold">H2</span>
          </button>

          <button
            type="button"
            class="editor-btn"
            [class.active]="isHeading3()"
            (click)="toggleHeading(3)"
            [matTooltip]="'emailEditor.h3' | transloco"
          >
            <span class="text-xs font-bold">H3</span>
          </button>

          <button
            type="button"
            class="editor-btn"
            [class.active]="isParagraph()"
            (click)="setParagraph()"
            [matTooltip]="'emailEditor.paragraph' | transloco"
          >
            <span class="text-xs font-medium">¶</span>
          </button>

          <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>

          <!-- Lists -->
          <button
            type="button"
            class="editor-btn"
            [class.active]="isBulletList()"
            (click)="toggleBulletList()"
            [matTooltip]="'emailEditor.bulletList' | transloco"
          >
            <mat-icon svgIcon="list" class="!w-4 !h-4"></mat-icon>
          </button>

          <button
            type="button"
            class="editor-btn"
            [class.active]="isOrderedList()"
            (click)="toggleOrderedList()"
            [matTooltip]="'emailEditor.orderedList' | transloco"
          >
            <mat-icon svgIcon="list-ordered" class="!w-4 !h-4"></mat-icon>
          </button>

          <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>

          <!-- Link -->
          <button
            type="button"
            class="editor-btn"
            [class.active]="isLink()"
            (click)="toggleLinkPrompt()"
            [matTooltip]="'emailEditor.link' | transloco"
          >
            <mat-icon svgIcon="link" class="!w-4 !h-4"></mat-icon>
          </button>

          <!-- Images: Upload or URL -->
          <button
            type="button"
            class="editor-btn text-blue-600 dark:text-blue-400"
            (click)="fileInput.click()"
            [matTooltip]="'emailEditor.uploadImage' | transloco"
          >
            <mat-icon svgIcon="image" class="!w-4 !h-4"></mat-icon>
            <span class="text-xs font-medium ml-1 hidden sm:inline">{{ 'emailEditor.image' | transloco }}</span>
          </button>
          <input
            #fileInput
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
            class="hidden"
            (change)="onFileSelected($event)"
          />

          <button
            type="button"
            class="editor-btn"
            (click)="toggleImageUrlPrompt()"
            [matTooltip]="'emailEditor.imageUrl' | transloco"
          >
            <mat-icon svgIcon="globe" class="!w-4 !h-4"></mat-icon>
          </button>

          <button
            type="button"
            class="editor-btn"
            (click)="insertDivider()"
            [matTooltip]="'emailEditor.divider' | transloco"
          >
            <mat-icon svgIcon="minus" class="!w-4 !h-4"></mat-icon>
          </button>

          <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>

          <!-- Undo / Redo -->
          <button
            type="button"
            class="editor-btn"
            (click)="undo()"
            [matTooltip]="'emailEditor.undo' | transloco"
          >
            <mat-icon svgIcon="rotate-ccw" class="!w-4 !h-4"></mat-icon>
          </button>

          <button
            type="button"
            class="editor-btn"
            (click)="redo()"
            [matTooltip]="'emailEditor.redo' | transloco"
          >
            <mat-icon svgIcon="rotate-cw" class="!w-4 !h-4"></mat-icon>
          </button>
        </div>
      }

      <!-- URL Input bar if open -->
      @if (showUrlInput()) {
        <div class="flex items-center gap-2 p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50">
          <mat-icon [svgIcon]="urlInputType() === 'image' ? 'image' : 'link'" class="!w-4 !h-4 text-blue-600 dark:text-blue-400 ml-1"></mat-icon>
          <input
            type="url"
            [(ngModel)]="urlInputValue"
            [placeholder]="urlInputType() === 'image' ? ('emailEditor.imagePlaceholder' | transloco) : ('emailEditor.linkPlaceholder' | transloco)"
            class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white outline-none focus:border-blue-500"
            (keydown.enter)="applyUrlInput()"
          />
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            (click)="applyUrlInput()"
          >
            {{ 'common.confirm' | transloco }}
          </button>
          <button
            type="button"
            class="px-2.5 py-1.5 text-xs rounded-lg text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
            (click)="cancelUrlInput()"
          >
            {{ 'common.cancel' | transloco }}
          </button>
        </div>
      }

      <!-- Editor Content Container -->
      <div
        #editorContainer
        class="prose dark:prose-invert max-w-none p-4 min-h-[220px] max-h-[460px] overflow-y-auto outline-none focus:outline-none text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed"
      ></div>

      <!-- Variables Chips Toolbar -->
      @if (variables().length > 0 && editable()) {
        <div class="px-4 py-3 bg-neutral-50/60 dark:bg-neutral-900/80 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center gap-1.5">
          <span class="text-2xs font-semibold tracking-wide uppercase text-neutral-400 dark:text-neutral-500 mr-1.5">
            {{ 'emailEditor.insertVariable' | transloco }}:
          </span>
          @for (v of variables(); track v) {
            <button
              type="button"
              (click)="insertVariable(v)"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-blue-600 dark:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-all cursor-pointer select-none active:scale-95 shadow-2xs"
              [matTooltip]="'emailEditor.clickToInsert' | transloco"
            >
              <span>+</span>
              <span>{{ '{{' }}{{ v }}{{ '}}' }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .editor-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.875rem;
      height: 1.875rem;
      padding: 0 0.375rem;
      border-radius: 0.5rem;
      color: #64748b;
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      user-select: none;
    }
    :host-context(.dark) .editor-btn {
      color: #94a3b8;
    }
    .editor-btn:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: #0f172a;
    }
    :host-context(.dark) .editor-btn:hover {
      background-color: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
    }
    .editor-btn.active {
      background-color: #eff6ff;
      color: #2563eb;
      font-weight: 600;
    }
    :host-context(.dark) .editor-btn.active {
      background-color: rgba(37, 99, 235, 0.2);
      color: #60a5fa;
    }

    ::ng-deep .tiptap {
      outline: none !important;
      min-height: 180px;
    }
    ::ng-deep .tiptap p {
      margin: 0.5rem 0;
    }
    ::ng-deep .tiptap img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
      margin: 0.75rem 0;
      border: 1px solid rgba(0, 0, 0, 0.08);
      display: inline-block;
    }
    ::ng-deep .tiptap a {
      color: #2563eb;
      text-decoration: underline;
    }
    ::ng-deep .tiptap hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 1rem 0;
    }
    ::ng-deep .tiptap h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 1rem 0 0.5rem;
    }
    ::ng-deep .tiptap h3 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0.75rem 0 0.35rem;
    }
    ::ng-deep .tiptap ul {
      list-style-type: disc;
      padding-left: 1.5rem;
      margin: 0.5rem 0;
    }
    ::ng-deep .tiptap ol {
      list-style-type: decimal;
      padding-left: 1.5rem;
      margin: 0.5rem 0;
    }
  `]
})
export class EmailEditorComponent implements OnInit, OnChanges, OnDestroy {
  content = input<string>('');
  editable = input<boolean>(true);
  placeholder = input<string>('Escribe el contenido del correo aquí...');
  variables = input<string[]>([]);

  contentChange = output<string>();

  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef<HTMLDivElement>;

  private editor: Editor | null = null;

  // URL prompt state
  readonly showUrlInput = signal(false);
  readonly urlInputType = signal<'link' | 'image'>('link');
  urlInputValue = '';

  // Active formats tracking
  readonly isBold = signal(false);
  readonly isItalic = signal(false);
  readonly isStrike = signal(false);
  readonly isHeading2 = signal(false);
  readonly isHeading3 = signal(false);
  readonly isParagraph = signal(false);
  readonly isBulletList = signal(false);
  readonly isOrderedList = signal(false);
  readonly isLink = signal(false);

  ngOnInit(): void {
    this.initEditor();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] && this.editor && !changes['content'].isFirstChange()) {
      const currentHtml = this.editor.getHTML();
      const newHtml = this.content() || '';
      // Only set content if truly different to avoid losing selection/cursor
      if (currentHtml !== newHtml && currentHtml !== `<p>${newHtml}</p>`) {
        this.editor.commands.setContent(newHtml);
      }
    }

    if (changes['editable'] && this.editor) {
      this.editor.setEditable(this.editable());
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }

  private initEditor(): void {
    // If incoming content is plain text with newlines, convert to paragraphs for tip-tap
    let initial = this.content() || '';
    if (initial && !/<[a-z][\s\S]*>/i.test(initial)) {
      initial = initial
        .split('\n\n')
        .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }

    this.editor = new Editor({
      element: this.editorContainer.nativeElement,
      extensions: [
        StarterKit,
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        }),
        Placeholder.configure({
          placeholder: this.placeholder(),
        }),
      ],
      content: initial,
      editable: this.editable(),
      onUpdate: () => {
        if (!this.editor) return;
        const html = this.editor.getHTML();
        this.updateToolbarState();
        this.contentChange.emit(html);
      },
      onSelectionUpdate: () => {
        this.updateToolbarState();
      },
    });

    this.updateToolbarState();
  }

  private updateToolbarState(): void {
    if (!this.editor) return;
    this.isBold.set(this.editor.isActive('bold'));
    this.isItalic.set(this.editor.isActive('italic'));
    this.isStrike.set(this.editor.isActive('strike'));
    this.isHeading2.set(this.editor.isActive('heading', { level: 2 }));
    this.isHeading3.set(this.editor.isActive('heading', { level: 3 }));
    this.isParagraph.set(this.editor.isActive('paragraph'));
    this.isBulletList.set(this.editor.isActive('bulletList'));
    this.isOrderedList.set(this.editor.isActive('orderedList'));
    this.isLink.set(this.editor.isActive('link'));
  }

  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleStrike(): void {
    this.editor?.chain().focus().toggleStrike().run();
  }

  toggleHeading(level: 2 | 3): void {
    this.editor?.chain().focus().toggleHeading({ level }).run();
  }

  setParagraph(): void {
    this.editor?.chain().focus().setParagraph().run();
  }

  toggleBulletList(): void {
    this.editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor?.chain().focus().toggleOrderedList().run();
  }

  insertDivider(): void {
    this.editor?.chain().focus().setHorizontalRule().run();
  }

  undo(): void {
    this.editor?.chain().focus().undo().run();
  }

  redo(): void {
    this.editor?.chain().focus().redo().run();
  }

  toggleLinkPrompt(): void {
    if (this.editor?.isActive('link')) {
      this.editor.chain().focus().unsetLink().run();
      return;
    }
    this.urlInputType.set('link');
    this.urlInputValue = '';
    this.showUrlInput.set(true);
  }

  toggleImageUrlPrompt(): void {
    this.urlInputType.set('image');
    this.urlInputValue = '';
    this.showUrlInput.set(true);
  }

  cancelUrlInput(): void {
    this.showUrlInput.set(false);
    this.urlInputValue = '';
  }

  applyUrlInput(): void {
    const val = this.urlInputValue.trim();
    if (!val) {
      this.cancelUrlInput();
      return;
    }

    if (this.urlInputType() === 'link') {
      const url = val.startsWith('http') ? val : `https://${val}`;
      this.editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      this.editor?.chain().focus().setImage({ src: val }).run();
    }

    this.cancelUrlInput();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Convert to Base64 data URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.editor?.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
      target.value = '';
    };
    reader.readAsDataURL(file);
  }

  insertVariable(varName: string): void {
    this.editor?.chain().focus().insertContent(`{{${varName}}}`).run();
  }
}
