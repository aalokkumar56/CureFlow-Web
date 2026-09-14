export function tenantLifecycleRoute(
  tenant: Record<string, unknown> | null | undefined,
) {
  const status = String(
    tenant?.lifecycle_status ?? tenant?.lifecycleStatus ?? '',
  )
    .toLowerCase()
    .replace(/_/g, '')
  if (status === 'pendingapproval') return '/pending-approval'
  if (
    status === 'active' &&
    !(tenant?.onboarding_complete ?? tenant?.onboardingComplete)
  )
    return '/onboarding'
  return '/'
}
