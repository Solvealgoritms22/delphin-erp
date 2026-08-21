import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChevronDownIcon, CheckIcon, RefreshCwIcon, CircleAlertIcon } from 'ng-animated-icons';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

export interface ToolCallData {
  id?: string;
  name: string;
  args?: Record<string, any> | string;
  result?: any;
  status?: 'running' | 'success' | 'error';
  durationMs?: number;
}

const TOOL_CONFIG: Record<string, { labelKey: string; defaultLabel: string; action: string; icon: string }> = {
  queryActivityLogs: {
    labelKey: 'aiChat.tools.queryActivityLogs',
    defaultLabel: 'Consultó registros de actividad y auditoría',
    action: 'Auditoría ERP',
    icon: 'shield-check',
  },
  queryProducts: {
    labelKey: 'aiChat.tools.queryProducts',
    defaultLabel: 'Consultó catálogo de productos',
    action: 'Precios y stock',
    icon: 'package',
  },
  queryClients: {
    labelKey: 'aiChat.tools.queryClients',
    defaultLabel: 'Consultó directorio de clientes',
    action: 'Clientes',
    icon: 'users',
  },
  querySuppliers: {
    labelKey: 'aiChat.tools.querySuppliers',
    defaultLabel: 'Consultó directorio de proveedores',
    action: 'Proveedores',
    icon: 'truck',
  },
  queryBranches: {
    labelKey: 'aiChat.tools.queryBranches',
    defaultLabel: 'Consultó sucursales y almacenes',
    action: 'Sucursales',
    icon: 'store',
  },
  getCompanyOverview: {
    labelKey: 'aiChat.tools.getCompanyOverview',
    defaultLabel: 'Consultó resumen de la empresa',
    action: 'General',
    icon: 'building-2',
  },
  getExecutiveMetrics: {
    labelKey: 'aiChat.tools.getExecutiveMetrics',
    defaultLabel: 'Analizó métricas y balances',
    action: 'Estadísticas',
    icon: 'chart-bar',
  },
  queryTeamMembers: {
    labelKey: 'aiChat.tools.queryTeamMembers',
    defaultLabel: 'Consultó equipo y usuarios',
    action: 'Miembros',
    icon: 'user-check',
  },
};

@Component({
  selector: 'app-tool-call-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChevronDownIcon, CheckIcon, RefreshCwIcon, CircleAlertIcon, TranslocoPipe],
  template: `
    <div
      class="my-1.5 overflow-hidden rounded-xl border border-neutral-200/70 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-900/50 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-all text-xs"
      [class.border-blue-300]="status() === 'running'"
      [class.dark:border-blue-800]="status() === 'running'"
    >

      <button
        type="button"
        (click)="toggleExpanded()"
        class="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left font-medium text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer select-none"
      >
        <div class="flex items-center gap-2.5 min-w-0">

          <div
            class="flex size-5 shrink-0 items-center justify-center rounded-md"
            [class.bg-blue-100/80]="status() === 'running'"
            [class.dark:bg-blue-900/40]="status() === 'running'"
            [class.bg-emerald-100/80]="status() === 'success'"
            [class.dark:bg-emerald-900/40]="status() === 'success'"
            [class.bg-red-100/80]="status() === 'error'"
            [class.dark:bg-red-900/40]="status() === 'error'"
          >
            @if (status() === 'running') {
              <i-refresh-cw [size]="11" class="text-blue-600 dark:text-blue-400 animate-spin" />
            } @else if (status() === 'error') {
              <i-circle-alert [size]="11" class="text-red-600 dark:text-red-400" />
            } @else {
              <i-check [size]="11" class="text-emerald-600 dark:text-emerald-400" />
            }
          </div>

          <div class="flex items-center gap-2 min-w-0">
            <span class="font-medium text-neutral-800 dark:text-neutral-200 truncate">
              {{ toolInfo().label }}
            </span>
            <span class="text-[11px] text-neutral-400 dark:text-neutral-500 hidden sm:inline truncate">
              • {{ toolInfo().action }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          @if (durationMs()) {
            <span class="text-[10px] text-neutral-400 font-mono">
              {{ durationMs() }}ms
            </span>
          }
          <div
            class="text-neutral-400 transition-transform duration-200"
            [class.rotate-180]="isExpanded()"
          >
            <i-chevron-down [size]="13" />
          </div>
        </div>
      </button>

      @if (isExpanded()) {
        <div class="border-t border-neutral-200/60 dark:border-neutral-800 bg-white/60 dark:bg-black/40 p-3 space-y-2 font-mono text-[11px]">
          @if (args()) {
            <div>
              <div class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1 font-sans">
                {{ 'aiChat.queryParams' | transloco }}
              </div>
              <pre class="m-0 p-2 rounded-lg bg-neutral-900 text-neutral-200 overflow-x-auto"><code>{{ formatJson(args()) }}</code></pre>
            </div>
          }

          @if (result()) {
            <div>
              <div class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1 font-sans">
                {{ 'aiChat.queryResults' | transloco }}
              </div>
              <pre class="m-0 p-2 rounded-lg bg-neutral-900 text-neutral-200 overflow-x-auto max-h-52"><code>{{ formatJson(result()) }}</code></pre>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ToolCallCardComponent {
  private transloco = inject(TranslocoService);

  toolName = input<string>('');
  status = input<'running' | 'success' | 'error'>('success');
  args = input<any>(null);
  result = input<any>(null);
  durationMs = input<number | null>(null);

  isExpanded = signal<boolean>(false);

  toolInfo = computed(() => {
    const raw = this.toolName();
    if (TOOL_CONFIG[raw]) {
      const cfg = TOOL_CONFIG[raw];
      return {
        label: this.transloco.translate(cfg.labelKey) || cfg.defaultLabel,
        action: cfg.action,
        icon: cfg.icon,
      };
    }
    const cleaned = raw
      .replace(/^query|^get|^consultar|^buscar/i, '')
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim();
    const title = cleaned ? `ERP: ${cleaned}` : raw;
    return {
      label: title,
      action: 'ERP Database',
      icon: 'database',
    };
  });

  toggleExpanded() {
    this.isExpanded.update((v) => !v);
  }

  formatJson(data: any): string {
    if (!data) return '';
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  }
}
