import {lazy,Suspense,useEffect,useState} from 'react';
import App from './App';
import Management from './Management';
const TwilightBackground=lazy(()=>import('./TwilightBackground'));
export default function PortalRoot(){const [account,setAccount]=useState(location.hash==='#account');useEffect(()=>{const update=()=>setAccount(location.hash==='#account');addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update);},[]);return <div className="portal-root"><Suspense fallback={<div className="twilight-placeholder" aria-hidden="true"/>}><TwilightBackground/></Suspense><div hidden={account}><App/></div>{account&&<Management/>}</div>;}
