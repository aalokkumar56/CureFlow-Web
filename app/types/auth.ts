export interface TenantUser {
  id: string
  role: string
  name?: string
  permissions?: string[]
}

export interface Tenant {
  id: string
  [key: string]: unknown
}

export interface TenantSession {
  user: TenantUser
  tenant: Tenant
}

export interface TenantLoginResponse extends TenantSession {
  access_token: string
}
