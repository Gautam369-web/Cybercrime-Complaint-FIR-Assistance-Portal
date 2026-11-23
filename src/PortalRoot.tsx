import {lazy,Suspense,useEffect,useState} from 'react';
import App from './App';
import Management from './Management';
const TwilightBackground=lazy(()=>import('./TwilightBackground'));

async function checkAuth(){
  try{
    const res=await fetch('/api/me',{credentials:'same-origin'});
    if(res.ok){const u=await res.json();return u;}
  }catch{}
  return null;
}

export default function PortalRoot(){
  const [account,setAccount]=useState(typeof window!=='undefined'&&window.location.hash==='#account');
  const [user,setUser]=useState<any>(null);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    const update=()=>setAccount(window.location.hash==='#account');
    window.addEventListener('hashchange',update);
    return()=>window.removeEventListener('hashchange',update);
  },[]);

  useEffect(()=>{
    checkAuth().then(u=>{
      setUser(u);
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