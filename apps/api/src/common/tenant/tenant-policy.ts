import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from './tenant-context';

// Identity/membership and company discovery have their own authorization rules.
// Business data is scoped automatically, including queries inside transactions.
const identityModels = new Set(['Empresa', 'Membresia']);
export const scopedModels = new Set(
  Prisma.dmmf.datamodel.models
    .filter(
      (model) =>
        model.fields.some((field) => field.name === 'empresaId') &&
        !identityModels.has(model.name),
    )
    .map((model) => model.name),
);

export function scopeTenantOperation(
  model: string,
  operation: string,
  args: any,
  tenantId?: string,
): any {
  if (!tenantId || !scopedModels.has(model)) return args;
  const result = { ...args };
  const checkData = (data: any) => {
    if (!data) return data;
    if (data.empresaId !== undefined && data.empresaId !== tenantId)
      throw new ForbiddenException('Referencia a otra empresa');
    if (data.empresa?.connect?.id && data.empresa.connect.id !== tenantId)
      throw new ForbiddenException('Referencia a otra empresa');
    if (data.empresa?.update || data.empresa?.upsert || data.empresa?.create)
      throw new ForbiddenException('Mutación anidada de empresa no permitida');
    return data;
  };
  if (
    operation === 'create' ||
    operation === 'createMany' ||
    operation === 'createManyAndReturn'
  ) {
    result.data = Array.isArray(args.data)
      ? args.data.map((d) => ({ ...checkData(d), empresaId: tenantId }))
      : {
          ...checkData(args.data),
          ...(args.data?.empresa ? {} : { empresaId: tenantId }),
        };
  } else {
    result.where = { ...args.where, empresaId: tenantId };
    if (operation === 'upsert') {
      result.create = {
        ...checkData(args.create),
        ...(args.create?.empresa ? {} : { empresaId: tenantId }),
      };
      result.update = checkData(args.update);
    } else if (args.data) result.data = checkData(args.data);
  }
  return result;
}

export const tenantQueryExtension = {
  $allModels: {
    $allOperations({ model, operation, args, query }: any) {
      return query(
        scopeTenantOperation(
          model,
          operation,
          args,
          TenantContext.getTenantId(),
        ),
      );
    },
  },
};
