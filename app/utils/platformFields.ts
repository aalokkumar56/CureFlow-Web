import type { PlatformField } from './platform'
import { enumOptions } from './platform'
export const facilityFields: PlatformField[] = [
  { key: 'name', label: 'Facility name', required: true, min: 2, max: 120 },
  { key: 'code', label: 'Code', max: 40 },
  { key: 'address', label: 'Address', max: 240 },
  { key: 'city', label: 'City', max: 80 },
  { key: 'country', label: 'Country code', min: 2, max: 2 },
  { key: 'isPrimary', label: 'Primary facility', type: 'checkbox' },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
]
export const moduleFields: PlatformField[] = [
  {
    key: 'key',
    label: 'Module key',
    required: true,
    min: 2,
    max: 40,
    help: 'Lowercase letters, digits and hyphens. The key cannot be changed after creation.',
  },
  { key: 'name', label: 'Name', required: true, min: 2, max: 120 },
  { key: 'description', label: 'Description', max: 500 },
  { key: 'isCore', label: 'Enabled by default for tenants without an override', type: 'checkbox' },
  { key: 'isActive', label: 'Active in catalog', type: 'checkbox' },
]
export const subscriptionFields: PlatformField[] = [
  {
    key: 'plan',
    label: 'Plan',
    type: 'select',
    required: true,
    options: enumOptions(['trial', 'starter', 'growth', 'enterprise']),
  },
  {
    key: 'status',
    label: 'Subscription status',
    type: 'select',
    required: true,
    options: enumOptions(['trialing', 'active', 'past_due', 'cancelled', 'expired']),
  },
  { key: 'seatLimit', label: 'User limit', type: 'number', required: true, min: 1, max: 1000000 },
  {
    key: 'patientLimit',
    label: 'Patient limit',
    type: 'number',
    required: true,
    min: 1,
    max: 100000000,
  },
  {
    key: 'messagesQuotaMonthly',
    label: 'Monthly message limit',
    type: 'number',
    required: true,
    min: 0,
    max: 100000000,
  },
  { key: 'trialEndsAt', label: 'Trial ends', type: 'datetime-local' },
  { key: 'subscriptionRenewsAt', label: 'Renews at', type: 'datetime-local' },
  { key: 'reason', label: 'Reason for change', required: true, min: 3, max: 500 },
]
export const tenantProfileFields: PlatformField[] = [
  { key: 'name', label: 'Business name', required: true, min: 2, max: 180 },
  { key: 'contactName', label: 'Contact name', max: 120 },
  { key: 'contactEmail', label: 'Contact email', type: 'email', required: true, max: 254 },
  { key: 'contactPhone', label: 'Contact phone', max: 40 },
  { key: 'country', label: 'Country code', required: true, min: 2, max: 2, pattern: '[A-Za-z]{2}' },
  {
    key: 'timezone',
    label: 'Time zone',
    required: true,
    max: 100,
    help: 'For example Asia/Kolkata or UTC.',
  },
  { key: 'reason', label: 'Reason for change', required: true, min: 3, max: 500 },
]
