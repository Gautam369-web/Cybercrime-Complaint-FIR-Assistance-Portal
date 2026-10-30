import {useEffect} from 'react';

/** Pointer coordinates stay outside React state so the scene and forms do not rerender. */
export default function LensEffects(){
 useEffect(()=>{
  let frame=0;
  let hovered:HTMLElement[]=[];
  let pointer:{x:number;y:number;target:Element}|null=null;
  const clear=()=>{hovered.forEach(el=>el.removeAttribute('data-lens'));hovered=[];};
  const update=()=>{
   frame=0;if(!pointer)return;
   const next:HTMLElement[]=[];let node:Element|null=pointer.target;
   while(node){if(node instanceof HTMLElement&&node.matches('.glass.button,.glass.card,.glass.chip,.glass.dock,.glass.chat-bubble'))next.push(node);node=node.parentElement;}
   hovered.filter(el=>!next.includes(el)).forEach(el=>el.removeAttribute('data-lens'));
   next.forEach(el=>{const r=el.getBoundingClientRect();el.style.setProperty('--lens-x',`${pointer!.x-r.left}px`);el.style.setProperty('--lens-y',`${pointer!.y-r.top}px`);el.dataset.lens='true';});hovered=next;
  };
  const move=(event:PointerEvent)=>{if(event.pointerType==='touch')return;pointer={x:event.clientX,y:event.clientY,target:event.target as Element};if(!frame)frame=requestAnimationFrame(update);};
  document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',clear);window.addEventListener('blur',clear);
  return()=>{cancelAnimationFrame(frame);clear();document.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',clear);window.removeEventListener('blur',clear);};
 },[]);
 return null;
}
