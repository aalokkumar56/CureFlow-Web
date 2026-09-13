export default defineNuxtRouteMiddleware((to) => {
  const auth = useTenantAuth()

  const tenant = auth.tenant.value
  const pathname = to.path

  if (!tenant) {
    return
  }

  const rawStatus =
    tenant.lifecycle_status ??
    tenant.lifecycleStatus ??
    ''

  const status = String(rawStatus)
    .toLowerCase()
    .replace(/_/g, '')

  const lifecycleRoute =
    status === 'pendingapproval'
      ? '/pending-approval'
      : status === 'active' &&
          !(tenant.onboarding_complete ?? tenant.onboardingComplete)
        ? '/onboarding'
        : '/'

  const lifecyclePaths = [
    '/pending-approval',
    '/onboarding',
    '/registration-received',
  ]

  const onboardingSetupPaths = [
    '/onboarding',
    '/settings/hospital',
    '/settings/integrations',
    '/settings/users',
  ]

  const onLifecyclePage = lifecyclePaths.some(
    path =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  )

  const onOnboardingSetupPage = onboardingSetupPaths.some(
    path =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  )

  const allowedDuringLifecycle =
    onLifecyclePage ||
    (lifecycleRoute === '/onboarding' &&
      onOnboardingSetupPage)

  if (
    lifecycleRoute !== '/' &&
    !allowedDuringLifecycle &&
    pathname !== lifecycleRoute
  ) {
    return navigateTo(lifecycleRoute)
  }

  if (
    lifecycleRoute === '/' &&
    onLifecyclePage
  ) {
    return navigateTo('/')
  }
})
