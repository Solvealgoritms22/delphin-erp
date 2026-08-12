import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef } from '@angular/material/snack-bar';
import { ToastComponent, ToastData } from './toast.component';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private snackBar = inject(MatSnackBar);

  private show(data: ToastData, config?: MatSnackBarConfig): MatSnackBarRef<ToastComponent> {
    return this.snackBar.openFromComponent(ToastComponent, {
      data,
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['!p-0', '!bg-transparent', '!shadow-none'],
      ...config,
    });
  }

  success(message: string, title?: string): void {
    this.show({ type: 'success', message, title });
  }

  error(message: string, title?: string): void {
    this.show({ type: 'error', message, title }, { duration: 8000 });
  }

  warning(message: string, title?: string): void {
    this.show({ type: 'warning', message, title });
  }

  info(message: string, title?: string): void {
    this.show({ type: 'info', message, title });
  }

  loading(message: string, title?: string): MatSnackBarRef<ToastComponent> {
    return this.show({ type: 'loading', message, title }, { duration: 0 }); // duration 0 means it won't auto dismiss
  }
}
