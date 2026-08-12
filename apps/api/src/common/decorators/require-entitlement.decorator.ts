import { SetMetadata } from '@nestjs/common';

export const ENTITLEMENT_KEY = 'entitlement';
export const RequireEntitlement = (entitlement: string) =>
  SetMetadata(ENTITLEMENT_KEY, entitlement);
