import { Component, inject } from '@angular/core';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { UpdateStatusComponent } from './update-status.component';
import type { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-update-notification',
  standalone: true,
  imports: [UpdateStatusComponent],
  template: `<app-update-status
    [service]="data.service"
    [compact]="true"
    (dismissed)="dismiss()"
  />`,
  host: { class: 'block w-full shadow-xl rounded-2xl' },
})
export class UpdateNotificationComponent {
  protected readonly data = inject<{ service: UpdateService }>(
    MAT_SNACK_BAR_DATA
  );
  private readonly snackBarRef = inject(
    MatSnackBarRef<UpdateNotificationComponent>
  );
  protected dismiss(): void {
    this.snackBarRef.dismiss();
  }
}
