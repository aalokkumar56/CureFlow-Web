import type { NavigationItem } from '~/types/navigation'

export const tenantNavigation: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
  },
  {
    id: 'patients',
    label: 'Patients',
    to: '/patients',
  },
]