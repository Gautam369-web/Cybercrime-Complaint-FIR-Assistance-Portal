import {useEffect,useRef,type ButtonHTMLAttributes,type HTMLAttributes,type InputHTMLAttributes,type ReactNode} from 'react';
import {X,Home,MessageCircle,FolderOpen,FileCheck,Radio,LifeBuoy,Settings} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {languages} from './i18n';
export function LanguagePicker({value,onChange}:{value:string;onChange:(language:string)=>void}){
 return <fieldset className="settings-languages"><legend>Language</legend><div className="settings-language-grid">{languages.map(([code,name])=><label className="glass language-choice" key={code}><input type="radio" name="settings-language" value={code} checked={value===code} onChange={()=>onChange(code)}/><span lang={code}>{name}</span><span className="language-selected" aria-hidden="true">{value===code?'✓':''}</span></label>)}</div></fieldset>;
}
export function GlassButton({className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button className={`glass button ${className}`} {...props}/>;}
export function GlassCard({className='',...props}:HTMLAttributes<HTMLDivElement>){return <div className={`glass card ${className}`} {...props}/>;}
export function GlassInput({className='',...props}:InputHTMLAttributes<HTMLInputElement>){return <input className={`glass input ${className}`} {...props}/>;}
export function GlassChip({className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button className={`glass chip ${className}`} {...props}/>;}
export function GlassToast({children}:{children:ReactNode}){return <div className="glass toast" role="status">{children}</div>;}
export function GlassModal({title,children,onClose}:{title:string,children:ReactNode,onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null); const close=useRef(onClose); close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement;const dialog=ref.current;const root=document.documentElement;const oldOverflow=root.style.overflow;const oldBodyOverflow=document.body.style.overflow;root.style.overflow='hidden';document.body.style.overflow='hidden';dialog?.showModal();return()=>{dialog?.close();root.style.overflow=oldOverflow;document.body.style.overflow=oldBodyOverflow;previous?.focus({preventScroll:true});};},[]);
 return <dialog className="glass modal" ref={ref} aria-labelledby="modal-title" onCancel={e=>{e.preventDefault();close.current();}}><div className="row between"><h2 id="modal-title">{title}</h2><GlassButton className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></GlassButton></div>{children}</dialog>;
}
export const nav=[{id:'home',icon:Home},{id:'assistant',icon:MessageCircle},{id:'evidence',icon:FolderOpen},{id:'review',icon:FileCheck},{id:'status',icon:Radio},{id:'help',icon:LifeBuoy}];
export function BottomDock({active,onChange,onSettings,compact}:{active:string,onChange:(id:string)=>void,onSettings:()=>void,compact:boolean}){
 const {t}=useTranslation();const index=nav.findIndex(n=>n.id===active);
 return <div className={`dock-wrap ${compact?'compact':''}`}><div className="glass dock" role="tablist" aria-label="Village navigation" onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?5:(index+(e.key==='ArrowRight'?1:-1)+6)%6;onChange(nav[next].id);document.getElementById('tab-'+nav[next].id)?.focus();}}><div className="dock-thumb" style={{transform:`translateX(${index*100}%)`}}/>{nav.map(({id,icon:Icon})=><button key={id} id={'tab-'+id} role="tab" aria-selected={active===id} aria-controls={'panel-'+id} tabIndex={active===id?0:-1} onClick={()=>onChange(id)} aria-label={t(id)}><Icon size={21} aria-hidden="true"/><span>{t(id)}</span></button>)}</div><GlassButton className="settings-toggle icon-button" onClick={onSettings} aria-label="Settings"><Settings size={21}/></GlassButton></div>;
}
