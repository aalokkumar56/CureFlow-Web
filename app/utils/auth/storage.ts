const TOKEN_KEY = 'cureflow_token';
const USER_KEY = 'cureflow_user';
const TENANT_KEY = 'cureflow_tenant';

export const authStorage = {
    getToken(){
        if(!import.meta.client) return null;
        return localStorage.getItem(TOKEN_KEY);
    },

    getUser(){
       
        if(!import.meta.client) return null;

        const value=localStorage.getItem(USER_KEY);
        if(!value) return null;

        try{
            return JSON.parse(value);
        }catch(e){
            return null;
        }
    },

    getTenant(){
      
        if(!import.meta.client) return null;
      
        const value=localStorage.getItem(TENANT_KEY);
        if(!value) return null;
      
        try {
      return JSON.parse(value)
    } catch {
      return null
    
    }

},
    setSession(token:string,user:any,tenant:any){
        if(!import.meta.client) return;

        localStorage.setItem(TOKEN_KEY,token);
        localStorage.setItem(USER_KEY,JSON.stringify(user));
        localStorage.setItem(TENANT_KEY,JSON.stringify  (tenant));
    },

    clear(){
    if(!import.meta.client) return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TENANT_KEY);
    
    }

}
