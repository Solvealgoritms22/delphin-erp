import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantContext } from '../../../common/tenant/tenant-context';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = await super.canActivate(context);
    const user = context.switchToHttp().getRequest().user;
    const store = TenantContext.getStore();
    if (store) Object.assign(store, { empresaId: user.empresaId, usuarioId: user.id });
    return Boolean(allowed);
  }
}
