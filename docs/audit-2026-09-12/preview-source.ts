import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './app/core/transloco/transloco-http-loader';
import { AboutComponent } from './app/features/settings/features/about/system-information.component';
import { provideTheming } from './app/core/theming/provider';
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';

const listeners: Record<string, (value: any) => void> = {};
const params = new URLSearchParams(location.search);
(window as any).auditEvent = (event: string, value: any) => listeners[event]?.(value);
(window as any).auditRestartCount = 0;
window.dolphinUpdater = {
  onUpdateAvailable: cb => { listeners['available'] = cb; },
  onUpdateNotAvailable: cb => { listeners['up-to-date'] = cb; },
  onDownloadProgress: cb => { listeners['downloading'] = cb; },
  onUpdateDownloaded: cb => { listeners['ready'] = cb; },
  onError: cb => { listeners['error'] = cb; },
  checkForUpdates: () => setTimeout(() => listeners['up-to-date']?.({ version: '1.0.13' }), 100),
  quitAndInstall: () => { (window as any).auditRestartCount++; },
  getAppVersion: () => Promise.resolve('1.0.13'),
  removeAllListeners: () => {},
};
@Component({ selector: 'app-root', standalone: true, imports: [AboutComponent],
  template: '<app-about />', host: { class: 'block h-screen' } })
class AuditPreview {}
document.querySelector('#splash-screen')?.remove();
bootstrapApplication(AuditPreview, { providers: [
  provideHttpClient(), provideAnimations(),
  { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
  provideTheming({ scheme: params.get('theme') === 'dark' ? 'dark' : 'light', primary: '#0079b8', error: '#dc2626' }),
  provideTransloco({ config: { availableLangs: ['es', 'en'], defaultLang: params.get('lang') || 'es', reRenderOnLangChange: true, prodMode: true }, loader: TranslocoHttpLoader }),
]}).then(() => { document.querySelector('#splash-screen')?.remove(); });

