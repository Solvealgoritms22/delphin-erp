import { Component, input, computed } from '@angular/core';

export interface AvatarItem {
  name: string;
  src?: string;
  color?: string;
}

@Component({
  selector: 'app-avatar-group',
  standalone: true,
  template: `
    <div class="flex items-center">
      @for (avatar of visibleAvatars(); track avatar.name; let i = $index) {
        <div
          class="relative inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-neutral-900 transition-transform duration-200 hover:z-10 hover:scale-110"
          [style.margin-left]="i === 0 ? '0' : '-0.5rem'"
          [title]="avatar.name"
        >
          @if (avatar.src) {
            <img
              [src]="avatar.src"
              [alt]="avatar.name"
              class="h-full w-full rounded-full object-cover"
            />
          } @else {
            <span
              class="flex h-full w-full items-center justify-center rounded-full text-xs font-semibold text-white"
              [style.background]="avatar.color ?? defaultColor(avatar.name)"
            >
              {{ initials(avatar.name) }}
            </span>
          }
        </div>
      }

      @if (overflow() > 0) {
        <div
          class="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 ring-2 ring-white dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-900"
          style="margin-left: -0.5rem"
          [title]="'+' + overflow() + ' more'"
        >
          +{{ overflow() }}
        </div>
      }
    </div>
  `,
})
export class AvatarGroupComponent {
  avatars = input<AvatarItem[]>([]);
  max = input<number>(4);

  visibleAvatars = computed(() => this.avatars().slice(0, this.max()));
  overflow = computed(() => Math.max(0, this.avatars().length - this.max()));

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  defaultColor(name: string): string {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
    ];
    let hash = 0;
    for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}
