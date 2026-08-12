import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { AuthState } from '../../core/auth/auth.state';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private authState = inject(AuthState);

  private requiredPermissions: string[] = [];
  private hasView = false;

  constructor() {
    effect(() => {
      const user = this.authState.user();
      this.updateView(user?.permissions || []);
    });
  }

  @Input() set hasPermission(permissions: string | string[]) {
    this.requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const user = this.authState.user();
    this.updateView(user?.permissions || []);
  }

  private updateView(userPermissions: string[]) {
    let hasPermission = false;

    if (userPermissions.includes('*')) {
      hasPermission = true;
    } else if (this.requiredPermissions.length === 0) {
      hasPermission = true;
    } else {
      hasPermission = this.requiredPermissions.every(p => userPermissions.includes(p));
    }

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
