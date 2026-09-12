import type { NavigationItem } from '~/types/navigation'
import { PERMISSIONS } from '~/utils/permissions'

export const tenantNavigation: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
    permission: PERMISSIONS.DashboardView,
  },
  {
    id: 'appointments',
    label: 'Appointments',
    to: '/appointments',
    permission: PERMISSIONS.AppointmentView,
  },
  {
    id: 'patients',
    label: 'Patients',
    to: '/patients',
    permission: PERMISSIONS.PatientView,
  },
  {
    id: 'whatsapp-inbox',
    label: 'WhatsApp Inbox',
    to: '/inbox',
    permission: PERMISSIONS.ConversationView,
  },
  {
    id: 'email-inbox',
    label: 'Email Inbox',
    to: '/email-inbox',
    permission: PERMISSIONS.ConversationView,
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    to: '/campaigns',
    permission: PERMISSIONS.CampaignView,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    to: '/missed-revenue',
    permission: PERMISSIONS.DashboardView,
  },
  {
    id: 'follow-ups',
    label: 'Follow-ups',
    to: '/tasks',
    permission: PERMISSIONS.DashboardView,
  },
  {
    id: 'referral-crm',
    label: 'Referral CRM',
    to: '/doctors',
    permission: PERMISSIONS.ReferralView,
  },
  {
    id: 'hospital-staff',
    label: 'Hospital Staff',
    to: '/staff',
    permission: PERMISSIONS.StaffView,
  },
]
