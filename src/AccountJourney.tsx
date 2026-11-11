import {lazy, Suspense, useEffect, useState} from 'react';
import {ArrowLeft, ArrowRight, FileText, FolderOpen, MessageCircle, Radio, ShieldCheck} from 'lucide-react';
import {GlassButton} from './components';

const VillageScene = lazy(() => import('./VillageScene'));
const steps = [
  {id: 'assistant', title: 'Tell your story', icon: MessageCircle, description: 'Describe what happened in your own words. The guide helps you collect the dates, transaction details and other information you remember.'},
  {id: 'evidence', title: 'Keep the evidence', icon: FolderOpen, description: 'Attach screenshots, receipts and messages to your application. Keep the original files so you can provide them to the authorities.'},
  {id: 'review', title: 'Review your complaint', icon: FileText, description: 'Check your details before sending them to the portal’s review team. An administrator can approve the application or ask you for more information.'},
  {id: 'status', title: 'Follow each update', icon: Radio, description: 'Sign in to see the status of your application, read the review team’s messages and reply when more details are needed.'},
];

export default function AccountJourney({compact = false}: {compact?: boolean}) {
  const [step, setStep] = useState(0);
  const [simple, setSimple] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'true');
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches || document.documentElement.dataset.motion === 'true');
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-motion']});
    query.addEventListener('change', update);
    return () => {observer.disconnect(); query.removeEventListener('change', update);};
  }, []);
  const current = steps[step];
  const Icon = current.icon;
  return <section className={`account-journey ${compact ? 'journey-compact' : ''}`} aria-label="How your complaint moves through the portal">
    <div className="journey-heading"><span className="eyebrow">A little guidance, at every step</span><h2>Understand the process.<br/>Take your next step.</h2><p className="muted">Explore how your story becomes a complaint you can review and track.</p></div>
    <div className="account-scene">
      {simple ? <div className="journey-flat"><Icon size={48}/><span>{current.title}</span><div className="flat-path">{steps.map((item, index) => <span key={item.id} aria-current={step === index ? 'step' : undefined}>{index + 1}</span>)}</div></div> : <Suspense fallback={<div className="journey-flat" role="status">Opening the village…</div>}><VillageScene active={current.id} reducedMotion={reduced} onNavigate={id => {const next = steps.findIndex(item => item.id === id); if (next >= 0) setStep(next);}} onError={() => setSimple(true)}/></Suspense>}
      <GlassButton className="journey-view-toggle" onClick={() => setSimple(!simple)}>{simple ? 'Explore in 3D' : 'Simple view'}</GlassButton>
    </div>
    <div className="journey-step-tabs" aria-label="Explore the complaint process">{steps.map((item, index) => <button key={item.id} className="glass" aria-pressed={step === index} onClick={() => setStep(index)}><item.icon size={17}/><span>{item.title}</span></button>)}</div>
    <div className="journey-explanation" aria-live="polite"><div><h3>{current.title}</h3><p>{current.description}</p></div><div className="row"><GlassButton className="icon-button" aria-label="Previous explanation" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={17}/></GlassButton><GlassButton className="icon-button" aria-label="Next explanation" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}><ArrowRight size={17}/></GlassButton></div></div>
    <details className="glass fir-explainer" open={!compact}><summary><ShieldCheck size={20}/><span>What is an FIR?</span></summary><p><strong>FIR means First Information Report.</strong> It is the initial report recorded by the police when information discloses a cognizable offence—an offence the police can investigate without a magistrate’s order.</p><p>This portal helps you prepare a complaint and follow its review here. Official reporting and any FIR registration are handled by the authorities.</p><a href="https://jhpolice.gov.in/FIR" target="_blank" rel="noreferrer">Read the police guide to FIRs ↗</a><a href="https://cybercrime.gov.in/" target="_blank" rel="noreferrer">Visit the official cybercrime reporting portal ↗</a></details>
  </section>;
}
