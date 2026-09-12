export function hasActiveSubscription(
  subscription:
    { estado: string; fechaRenovacion: Date | null } | null | undefined,
  now = new Date(),
): boolean {
  return (
    !!subscription &&
    ['ACTIVE', 'TRIAL'].includes(subscription.estado) &&
    !!subscription.fechaRenovacion &&
    subscription.fechaRenovacion > now
  );
}
