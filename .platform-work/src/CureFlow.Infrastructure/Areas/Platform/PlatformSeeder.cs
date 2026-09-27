using CureFlow.Application.Areas.Platform;
using CureFlow.Application.Interfaces;
using CureFlow.Domain.Entities.Saas;
using System.Text.Json;
namespace CureFlow.Infrastructure.Areas.Platform;
public static class PlatformSeeder
{
 public static async Task SeedAsync(ICureFlowDbSession db) {
  await db.TransactionAsync(async store=>{
   await store.ExecuteAsync("SELECT pg_advisory_xact_lock(734291)",ignoreTenant:true);
   foreach(var key in new[]{"owner","administrator","support","billing","viewer"}){
    if(await store.QuerySingleAsync<long>("SELECT COUNT(*) FROM \"PlatformRoles\" WHERE \"Key\"=@key",new{key},true)>0)continue;
    var permissions=key switch {
     "owner"=>PlatformPermissions.All,
     "administrator"=>PlatformPermissions.All.Where(p=>!p.StartsWith("roles.")&&!p.StartsWith("operators.")).ToArray(),
     "support"=>new[]{"overview.read","tenants.read","support.read","support.write","facilities.read","entitlements.read"},
     "billing"=>new[]{"overview.read","tenants.read","billing.read","billing.write"},
     _=>PlatformPermissions.All.Where(p=>p.EndsWith(".read")&&!p.StartsWith("support.")).ToArray()
    };
    await store.InsertAsync(new PlatformRole{Key=key,Name=char.ToUpper(key[0])+key[1..],PermissionsJson=JsonSerializer.Serialize(permissions)},true);
   }
   foreach(var (key,name) in new[]{("crm","Patient CRM"),("appointments","Appointments"),("communications","Communications"),("clinical","Clinical records")}){
    if(await store.QuerySingleAsync<long>("SELECT COUNT(*) FROM \"PlatformModules\" WHERE \"Key\"=@key",new{key},true)==0)
     await store.InsertAsync(new PlatformModule{Key=key,Name=name,IsCore=true,Description="Existing CureFlow capability"},true);
   }
  });
 }
}

