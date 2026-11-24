import AccountJourney from './AccountJourney';
import {useEffect,useState,useRef} from 'react';
import {supabase,isSupabaseConfigured} from './supabase';
import {GlassButton,GlassCard,GlassInput,GlassChip,GlassModal,GlassToast,BottomDock,LanguagePicker} from './components';
import {ArrowRight,ArrowLeft,ArrowUpRight,ShieldCheck,LockKeyhole,Globe2,Phone,Compass,Sun,Moon,Check,Trash2,FileText,ChevronDown,ExternalLink,Plus,Upload,X,Radio,Paperclip} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {languages} from './i18n';

type Case={id:string;title:string;status:string;narrative:string;created:string;updated:string;details:Record<string,string>;ai?:{state:string;flag?:string;reason?:string;summary?:string;questions?:string[]};ai_consent?:number;owner?:string;events?:{status:string;note:string;created:string}[];files?:{id:string;name:string;size:number}[]};
type User={id:string;email:string;role:string;avatar?:string|null;auth_provider?:string};

function useMedia(query:string){const [matches,set]=useState(()=>typeof window!=='undefined'&&window.matchMedia(query).matches);useEffect(()=>{const m=window.matchMedia(query);const update=()=>set(m.matches);m.addEventListener('change',update);return()=>m.removeEventListener('change',update);},[query]);return matches;}

function GoogleIcon(){
  return (
    <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
  );
}

async function api(path:string,body?:unknown){
  try{
    const response=await fetch('/api'+path,{
      method:body?'POST':'GET',
      credentials:'same-origin',
      headers:body instanceof FormData?{}:{'Content-Type':'application/json'},
      ...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})
    });
    const text=await response.text();
    let result:any=null;
    try{
      result=text?JSON.parse(text):{};
    }catch{
      if(response.status===500||response.status===502||response.status===503||response.status===504){
        throw Error('Local API server is not running or unreachable. Please start it using "npm run api" in your terminal.');
      }
      throw Error(`Unexpected server response (${response.status}): ${text.slice(0,80)}`);
    }
    if(!response.ok)throw Error(result.error||result.message||`Request failed (${response.status})`);
    return result;
  }catch(e:any){
    if(e.name==='TypeError'&&e.message?.includes('fetch')){
      throw Error('Network error: Unable to reach the server. Please check that the API is running.');
    }
    throw e;
  }
}

const transitions:Record<string,string[]>={pending_review:['approved','changes_requested','rejected'],changes_requested:['pending_review','approved','rejected'],approved:['in_progress','closed'],in_progress:['closed','changes_requested'],rejected:['pending_review'],closed:['pending_review']};

export let portalDraft:Record<string,string>={};
export function preparePortalDraft(data:Record<string,string>){portalDraft={...data};window.location.hash='account';}

export default function Management(){
  const {t,i18n}=useTranslation();
  const [user,setUser]=useState<User|null>(null);
  const [checking,setChecking]=useState(true);
  const [authStep,setAuthStep]=useState<'login'|'register'|'verify-otp'>('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [otp,setOtp]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [items,setItems]=useState<Case[]>([]);
  const [selected,setSelected]=useState<Case|null>(null);
  const [admin,setAdmin]=useState(false);
  const [view,setView]=useState<'dashboard'|'create-complaint'|'complaint-detail'>('dashboard');
  const [filter,setFilter]=useState('all');
  const [note,setNote]=useState('');
  const [status,setStatus]=useState('');
  const [googleClientId,setGoogleClientId]=useState(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '421343221241-k4cvgu1mqcd1lhcbdki6oufnsoou5kgv.apps.googleusercontent.com'
  );
  const [googleModal,setGoogleModal]=useState(false);
  const [googleEmail,setGoogleEmail]=useState('');

  // File upload state
  const [isDragging,setIsDragging]=useState(false);
  const fileInputRef=useRef<HTMLInputElement>(null);

  // Complaint submission form state
  const [title,setTitle]=useState('');
  const [narrative,setNarrative]=useState('');
  const [consent,setConsent]=useState(false);
  const [aiConsent,setAiConsent]=useState(false);

  // Theme & UI state
  const [theme,setTheme]=useState<'obsidian'|'frost'>('obsidian');
  const [contrast,setContrast]=useState(false);
  const [large,setLarge]=useState(false);
  const [motion,setMotion]=useState(false);
  const [modal,setModal]=useState('');
  const [toast,setToast]=useState('');
  const reduced=useMedia('(prefers-reduced-motion: reduce)')||motion;

  // Sync draft when opened
  useEffect(()=>{
    if(portalDraft.crime) setTitle(portalDraft.crime);
    if(portalDraft.narrative) setNarrative(portalDraft.narrative);
  },[]);

  // Load Google Auth configuration
  useEffect(()=>{
    api('/auth/google/config').then(cfg=>{
      if(cfg?.clientId) setGoogleClientId(cfg.clientId);
    }).catch(()=>{});
  },[]);

  // Initialize official Google Identity Services if client ID is configured
  useEffect(()=>{
    if(!googleClientId || typeof window==='undefined') return;
    const script=document.createElement('script');
    script.src='https://accounts.google.com/gsi/client';
    script.async=true;
    script.defer=true;
    script.onload=()=>{
      try {
        (window as any).google?.accounts?.id?.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if(response?.credential){
              setBusy(true);setError('');
              try {
                const u = await api('/auth/google', { credential: response.credential });
                setUser(u);
                setToast(`Signed in with Google as ${u.email}`);
                await load(false);
              } catch(e) {
                setError(e instanceof Error?e.message:'Google authentication failed');
              } finally {
                setBusy(false);
              }
            }
          }
        });
      } catch {}
    };
    document.body.appendChild(script);
    return ()=>{
      try { document.body.removeChild(script); } catch {}
    };
  },[googleClientId]);

  async function handleGoogleSignIn(customEmail?:string){
    setBusy(true);setError('');setMessage('');
    try{
      const emailToUse=(customEmail||googleEmail).trim()||'demo.google@example.com';
      const u=await api('/auth/google',{
        email:emailToUse,
        name:emailToUse.split('@')[0],
        google_id:'g_'+Math.abs(emailToUse.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a;},0))
      });
      setUser(u);
      setGoogleModal(false);
      setGoogleEmail('');
      setToast(`Signed in with Google as ${u.email}`);
      await load(false);
    }catch(e){
      setError(e instanceof Error?e.message:'Google sign-in failed');
    }finally{
      setBusy(false);
    }
  }

  const onGoogleBtnClick = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    if (isSupabaseConfigured && supabase) {
      try {
        const redirectUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/`
          : 'https://fir-comp.vercel.app/';

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) {
          console.warn('Supabase Google OAuth initiation error:', error.message);
          setError(`Google sign-in error: ${error.message}`);
          setBusy(false);
          setGoogleModal(true);
          return;
        }
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (err: any) {
        console.warn('Supabase Google OAuth exception:', err);
        setError(err.message || 'Google sign-in failed');
        setBusy(false);
      }
    }
    if (googleClientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
        setBusy(false);
        return;
      } catch {}
    }
    setBusy(false);
    setGoogleModal(true);
  };

  async function load(isAdmin=admin){
    try{
      if (isSupabaseConfigured && supabase) {
        let query = supabase.from('complaints').select('*').order('created', { ascending: false });
        if (!isAdmin && user && user.id) {
          query = query.eq('owner', user.id);
        }
        const { data, error: supaErr } = await query;
        if (!supaErr && data) {
          setItems(data.map(item => ({
            ...item,
            details: typeof item.details === 'string' ? JSON.parse(item.details) : (item.details || {}),
            ai: typeof item.ai === 'string' ? JSON.parse(item.ai) : (item.ai || { state: 'not_run' }),
          })));
          return;
        }
      }
      const data=await api(isAdmin?'/admin/complaints':'/complaints');
      setItems(data);
    }catch(e){
      // Silently handle if unauthenticated
    }
  }

  async function open(id:string){
    try{
      if (isSupabaseConfigured && supabase) {
        const { data, error: supaErr } = await supabase.from('complaints').select('*').eq('id', id).single();
        if (!supaErr && data) {
          const eventsRes = await supabase.from('events').select('*').eq('complaint', id).order('created', { ascending: true });
          const filesRes = await supabase.from('files').select('*').eq('complaint', id);
          setSelected({
            ...data,
            details: typeof data.details === 'string' ? JSON.parse(data.details) : (data.details || {}),
            ai: typeof data.ai === 'string' ? JSON.parse(data.ai) : (data.ai || { state: 'not_run' }),
            events: eventsRes.data || [],
            files: filesRes.data || []
          });
          setNote('');
          setStatus('');
          setView('complaint-detail');
          return;
        }
      }
      const c=await api('/complaints/'+id);
      setSelected(c);
      setNote('');
      setStatus('');
      setView('complaint-detail');
    }catch(e){
      setError(e instanceof Error?e.message:'Failed to load complaint');
    }
  }

  useEffect(()=>{
    if (isSupabaseConfigured && supabase) {
      // Check if URL has OAuth code or error to exchange
      const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      let code = searchParams.get('code');
      let oauthError = searchParams.get('error_description') || searchParams.get('error');

      // Also check hash in case code was attached to hash: #account?code=... or #code=...
      if (!code && typeof window !== 'undefined' && window.location.hash) {
        const hashStr = window.location.hash.slice(1);
        const qIdx = hashStr.indexOf('?');
        const qStr = qIdx !== -1 ? hashStr.slice(qIdx + 1) : hashStr;
        const hashParams = new URLSearchParams(qStr);
        code = hashParams.get('code');
        oauthError = oauthError || hashParams.get('error_description') || hashParams.get('error');
      }

      if (oauthError) {
        setError(`Google sign-in error: ${oauthError}`);
        setChecking(false);
        return;
      }

      if (code) {
        setBusy(true);
        supabase.auth.exchangeCodeForSession(code).then(({ data, error: exErr }) => {
          if (!exErr && data?.session?.user) {
            const u = data.session.user;
            setUser({
              id: u.id,
              email: u.email || 'google.user@example.com',
              role: 'user',
              avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
              auth_provider: 'google'
            });
            setMessage(`Signed in successfully as ${u.email}`);
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', window.location.pathname + '#account');
            }
            load(false);
          } else if (exErr) {
            console.warn('exchangeCodeForSession error:', exErr.message);
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user) {
                const su = session.user;
                setUser({
                  id: su.id,
                  email: su.email || 'google.user@example.com',
                  role: 'user',
                  avatar: su.user_metadata?.avatar_url || su.user_metadata?.picture || null,
                  auth_provider: 'google'
                });
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', window.location.pathname + '#account');
                }
                load(false);
              } else {
                setError(`Google session error: ${exErr.message}`);
              }
            });
          }
        }).catch(err => {
          setError(err.message || 'OAuth exchange failed');
        }).finally(() => {
          setBusy(false);
          setChecking(false);
        });
        return;
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || 'user@supabase.io',
            role: 'user',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
            auth_provider: 'supabase'
          });
          load(false);
        }
      }).catch(()=>{})
        .finally(()=>setChecking(false));
      return;
    }

    api('/me').then(u=>{
      setUser(u);
      return api('/complaints');
    }).then(setItems).catch(e=>{
      if(e.message!=='Please sign in')setError('Start the local API to use accounts and tracking.');
    }).finally(()=>setChecking(false));
  },[]);

  // Listen to Supabase auth state changes (e.g. after Google OAuth redirect)
  useEffect(()=>{
    if (!isSupabaseConfigured || !supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || 'user@supabase.io',
          role: 'user',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
          auth_provider: 'google'
        });
        setMessage(`Signed in successfully as ${session.user.email || 'Google User'}`);
        if (typeof window !== 'undefined' && (window.location.search.includes('code=') || window.location.hash.includes('access_token'))) {
          window.history.replaceState(null, '', window.location.pathname + '#account');
        }
        setChecking(false);
        await load(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setItems([]);
        setChecking(false);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Realtime Supabase subscription
  useEffect(()=>{
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    
    const channel = client
      .channel('complaints-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        (payload) => {
          load(admin);
          if (selected && payload.new && (payload.new as any).id === selected.id) {
            setSelected(prev => prev ? { ...prev, ...(payload.new as any) } : prev);
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, admin, selected?.id]);

  useEffect(()=>{
    if(!user)return;
    const timer=setInterval(()=>{
      api(admin?'/admin/complaints':'/complaints').then(setItems).catch(()=>{});
      if(selected)api('/complaints/'+selected.id).then(setSelected).catch(()=>{});
    },15000);
    return()=>clearInterval(timer);
  },[user,admin,selected?.id]);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.documentElement.dataset.contrast=String(contrast);
    document.documentElement.dataset.large=String(large);
    document.documentElement.dataset.motion=String(reduced);
    document.documentElement.lang=i18n.language;
    document.documentElement.dir=i18n.dir();
  },[theme,contrast,large,reduced,i18n.language]);

  useEffect(()=>{
    if(!toast)return;
    const timer=setTimeout(()=>setToast(''),5000);
    return()=>clearTimeout(timer);
  },[toast]);

  // Auth handlers
  async function handleRegister(){
    if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||typeof password!=='string'||password.length<12||password.length>128){
      setError('Use a valid email and a password of 12–128 characters.');
      return;
    }
    setBusy(true);setError('');setMessage('');
    try{
      if (isSupabaseConfigured && supabase) {
        const { data, error: supaErr } = await supabase.auth.signUp({ email, password });
        if (!supaErr && data?.user) {
          setMessage('Account created successfully. You can now sign in.');
          setAuthStep('login');
          return;
        } else if (supaErr && !supaErr.message.toLowerCase().includes('fetch')) {
          throw Error(supaErr.message);
        }
      }
      const res=await api('/register',{email,password});
      if(res.requiresOtp){
        setMessage(res.message||'Please check your email for the verification code.');
        setAuthStep('verify-otp');
        setOtp('');
      } else {
        setMessage('Account created. You can now sign in.');
        setAuthStep('login');
      }
    }catch(e){setError(e instanceof Error?e.message:'Registration failed');}
    finally{setBusy(false);}
  }

  async function handleResendOtp(){
    if(!email)return;
    setBusy(true);setError('');
    try{
      await api('/send-otp',{email});
      setMessage('Verification code sent. Check your email.');
    }catch(e){setError(e instanceof Error?e.message:'Failed to send code');}
    finally{setBusy(false);}
  }

  async function handleVerifyOtp(){
    if(!otp||otp.length!==6){
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);setError('');
    try{
      await api('/verify-otp',{email,otp});
      setMessage('Email verified successfully. You can now sign in.');
      setAuthStep('login');
      setOtp('');
      setPassword('');
    }catch(e){setError(e instanceof Error?e.message:'Verification failed');}
    finally{setBusy(false);}
  }

  async function handleLogin(){
    if(typeof email!=='string'||typeof password!=='string'||password.length>128){
      setError('Invalid credentials');
      return;
    }
    setBusy(true);setError('');setMessage('');
    try{
      if (isSupabaseConfigured && supabase) {
        const { data, error: supaErr } = await supabase.auth.signInWithPassword({ email, password });
        if (!supaErr && data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || email,
            role: 'user',
            avatar: data.user.user_metadata?.avatar_url || null,
            auth_provider: 'supabase'
          });
          setPassword('');
          await load(false);
          return;
        } else if (supaErr && !supaErr.message.toLowerCase().includes('fetch')) {
          throw Error(supaErr.message);
        }
      }
      const u=await api('/login',{email,password});
      setUser(u);
      setPassword('');
      await load(false);
    }catch(e){setError(e instanceof Error?e.message:'Login failed');}
    finally{setBusy(false);}
  }

  async function handleLogout(){
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    try{
      await api('/logout',{});
    }catch{}
    setUser(null);
    setItems([]);
    setSelected(null);
    setAdmin(false);
    setView('dashboard');
    setAuthStep('login');
    setEmail('');
    setPassword('');
  }

  // Create complaint handler
  async function handleSubmitComplaint(){
    if(!title.trim()||!narrative.trim()){
      setError('Please provide a complaint title and narrative.');
      return;
    }
    if(!consent){
      setError('Please provide consent to submit this complaint.');
      return;
    }
    setBusy(true);setError('');setMessage('');
    try{
      if (isSupabaseConfigured && supabase) {
        const newCase = {
          owner: user ? user.id : 'demo.user',
          title: title.trim(),
          narrative: narrative.trim(),
          details: portalDraft,
          status: 'pending_review',
          ai: { state: 'not_run' },
          ai_consent: consent ? 1 : 0,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };
        const { data, error: insertErr } = await supabase.from('complaints').insert([newCase]).select();
        if (!insertErr && data && data[0]) {
          setMessage('Submitted to Realtime Database. Human review in progress.');
          setTitle('');
          setNarrative('');
          setConsent(false);
          setAiConsent(false);
          portalDraft = {};
          await load(admin);
          await open(data[0].id);
          return;
        }
      }
      const res=await api('/complaints',{
        title:title.trim(),
        narrative:narrative.trim(),
        details:portalDraft,
        consent:true,
        aiConsent
      });
      setMessage('Submitted for human review. Add supporting files below.');
      setTitle('');
      setNarrative('');
      setConsent(false);
      setAiConsent(false);
      portalDraft={};
      await open(res.id);
      await load(admin);
    }catch(e){
      setError(e instanceof Error?e.message:'Submission failed');
    }finally{
      setBusy(false);
    }
  }

  // File upload handler
  async function handleFileUpload(files:FileList|null){
    if(!selected||!files||files.length===0)return;
    const file=files[0];
    if(file.size>5*1024*1024){
      setError('File must be 5 MB or smaller.');
      return;
    }
    if(!['image/png','image/jpeg','application/pdf'].includes(file.type)){
      setError('Only PNG, JPEG and PDF files are accepted.');
      return;
    }
    setBusy(true);setError('');
    try{
      const form=new FormData();
      form.append('file',file);
      await api(`/complaints/${selected.id}/files`,form);
      const updated=await api('/complaints/'+selected.id);
      setSelected(updated);
      setToast('File attached successfully.');
      await load(admin);
    }catch(e){
      setError(e instanceof Error?e.message:'Upload failed');
    }finally{
      setBusy(false);
    }
  }

  // Admin decision handler
  async function handleAdminDecision(){
    if(!selected||!status||note.trim().length<5){
      setError('Select a status and provide a reason of at least 5 characters.');
      return;
    }
    setBusy(true);setError('');
    try{
      if (isSupabaseConfigured && supabase) {
        const updates: any = { status, updated: new Date().toISOString() };
        const { error: updateErr } = await supabase.from('complaints').update(updates).eq('id', selected.id);
        if (!updateErr) {
          await supabase.from('events').insert([{
            complaint: selected.id,
            actor: user ? user.id : 'admin',
            status,
            note: note.trim(),
            created: new Date().toISOString()
          }]);
          const reason=note.trim();
          setNote('');
          setStatus('');
          await open(selected.id);
          setMessage(reason);
          await load(true);
          return;
        }
      }
      await api(`/admin/complaints/${selected.id}/status`,{status,note:note.trim()});
      const reason=note.trim();
      setNote('');
      setStatus('');
      const updated=await api('/complaints/'+selected.id);
      setSelected(updated);
      setMessage(reason);
      await load(true);
    }catch(e){
      setError(e instanceof Error?e.message:'Admin update failed');
    }finally{
      setBusy(false);
    }
  }

  // Reply handler
  async function handleReply(){
    if(!selected||note.trim().length<5){
      setError('Message must be at least 5 characters.');
      return;
    }
    setBusy(true);setError('');
    try{
      await api(`/complaints/${selected.id}/reply`,{note:note.trim()});
      setNote('');
      const updated=await api('/complaints/'+selected.id);
      setSelected(updated);
      setToast('Reply sent to review team.');
      await load(admin);
    }catch(e){
      setError(e instanceof Error?e.message:'Reply failed');
    }finally{
      setBusy(false);
    }
  }

  const navigateToVillage=(hash:string)=>{
    window.location.hash=hash;
  };

  if(checking){
    return (
      <main className="management-page">
        <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
        <p role="status" className="glass notice" style={{maxWidth:400,margin:'auto',textAlign:'center'}}>Checking your session…</p>
      </main>
    );
  }

  if(!user){
    return (
      <main className="management-page">
        <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
        
        {/* Top Header Bar */}
        <div className="management-top-bar">
          <div className="brand-group">
            <div className="brand brand-wrap" aria-label="Village of Justice">
              <span className="brand-mark"><ShieldCheck size={24}/></span>
              <div>the village of <strong>justice</strong><span>A little guidance. A way forward.</span></div>
            </div>
            <GlassButton className="back-village-btn" onClick={()=>navigateToVillage('')}>
              <Compass size={16}/> Back to village
            </GlassButton>
          </div>

          <div className="top-actions-group">
            <div className="appearance-picker glass" aria-label="Appearance">
              <button aria-pressed={theme==='frost'} onClick={()=>setTheme('frost')}><Sun size={16}/>Frost</button>
              <button aria-pressed={theme==='obsidian'} onClick={()=>setTheme('obsidian')}><Moon size={16}/>Obsidian</button>
            </div>
          </div>
        </div>
        
        <div className="account-auth-layout">
          <AccountJourney compact/>
          <GlassCard className="auth-card">
            {authStep==='register' && (
              <>
                <h2>Create your account</h2>
                <p className="muted">You'll receive a verification code if SMTP is configured.</p>
                <button type="button" className="google-auth-button glass" disabled={busy} onClick={onGoogleBtnClick}>
                  <GoogleIcon/>
                  <span>Sign up with Google</span>
                </button>
                <div className="auth-divider"><span>or with email</span></div>
                <form onSubmit={e=>{e.preventDefault();handleRegister();}}>
                  <label className="field-label" htmlFor="reg-email">Email</label>
                  <GlassInput id="reg-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>
                  <label className="field-label" htmlFor="reg-password">Password</label>
                  <GlassInput id="reg-password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
                  <p className="small-text muted">At least 12 characters.</p>
                  <GlassButton className="primary full-width" disabled={busy} type="submit">{busy?'Creating…':'Create account'}</GlassButton>
                </form>
                <p className="small-text muted" style={{marginTop:12}}><button className="text-button" onClick={()=>{setAuthStep('login');setError('');setMessage('');}}>Already registered? Sign in</button></p>
              </>
            )}
            {authStep==='verify-otp' && (
              <>
                <h2>Verify your email</h2>
                <p className="muted">We sent a 6-digit code to <strong>{email}</strong></p>
                <form onSubmit={e=>{e.preventDefault();handleVerifyOtp();}}>
                  <label className="field-label" htmlFor="otp-input">Verification code</label>
                  <GlassInput id="otp-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" required value={otp} onChange={e=>setOtp(e.target.value)} style={{letterSpacing:'0.5em',textAlign:'center',fontSize:'1.5em'}}/>
                  <div className="row between" style={{marginTop:8}}>
                    <GlassButton className="primary full-width" disabled={busy} type="submit">{busy?'Verifying…':'Verify code'}</GlassButton>
                  </div>
                </form>
                <p className="small-text muted" style={{marginTop:12}}><button className="text-button" disabled={busy} onClick={handleResendOtp}>Resend code</button></p>
                <p className="small-text muted" style={{marginTop:8}}><button className="text-button" onClick={()=>{setAuthStep('login');setOtp('');}}>Back to sign in</button></p>
              </>
            )}
            {authStep==='login' && (
              <>
                <h2>Welcome back</h2>
                <p className="muted">Sign in to access your complaints.</p>
                <button type="button" className="google-auth-button glass" disabled={busy} onClick={onGoogleBtnClick}>
                  <GoogleIcon/>
                  <span>Sign in with Google</span>
                </button>
                <div className="auth-divider"><span>or with email</span></div>
                <form onSubmit={e=>{e.preventDefault();handleLogin();}}>
                  <label className="field-label" htmlFor="login-email">Email</label>
                  <GlassInput id="login-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/>
                  <label className="field-label" htmlFor="login-password">Password</label>
                  <GlassInput id="login-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
                  <GlassButton className="primary full-width" disabled={busy} type="submit">{busy?'Signing in…':'Sign in'}</GlassButton>
                </form>
                <p className="small-text muted" style={{marginTop:12}}><button className="text-button" onClick={()=>{setAuthStep('register');setPassword('');setError('');setMessage('');}}>New here? Create an account</button></p>
              </>
            )}
          </GlassCard>
        </div>
        {googleModal && (
          <GlassModal title="Continue with Google" onClose={()=>setGoogleModal(false)}>
            <div style={{padding:'8px 4px'}}>
              <p className="muted" style={{fontSize:14,marginBottom:18,lineHeight:1.6}}>
                Sign in with your Google account to access your complaints and view administrative updates.
              </p>
              <form onSubmit={e=>{e.preventDefault();handleGoogleSignIn();}}>
                <label className="field-label" htmlFor="google-email-input">Google Email address</label>
                <GlassInput
                  id="google-email-input"
                  type="email"
                  required
                  placeholder="e.g. name@gmail.com"
                  value={googleEmail}
                  onChange={e=>setGoogleEmail(e.target.value)}
                />
                <div className="row wrap" style={{marginTop:20,gap:10}}>
                  <GlassButton className="primary" type="submit" disabled={busy||!googleEmail.trim()}>
                    {busy?'Signing in…':'Continue with this account'}
                  </GlassButton>
                  <GlassButton type="button" disabled={busy} onClick={()=>handleGoogleSignIn('demo.google@example.com')}>
                    Use demo Google account
                  </GlassButton>
                </div>
              </form>
              <p className="small-text muted" style={{marginTop:22,lineHeight:1.6,borderTop:'1px solid var(--border)',paddingTop:14}}>
                Tip: Configure <code style={{color:'var(--text)',background:'rgba(255,255,255,0.06)',padding:'2px 6px',borderRadius:6}}>GOOGLE_CLIENT_ID</code> in <code style={{color:'var(--text)',background:'rgba(255,255,255,0.06)',padding:'2px 6px',borderRadius:6}}>.env</code> to enable native Google One Tap and OAuth popup in production.
              </p>
            </div>
          </GlassModal>
        )}
        {error&&<p className="glass notice error-text" role="alert" style={{maxWidth:480,margin:'24px auto 0'}}>{error}</p>}
        {message&&<p className="glass notice" role="status" style={{maxWidth:480,margin:'12px auto 0'}}>{message}</p>}
        <div className="footer-note" style={{maxWidth:480,margin:'32px auto 0',textAlign:'center'}}><ShieldCheck size={15}/><span>A preparation assistant, not legal advice or an official government service.</span></div>
      </main>
    );
  }

  const filteredItems=items.filter(c=>filter==='all'||c.status===filter);

  return (
    <main className="management-page">
      <div className="ambient ambient-one"/><div className="ambient ambient-two"/>
      
      {/* Top Header Bar (Flexbox - zero collisions) */}
      <div className="management-top-bar">
        <div className="brand-group">
          <div className="brand brand-wrap" aria-label="Village of Justice">
            <span className="brand-mark"><ShieldCheck size={24}/></span>
            <div>the village of <strong>justice</strong><span>A little guidance. A way forward.</span></div>
          </div>
          <GlassButton className="back-village-btn" onClick={()=>navigateToVillage('')}>
            <Compass size={16}/> Back to village
          </GlassButton>
        </div>

        <div className="top-actions-group">
          <GlassButton className="sign-out-btn" disabled={busy} onClick={handleLogout}>
            Sign out
          </GlassButton>
          <div className="appearance-picker glass" aria-label="Appearance">
            <button aria-pressed={theme==='frost'} onClick={()=>setTheme('frost')}><Sun size={16}/>Frost</button>
            <button aria-pressed={theme==='obsidian'} onClick={()=>setTheme('obsidian')}><Moon size={16}/>Obsidian</button>
          </div>
        </div>
      </div>
      
      {/* Hero Card */}
      <header className="management-hero-card glass card">
        <div className="hero-info">
          <div className="row" style={{gap:10,marginBottom:6,flexWrap:'wrap'}}>
            <span className="eyebrow small"><ShieldCheck size={14}/> PRIVATE & SECURE PORTAL</span>
            {isSupabaseConfigured && <span className="realtime-chip">⚡ Realtime Database</span>}
            {user.role==='admin' && <span className="admin-chip">Administrator</span>}
          </div>
          <h1>{admin ? 'Admin review queue' : 'Complaint management'}</h1>
          <p className="muted">Private accounts · Human review · Application tracking</p>
        </div>
        <div className="hero-actions">
          {user.role==='admin' && (
            <GlassButton aria-pressed={admin && view==='dashboard'} onClick={()=>{
              const next=!admin;
              setAdmin(next);
              setView('dashboard');
              setSelected(null);
              load(next);
            }}>
              <Radio size={16}/> {admin ? 'Your complaints view' : 'Admin review queue'}
            </GlassButton>
          )}
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="glass alert-banner error" role="alert">
          <span>{error}</span>
          <button className="icon-close" onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button>
        </div>
      )}
      {message && (
        <div className="glass alert-banner success" role="status">
          <span>{message}</span>
          <button className="icon-close" onClick={()=>setMessage('')} aria-label="Dismiss message"><X size={16}/></button>
        </div>
      )}
      {toast && <GlassToast>{toast}</GlassToast>}

      {/* Create Complaint View */}
      {view==='create-complaint' && (
        <GlassCard style={{maxWidth:850,margin:'0 auto 24px'}}>
          <div className="row between" style={{marginBottom:18}}>
            <h2>New complaint</h2>
            <GlassButton onClick={()=>setView('dashboard')}><ArrowLeft size={16}/> Back</GlassButton>
          </div>
          <form onSubmit={e=>{e.preventDefault();handleSubmitComplaint();}}>
            <label className="field-label" htmlFor="comp-title">Complaint title / type</label>
            <GlassInput id="comp-title" value={title} onChange={e=>setTitle(e.target.value)} required placeholder="e.g. Synthetic UI verification, UPI / online fraud, Phishing"/>
            
            <label className="field-label" htmlFor="comp-narrative" style={{marginTop:16}}>What happened?</label>
            <textarea id="comp-narrative" className="glass input" value={narrative} onChange={e=>setNarrative(e.target.value)} rows={5} required placeholder="Describe what happened in detail..."/>
            
            <label className="check-label" style={{marginTop:18}}>
              <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
              <span>I consent to submit this complaint for human review and processing.</span>
            </label>

            <label className="check-label" style={{marginTop:10}}>
              <input type="checkbox" checked={aiConsent} onChange={e=>setAiConsent(e.target.checked)}/>
              <span>Optional: Allow advisory AI screening (plain text narrative only).</span>
            </label>

            <div className="row between" style={{marginTop:24}}>
              <GlassButton type="button" onClick={()=>setView('dashboard')}><ArrowLeft size={14}/> Cancel</GlassButton>
              <GlassButton className="primary" type="submit" disabled={busy||!consent||!title.trim()||!narrative.trim()}>{busy?'Submitting…':'Submit to portal'}</GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Complaint Detail View */}
      {view==='complaint-detail' && selected && (
        <GlassCard style={{maxWidth:950,margin:'0 auto 24px'}}>
          <div className="row between" style={{marginBottom:18,flexWrap:'wrap',gap:12}}>
            <h2>{selected.title}</h2>
            <GlassButton onClick={()=>{setView('dashboard');setSelected(null);}}> <ArrowLeft size={16}/> Back to dashboard</GlassButton>
          </div>
          <div className="row gap" style={{gap:14,flexWrap:'wrap',marginBottom:20}}>
            <span className={`status-badge status-${selected.status}`}>
              <span className="status-dot"/>
              {selected.status.replace('_',' ')}
            </span>
            <span className="muted small-text">Created: {new Date(selected.created).toLocaleString()}</span>
            <span className="muted small-text">Updated: {new Date(selected.updated).toLocaleString()}</span>
          </div>

          <details className="glass" open style={{padding:18,borderRadius:18,marginBottom:16}}>
            <summary style={{fontWeight:600,cursor:'pointer'}}>Original narrative</summary>
            <p style={{whiteSpace:'pre-wrap',marginTop:10,lineHeight:1.7}}>{selected.narrative}</p>
          </details>

          {selected.details && Object.keys(selected.details).length>0 && (
            <details className="glass" style={{padding:18,borderRadius:18,marginBottom:16}}>
              <summary style={{fontWeight:600,cursor:'pointer'}}>Details</summary>
              <pre style={{marginTop:10,overflowX:'auto',fontSize:13}}>{JSON.stringify(selected.details,null,2)}</pre>
            </details>
          )}

          <details className="glass" open style={{padding:18,borderRadius:18,marginBottom:16}}>
            <summary style={{fontWeight:600,cursor:'pointer'}}>Evidence files</summary>
            <div style={{marginTop:14}}>
              {selected.files&&selected.files.length>0?(
                <ul className="evidence-list" style={{display:'flex',flexDirection:'column',gap:8,listStyle:'none',padding:0}}>
                  {selected.files.map(f=>(
                    <li key={f.id} className="glass" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 18px',borderRadius:14}}>
                      <div className="evidence-info">
                        <strong>{f.name}</strong> <span className="muted small-text">({(f.size/1024).toFixed(0)} KB)</span>
                      </div>
                      <a className="glass button" href={`/api/complaints/${selected.id}/files/${f.id}`} download style={{padding:'6px 14px',fontSize:12}}>Download</a>
                    </li>
                  ))}
                </ul>
              ):(
                <p className="muted small-text">No files uploaded yet.</p>
              )}
              <div
                className={`awesome-file-dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                aria-label="Choose or drop supporting files"
              >
                <input
                  ref={fileInputRef}
                  id="upload-supporting-file"
                  type="file"
                  className="sr-only-file"
                  accept=".png,.jpeg,.jpg,.pdf"
                  onChange={e => {
                    handleFileUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <div className="upload-halo-badge">
                  <Upload size={24} />
                </div>
                <div className="upload-text-content">
                  <strong className="upload-main-title">
                    {busy ? 'Uploading file…' : 'Drop supporting files here'}
                  </strong>
                  <p className="upload-sub-text">
                    or click to browse from your device · PNG, JPEG, PDF up to 5 MB
                  </p>
                </div>
                <div className="upload-pill-btn">
                  <Paperclip size={14} />
                  <span>Choose File</span>
                </div>
              </div>
            </div>
          </details>

          <details className="glass" open style={{padding:18,borderRadius:18,marginBottom:16}}>
            <summary style={{fontWeight:600,cursor:'pointer'}}>Timeline</summary>
            <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:10}}>
              {selected.events?.map((e,i)=>(
                <div key={i} className="timeline-event glass">
                  <div className="event-header">
                    <span className="event-status">{e.status.replace('_',' ')}</span>
                    <span className="event-time muted">{new Date(e.created).toLocaleString()}</span>
                  </div>
                  <p className="event-note" style={{marginTop:6,fontSize:13,lineHeight:1.6}}>{e.note}</p>
                </div>
              ))}
            </div>
          </details>

          {/* Admin Decision Section */}
          {user.role==='admin' && (
            <div className="glass" style={{marginTop:18,padding:20,borderRadius:18}}>
              <h4>Admin decision</h4>
              <div style={{marginTop:10}}>
                <label className="field-label" htmlFor="admin-decision-reason" style={{display:'block',marginBottom:6}}>Decision reason or update (visible to applicant)</label>
                <textarea id="admin-decision-reason" value={note} onChange={e=>setNote(e.target.value)} className="glass input" rows={3} style={{width:'100%'}}/>
                
                <div style={{marginTop:14}}>
                  <label className="field-label" htmlFor="admin-next-status" style={{display:'block',marginBottom:6}}>Next status</label>
                  <select id="admin-next-status" value={status} onChange={e=>setStatus(e.target.value)} className="glass input" style={{width:'auto',minWidth:220}}>
                    <option value="">Select…</option>
                    {(transitions[selected.status]||[]).map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>

                <div style={{marginTop:16}}>
                  <GlassButton className="primary" disabled={!status||note.trim().length<5||busy} onClick={handleAdminDecision}>Save admin decision</GlassButton>
                </div>
              </div>

              {selected.ai_consent ? (
                <div style={{marginTop:18}}>
                  <GlassButton style={{marginTop:8}} onClick={async()=>{
                    try{
                      const ai=await api('/admin/complaints/'+selected.id+'/screen');
                      alert(JSON.stringify(ai,null,2));
                    }catch(e){
                      setError(e instanceof Error?e.message:'Screening failed');
                    }
                  }}>Run AI screening</GlassButton>
                </div>
              ):null}
            </div>
          )}

          {/* User Reply Section */}
          {user.role!=='admin' && selected.owner===user.id && (
            <div className="glass" style={{marginTop:18,padding:20,borderRadius:18}}>
              <h4>Reply to review team</h4>
              <label className="field-label" htmlFor="user-reply-text" style={{display:'block',marginTop:8}}>Message (5–2000 chars)</label>
              <textarea id="user-reply-text" value={note} onChange={e=>setNote(e.target.value)} className="glass input" rows={3} style={{width:'100%',marginTop:4}}/>
              <GlassButton className="primary" style={{marginTop:12}} disabled={note.trim().length<5||busy} onClick={handleReply}>Send reply</GlassButton>
            </div>
          )}
        </GlassCard>
      )}

      {/* Dashboard Complaints Table */}
      {view==='dashboard' && (
        <div className="glass complaints-card">
          <div className="card-header-row">
            <div>
              <h2>{admin ? 'Admin review queue' : 'Your complaints'}</h2>
              <p className="muted small-text">{admin ? 'All complaints across accounts. Select one to review.' : 'Click any row to view details, timeline, and reply.'}</p>
            </div>
            {!admin && (
              <GlassButton className="primary" onClick={()=>setView('create-complaint')}><Plus size={16}/> New complaint</GlassButton>
            )}
          </div>
          
          <div className="filter-chips-row">
            {['all','pending_review','changes_requested','approved','in_progress','closed','rejected'].map(f=>
              <GlassChip key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'All':f.replace('_',' ')}</GlassChip>
            )}
          </div>

          {items.length===0?(
            <div style={{textAlign:'center',padding:'48px 20px'}}>
              <FileText size={42} style={{opacity:0.35,marginBottom:12}}/>
              <p className="muted" style={{fontSize:15}}>{admin?'The review queue is currently clear.':'No complaints registered yet. Create your first complaint to get started.'}</p>
              {!admin && (
                <GlassButton className="primary" style={{marginTop:16}} onClick={()=>setView('create-complaint')}>
                  <Plus size={16}/> Start first complaint
                </GlassButton>
              )}
            </div>
          ):(
            <div className="table-wrap">
              <table className="complaints-table">
                <thead>
                  <tr>
                    <th>Title & Reference</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th style={{textAlign:'right'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(c=>(
                    <tr key={c.id} onClick={()=>open(c.id)} className="complaint-row">
                      <td data-label="Title">
                        <div className="title-cell">
                          <span className="case-icon"><FileText size={18}/></span>
                          <div>
                            <strong className="case-title">{c.title}</strong>
                            <small className="case-id">ID: {c.id.slice(0,8).toUpperCase()}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge status-${c.status}`}>
                          <span className="status-dot"/>
                          {c.status.replace('_',' ')}
                        </span>
                      </td>
                      <td data-label="Created">
                        <span className="date-text">{new Date(c.created).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</span>
                      </td>
                      <td data-label="Updated">
                        <span className="date-text">{new Date(c.updated).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</span>
                      </td>
                      <td data-label="Action" style={{textAlign:'right'}}>
                        <GlassButton className="table-action-btn" onClick={e=>{e.stopPropagation();open(c.id);}}>
                          {admin ? 'View application' : 'View details'} <ArrowRight size={14}/>
                        </GlassButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <BottomDock active="home" onChange={id=>navigateToVillage(id)} onSettings={()=>setModal('settings')} compact={false}/>

      {modal&&<GlassModal title={modal==='settings'?t('settings'):t('settings')} onClose={()=>setModal('')}>
        {modal==='settings'&&<div className="settings-body">
          <LanguagePicker value={i18n.language} onChange={lng=>i18n.changeLanguage(lng)}/>
          <p className="small-text muted">Core guidance is available in seven languages. Some supporting labels use English.</p>
          <div className="settings-row">
            <span>Appearance</span>
            <div className="glass theme-switch">
              <button aria-pressed={theme==='frost'} onClick={()=>setTheme('frost')}><Sun size={16}/>Frost</button>
              <button aria-pressed={theme==='obsidian'} onClick={()=>setTheme('obsidian')}><Moon size={16}/>Obsidian</button>
            </div>
          </div>
          {[['Larger text',large,setLarge],['High contrast',contrast,setContrast],['Reduce motion',motion,setMotion]].map(([label,value,setter])=>(
            <div className="settings-row" key={label as string}>
              <span>{label as string}</span>
              <button className="glass switch" role="switch" aria-checked={value as boolean} aria-label={label as string} onClick={()=>(setter as (v:boolean)=>void)(!value)}><span/></button>
            </div>
          ))}
          <GlassButton className="tilt-background-button" disabled={reduced} onClick={()=>window.dispatchEvent(new Event('twilight:enable-tilt'))}>Enable background tilt</GlassButton>
          <p className="small-text muted">Your device's reduced-motion and reduced-transparency preferences are also respected.</p>
        </div>}
      </GlassModal>}
    </main>
  );
}
