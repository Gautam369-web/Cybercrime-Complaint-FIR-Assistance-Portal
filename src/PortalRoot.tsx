import {lazy,Suspense,useEffect,useState} from 'react';
import App from './App';
import Management from './Management';
import {isSupabaseConfigured,supabase} from './supabase';
const TwilightBackground=lazy(()=>import('./TwilightBackground'));

function isAccountRoute(){
  if(typeof window==='undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const href = window.location.href || '';
  return (
    hash === '#account' ||
    hash.startsWith('#account') ||
    href.includes('code=') ||
    href.includes('access_token=') ||
    href.includes('error=')
  );
}

async function checkAuth(){
  if(isSupabaseConfigured && supabase){
    try{
      const {data:{session}} = await supabase.auth.getSession();
      if(session?.user) return session.user;
    }catch{}
  }
  try{
    if(typeof window!=='undefined' && (window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1')){
      const res=await fetch('/api/me',{credentials:'same-origin'});
      if(res.ok){const u=await res.json();return u;}
    }
  }catch{}
  return null;
}

export default function PortalRoot(){
  const [account,setAccount]=useState(isAccountRoute);
  const [user,setUser]=useState<any>(null);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    const update=()=>setAccount(isAccountRoute());
    window.addEventListener('hashchange',update);
    window.addEventListener('popstate',update);
    return()=>{
      window.removeEventListener('hashchange',update);
      window.removeEventListener('popstate',update);
    };
  },[]);

  useEffect(()=>{
    checkAuth().then(u=>{
      setUser(u);
    }).finally(()=>{
      setChecking(false);
    });
  },[]);

  if(checking){
    return <div className="portal-root"><div className="twilight-placeholder" aria-hidden="true"/></div>;
  }

  return (
    <div className="portal-root">
      <Suspense fallback={<div className="twilight-placeholder" aria-hidden="true"/>}>
        <TwilightBackground/>
      </Suspense>
      <div hidden={account}><App/></div>
      {account && <Management/>}
    </div>
  );
}