const moduleRoutes: Array<[string, string]> = [
  ['/appointments', 'appointments'],
  ['/patients', 'patients'],
  ['/leads', 'leads'],
  ['/inbox', 'communications'],
  ['/email-inbox', 'communications'],
  ['/campaigns', 'campaigns'],
  ['/missed-revenue', 'analytics'],
  ['/tasks', 'follow-ups'],
  ['/doctors', 'referrals'],
  ['/staff', 'staff'],
  ['/', 'analytics'],
]

export const tenantModuleForPath = (path: string) =>
  moduleRoutes.find(([prefix]) =>
    prefix === '/' ? path === '/' : path === prefix || path.startsWith(prefix + '/'),
  )?.[1]

export const tenantModuleLandingRoutes: Record<string, string> = {
  appointments: '/appointments',
  patients: '/patients',
  leads: '/leads',
  communications: '/inbox',
  campaigns: '/campaigns',
  clinical: '/patients',
  referrals: '/doctors',
  'follow-ups': '/tasks',
  analytics: '/',
  staff: '/staff',
}
