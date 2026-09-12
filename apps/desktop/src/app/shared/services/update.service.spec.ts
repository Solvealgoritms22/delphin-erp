import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoService } from '@jsverse/transloco';
import { Subject, of } from 'rxjs';
import { UpdateService, UpdateInfo, DownloadProgress } from './update.service';

describe('UpdateService', () => {
  let service: UpdateService;
  let available: (info: UpdateInfo) => void;
  let ready: (info: UpdateInfo) => void;
  let progress: (value: DownloadProgress) => void;
  let notAvailable: (info: UpdateInfo) => void;
  let failure: (value: string) => void;
  let dismissed: Subject<void>;
  let confirmation: Subject<boolean>;
  const check = vi.fn();
  const install = vi.fn();
  const open = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    dismissed = new Subject<void>();
    confirmation = new Subject<boolean>();
    window.dolphinUpdater = {
      onUpdateAvailable: (cb) => {
        available = cb;
      },
      onUpdateNotAvailable: (cb) => {
        notAvailable = cb;
      },
      onUpdateDownloaded: (cb) => {
        ready = cb;
      },
      onDownloadProgress: (cb) => {
        progress = cb;
      },
      onError: (cb) => {
        failure = cb;
      },
      checkForUpdates: check,
      quitAndInstall: install,
      getAppVersion: () => Promise.resolve('1.0.13'),
      removeAllListeners: vi.fn(),
    };
    open.mockReturnValue({
      dismiss: () => dismissed.next(),
      afterDismissed: () => dismissed.asObservable(),
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
        { provide: MatSnackBar, useValue: { openFromComponent: open } },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({ afterClosed: () => confirmation.asObservable() }),
          },
        },
      ],
    });
    service = TestBed.inject(UpdateService);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('does not report up-to-date after a timeout', () => {
    service.checkForUpdates();
    vi.advanceTimersByTime(30000);
    expect(service.status()).toBe('error');
    expect(service.lastChecked()).toBeNull();
  });
  it('preserves the download when its notification is dismissed', () => {
    available({ version: '1.0.14' });
    progress({ percent: 42, transferred: 42, total: 100, bytesPerSecond: 1 });
    dismissed.next();
    expect(service.status()).toBe('downloading');
    expect(service.downloadProgress()?.percent).toBe(42);
    service.checkForUpdates();
    expect(check).not.toHaveBeenCalled();
  });
  it('reopens notification once the background download is ready', () => {
    available({ version: '1.0.14' });
    dismissed.next();
    ready({ version: '1.0.14' });
    expect(open).toHaveBeenCalledTimes(2);
    expect(service.status()).toBe('ready');
  });
  it('only restarts a downloaded update after confirmation', () => {
    available({ version: '1.0.14' });
    service.installAndRestart();
    expect(install).not.toHaveBeenCalled();
    ready({ version: '1.0.14' });
    service.installAndRestart();
    expect(install).not.toHaveBeenCalled();
    confirmation.next(true);
    expect(install).toHaveBeenCalledTimes(1);
  });
  it('preserves readiness after postponing or trying to recheck', () => {
    ready({ version: '1.0.14' });
    service.installAndRestart();
    confirmation.next(false);
    service.dismissNotification();
    service.checkForUpdates();
    expect(service.status()).toBe('ready');
    expect(check).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });
  it('only records a successful check after the main process responds', () => {
    service.checkForUpdates();
    notAvailable({ version: '1.0.13' });
    vi.advanceTimersByTime(30000);
    expect(service.status()).toBe('up-to-date');
    expect(service.lastChecked()).not.toBeNull();
  });
  it('shows translated recovery guidance without exposing technical errors', () => {
    failure('Cannot download https://example.invalid/private?token=secret');
    expect(service.error()).toBe('updater.errorHelp');
    expect(service.status()).toBe('error');
  });
  it('recovers a downloaded state when the renderer starts late', async () => {
    TestBed.resetTestingModule();
    window.dolphinUpdater.getUpdateState = () =>
      Promise.resolve({
        status: 'ready',
        info: { version: '1.0.14' },
        progress: null,
        checkedAt: null,
      });
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
        { provide: MatSnackBar, useValue: { openFromComponent: open } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(false) }) },
        },
      ],
    });
    const restored = TestBed.inject(UpdateService);
    await Promise.resolve();
    expect(restored.status()).toBe('ready');
    expect(restored.updateInfo()?.version).toBe('1.0.14');
  });
});
