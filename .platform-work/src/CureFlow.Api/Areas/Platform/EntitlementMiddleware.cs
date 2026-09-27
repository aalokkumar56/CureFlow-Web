using CureFlow.Application.Common;
using CureFlow.Application.Interfaces;
namespace CureFlow.Api.Areas.Platform;
public sealed class EntitlementMiddleware(RequestDelegate next)
{
 public async Task InvokeAsync(HttpContext context, ICureFlowDbSession db, ITenantContext tenant)
 {
  if(tenant.TenantId==Guid.Empty || context.User.Identity?.IsAuthenticated!=true || context.User.HasClaim("platform_user","true")){await next(context);return;}
  var path=context.Request.Path.Value?.ToLowerInvariant()??"";
  var area=path.Split('/',StringSplitOptions.RemoveEmptyEntries).ElementAtOrDefault(1)??"";
  var module=area switch {
   "patients" or "leads" or "referrals" or "referring-doctors"=>"crm",
   "appointments"=>"appointments",
   "campaigns" or "conversations" or "email-inbox" or "templates"=>"communications",
   "clinical" or "visits" or "prescriptions" or "allergies" or "lab-reports"=>"clinical",_=>null};
  if(module is not null){
   var enabled=await db.QueryFirstOrDefaultAsync<bool?>(
    "SELECT m.\"IsActive\" AND COALESCE(e.\"IsEnabled\" AND (e.\"ExpiresAt\" IS NULL OR e.\"ExpiresAt\">NOW()),m.\"IsCore\") FROM \"PlatformModules\" m LEFT JOIN \"TenantEntitlements\" e ON e.\"PlatformModuleId\"=m.\"Id\" AND e.\"TenantId\"=@TenantId AND NOT e.\"IsDeleted\" WHERE m.\"Key\"=@module AND NOT m.\"IsDeleted\"",
    new{tenant.TenantId,module},true);
   if(enabled==false)throw new DomainException("This module is not enabled for your account. Contact your administrator.",403);
  }
  await next(context);
 }
}

