import {useEffect,useState} from 'react';
import App from './App';
import Management from './Management';
export default function PortalRoot(){const [account,setAccount]=useState(location.hash==='#account');useEffect(()=>{const update=()=>setAccount(location.hash==='#account');addEventListener('hashchange',update);return()=>removeEventListener('hashchange',update);},[]);return <><div hidden={account}><App/></div>{account&&<Management/>}</>;}
