# CureFlow platform architecture

CureFlow is the platform provider. It owns the control plane and offers the application as a service. Each hospital, clinic, nursing home, laboratory, or future care provider that registers with CureFlow is a customer account, represented internally as a tenant.

In this document, **CureFlow** means the platform provider and **tenant** means a registered customer healthcare business. When the document says **organization**, it means the customer organization represented by that tenant; it does not mean CureFlow itself.

## Current boundary

The codebase already has useful separation:

- Platform authentication uses `PlatformUser`, platform JWT claims, `/platform/auth/*`, and the `PlatformUser` authorization policy.
- Tenant authentication uses tenant users, tenant-scoped JWT claims, tenant middleware, and tenant lifecycle middleware.
- `TenantEntity` and the tenant database scope protect tenant data from accidental cross-tenant access.
- Platform tenant actions are audited through `PlatformAuditLog`.

The platform UI currently focuses on tenant approval, rejection, suspension, and activation. That is a good first module, but the platform should become a control plane with independently deployable capabilities rather than a large collection of tenant-specific screens.

## Target model

```text
Platform control plane
  ├─ Customer tenants and lifecycle
  ├─ Platform users, teams, roles, and permissions
  ├─ Products, modules, plans, and entitlements
  ├─ Tenant provisioning and configuration
  ├─ Billing and subscription state
  ├─ Support, impersonation, and audit
  ├─ Platform-wide reporting and health
  └─ Integration and job operations

Tenant data plane
  ├─ Organization workspace
  ├─ Locations and departments
  ├─ Users and clinical roles
  ├─ Patients and contacts
  ├─ Appointments, visits, and care records
  ├─ Communication and campaigns
  └─ Enabled healthcare modules
```

The CureFlow platform owns whether a tenant can use a module. The tenant owns the data and workflow inside that module. A CureFlow platform operator can manage the customer account's lifecycle and configuration without becoming one of that tenant's users or bypassing tenant audit controls. Tenant administrators create and manage the users who work inside their own healthcare business.

## Domain boundaries

Keep these concepts separate in the backend and UI:

1. **CureFlow platform**: the provider control plane. CureFlow platform operators manage customer accounts, subscriptions, modules, support, and platform operations.
2. **Tenant/customer account**: the commercial and security boundary for one registered healthcare business. Keep `Tenant` as the persistence name for compatibility. This account owns its users, data, settings, and enabled modules.
3. **Facility**: a physical hospital, clinic, branch, nursing home, lab, or pharmacy belonging to a tenant. A tenant may begin with one hospital and later add multiple facilities.
4. **Workspace**: the tenant application context used for permissions, settings, and module configuration.

## Location rollout

Multi-location support is intentionally a future capability. The current product can continue treating each tenant as one primary operating location. New tables, APIs, and screens should avoid assuming that this is permanently true:

- Keep `tenant_id` as the required security and ownership key on current records.
- Do not add `location_id` to every existing table until location workflows are actually being introduced.
- When the feature begins, add a tenant-owned `Facility`/`Location` record with one default primary location and migrate current tenant profile data into it.
- Add optional `location_id` to operational records by module, starting with appointments, staff schedules, inventory, beds, and reporting where location matters.
- Keep tenant administrators able to manage all locations, while allowing location-scoped roles later.
- Make the active location a workspace context for filtering and creation; never use it as a replacement for tenant authorization.

This lets a tenant start with one hospital, clinic, or nursing home and later add branches without changing the meaning of the tenant or invalidating existing records.

## Tenant type

The registration flow should capture the kind of healthcare business being registered. This is metadata about the tenant/customer account, not a replacement for modules or facilities.

Use a controlled enum rather than free text, for example:

```text
Hospital
Clinic
NursingHome
Laboratory
Pharmacy
Other
```

The backend change can remain backward compatible:

1. Add a `TenantType` enum and a nullable or defaulted `TenantType` column to `Tenants`.
2. Map existing rows to `Hospital` so no existing data changes meaning.
3. Add an optional `TenantType` property to `RegisterTenantRequest` initially; when omitted, use `Hospital`.
4. Add the value to `TenantDto` and platform tenant list/detail responses.
5. Add a required selection to the new registration UI after the backend contract is deployed.
6. Allow platform operators to correct the type later, with an audit record.

Tenant type should guide onboarding defaults, terminology, module recommendations, reporting, and platform support. It must not hard-code authorization or block future modules: a clinic may later enable laboratory or pharmacy capabilities, and a hospital may have multiple facilities and departments.
4. **Module**: a product capability such as CRM, HMS, appointments, inpatient care, pharmacy, laboratory, billing, or communication.
5. **Entitlement**: the platform decision that a tenant, plan, or facility may use a module, optionally with limits.
6. **Actor**: a platform user, tenant user, service account, or integration. Never infer platform authority from a tenant role.

New healthcare modules should own their own application services, DTOs, validators, controllers, UI routes, and permissions. They may depend on shared identity, organization context, audit, notifications, and patient identity contracts, but should not reach into another module's tables or services directly.

## Platform API shape

Prefer explicit control-plane routes:

```text
/platform/auth/*
/platform/tenants
/platform/tenants/{tenantId}/lifecycle
/platform/tenants/{tenantId}/facilities
/platform/tenants/{tenantId}/modules
/platform/tenants/{tenantId}/entitlements
/platform/operators
/platform/audit-logs
/platform/operations/jobs
```

Keep tenant routes under their existing tenant context. A platform endpoint that reads tenant data should be explicit, read-only by default, and audited. Do not add a platform bypass flag to ordinary tenant services.

Every platform mutation should have:

- a dedicated permission such as `organization.approve` or `entitlement.update`;
- an idempotent command with a request/correlation ID;
- a lifecycle/state transition check;
- an audit record containing actor, organization, action, reason, before/after state, and correlation ID;
- a safe, structured error response.

## UI structure

Keep the existing Nuxt route boundary and grow the platform shell by capability:

```text
app/pages/platform/
  index.vue                 # control-plane overview
  tenants/index.vue        # customer tenant directory and filters
  tenants/[id].vue         # customer tenant control-plane detail
  tenants/[id]/facilities.vue
  tenants/[id]/modules.vue
  operators.vue
  audit-logs.vue
  operations.vue
```

Use platform composables such as `usePlatformTenants`, `usePlatformModules`, and `usePlatformAudit`. Keep transport in a single platform client, and keep response normalization in platform-specific adapters. A page should orchestrate state and render components; it should not know SQL names, JWT claim details, or lifecycle transition rules.

Use a registry for navigation and capabilities instead of hardcoding every future module into the shell:

```ts
type PlatformModule = {
  id: string
  label: string
  route: string
  permission: string
  icon: Component
  children?: PlatformModule[]
}
```

The registry controls navigation visibility only. The API remains authoritative for authorization and entitlements.

## Data and security rules

- Keep platform tables separate from tenant tables where practical: platform users, organization lifecycle, plans, entitlements, platform audit, jobs, and support sessions.
- Keep `organization_id`/`tenant_id` on every tenant-owned row and preserve database-level tenant isolation.
- Treat a facility as a child of an organization, not as a new security model. A facility can become a reporting and operational scope later.
- Use platform-scoped claims only for platform APIs. Do not attach a tenant ID to a platform token unless a short-lived, explicitly audited support session is created.
- Represent support access as a time-limited session with reason, target organization, read/write scope, operator, expiry, and audit trail. Avoid permanent impersonation.
- Version module configuration and entitlements. Never encode plan checks directly in unrelated controllers.
- Publish domain events for lifecycle, entitlement, provisioning, and integration changes. Use an outbox/job boundary before introducing asynchronous provisioning.

## Recommended implementation sequence

1. Introduce a platform customer-tenant adapter and a typed platform API client while keeping current tenant endpoints compatible.
2. Add a platform overview and tenant detail page. Move approval, rejection, suspension, and activation into a reusable lifecycle command model.
3. Add a module catalog and tenant entitlements. Start with current capabilities and make the catalog data-driven.
4. Add facilities and tenant-level settings without changing existing tenant IDs.
5. Add platform operators, permission groups, audit search, and support sessions.
6. Extract future HMS capabilities behind module boundaries: inpatient, bed management, pharmacy, laboratory, billing, and reporting.

Avoid a rewrite of the current tenant application. The safest path is to preserve the tenant data-plane contracts, add platform control-plane contracts beside them, and migrate one platform capability at a time.
