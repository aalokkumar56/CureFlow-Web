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
  {
    id: 'appointments',
    label: 'Appointments',
    to: '/appointments',
  },
  {
    id: 'doctors',
    label: 'Doctors',
    to: '/doctors',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    to: '/inbox',
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    to: '/campaigns',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    to: '/tasks',
  },
  {
    id: 'staff',
    label: 'Staff',
    to: '/staff',
  },
  {
    id: 'settings',
    label: 'Settings',
    to: '/settings',
  },
]