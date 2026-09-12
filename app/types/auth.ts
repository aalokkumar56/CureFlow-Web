export interface TenantUser {
  role: string
  name?: string
  permissions?: string[]
}

export interface Tenant {
  [key: string]: unknown
}

export interface TenantSession {
  user: TenantUser
  tenant: Tenant
}

export interface TenantLoginResponse extends TenantSession {
  access_token: string
}
