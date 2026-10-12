import type { NavigationItem } from '~/types/navigation'
import { PERMISSIONS } from '~/utils/permissions'

export const tenantNavigation: NavigationItem[] = [
  { id: 'failed-jobs', label: 'Background tasks', to: '/jobs', permission: PERMISSIONS.JobView },
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
    permission: PERMISSIONS.DashboardView,
    module: 'analytics',
  },
  {
    id: 'appointments',
    label: 'Appointments',
    to: '/appointments',
    permission: PERMISSIONS.AppointmentView,
    module: 'appointments',
  },
  {
    id: 'patients',
    label: 'Patients',
    to: '/patients',
    permission: PERMISSIONS.PatientView,
    module: 'patients',
  },
  {
    id: 'leads',
    label: 'Leads',
    to: '/leads',
    permission: PERMISSIONS.LeadView,
    module: 'leads',
  },
  {
    id: 'whatsapp-inbox',
    label: 'WhatsApp Inbox',
    to: '/inbox',
    permission: PERMISSIONS.ConversationView,
    module: 'communications',
  },
  {
    id: 'email-inbox',
    label: 'Email Inbox',
    to: '/email-inbox',
    permission: PERMISSIONS.ConversationView,
    module: 'communications',
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    to: '/campaigns',
    permission: PERMISSIONS.CampaignView,
    module: 'campaigns',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    to: '/missed-revenue',
    permission: PERMISSIONS.DashboardView,
    module: 'analytics',
  },
  {
    id: 'follow-ups',
    label: 'Follow-ups',
    to: '/tasks',
    permission: PERMISSIONS.DashboardView,
    module: 'follow-ups',
  },
  {
    id: 'referral-crm',
    label: 'Referral CRM',
    to: '/doctors',
    permission: PERMISSIONS.ReferralView,
    module: 'referrals',
  },
  {
    id: 'hospital-staff',
    label: 'Hospital Staff',
    to: '/staff',
    permission: PERMISSIONS.StaffView,
    module: 'staff',
  },
]
