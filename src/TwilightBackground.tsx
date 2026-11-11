import {useEffect, useRef, useState} from 'react';
import './twilight-background.css';

type View = {theme: string; simple: boolean; reduced: boolean; focused: boolean; section: string};
const positions = Array.from({length: 18}, (_, index) => ({left: `${53 + (index * 19 % 43)}%`, top: `${5 + (index * 13 % 32)}%`}));
const sparks = Array.from({length: 8}, (_, index) => ({left: `${65 + (index * 11 % 30)}%`, top: `${52 + (index * 9 % 29)}%`, animationDelay: `${-index * 3}s`}));

function Landscape({theme}: {theme: string}) {
  return <div className={`twilight-landscape twilight-${theme}`}>
    <div className="twilight-sky"/>
    <div className="twilight-stars">{positions.map((style, index) => <i key={index} style={style}/>)}</div>
    <div className="twilight-aurora"><i/><i/></div>
    <div className="twilight-moon"/>
    <div className="twilight-mountain mountain-farthest"/>
    <div className="twilight-depth-mist mist-far"/>
    <div className="twilight-mountain mountain-far"/>
    <div className="twilight-depth-mist mist-middle"/>
    <div className="twilight-mountain mountain-middle"/>
    <div className="twilight-river"/>
    <div className="twilight-mountain mountain-near"/>
    <div className="twilight-lanterns">{sparks.map((style, index) => <i key={index} style={{left: style.left, top: `${68 + index % 3 * 4}%`}}/>)}</div>
    <div className="twilight-fog fog-back"/>
    <div className="twilight-fog fog-front"/>
    <div className="twilight-sparks">{sparks.map((style, index) => <i key={index} style={style}/>)}</div>
  </div>;
}

function hasLimitedGraphics() {
  const device = navigator as Navigator & {deviceMemory?: number; connection?: {saveData?: boolean}};
  if ((device.deviceMemory && device.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4 || device.connection?.saveData) return true;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!context) return true;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return false;
  } catch {return true;}
}

export default function TwilightBackground({renderTheme}: {renderTheme?: string}) {
  const host = useRef<HTMLDivElement>(null);
  const tiltRequested = useRef(false);
  const [limited] = useState(() => !renderTheme && hasLimitedGraphics());
  const [adaptive, setAdaptive] = useState(false);
  const [view, setView] = useState<View>(() => ({theme: renderTheme || document.documentElement.dataset.theme || 'obsidian', simple: false, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, focused: false, section: 'home'}));
  const still = !renderTheme && (limited || adaptive || view.simple || view.reduced);

  useEffect(() => {
    if (still || renderTheme) return;
    let frame = 0;
    let timeout = 0;
    const startSample = () => {
      if (document.hidden) return;
      const start = performance.now();
      let frames = 0;
      const sample = (time: number) => {
        if (document.hidden) return;
        frames += 1;
        if (time - start < 1800) frame = requestAnimationFrame(sample);
        else if (frames * 1000 / (time - start) < 40) setAdaptive(true);
      };
      frame = requestAnimationFrame(sample);
    };
    const scheduleSample = () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
      if (!document.hidden) timeout = window.setTimeout(startSample, 1500);
    };
    scheduleSample();
    document.addEventListener('visibilitychange', scheduleSample);
    return () => {clearTimeout(timeout); cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', scheduleSample);};
  }, [still, renderTheme]);

  useEffect(() => {
    if (renderTheme) return;
    const root = document.documentElement;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setView({theme: root.dataset.theme || 'obsidian', simple: root.dataset.worldSimple === 'true', reduced: motion.matches || root.dataset.motion === 'true', focused: root.dataset.worldView !== 'home' || location.hash === '#account', section: root.dataset.worldView || 'home'});
    const observer = new MutationObserver(update);
    observer.observe(root, {attributes: true, attributeFilter: ['data-theme', 'data-world-simple', 'data-world-view', 'data-motion']});
    motion.addEventListener('change', update);
    window.addEventListener('hashchange', update);
    update();
    return () => {observer.disconnect(); motion.removeEventListener('change', update); window.removeEventListener('hashchange', update);};
  }, [renderTheme]);

  useEffect(() => {
    const element = host.current;
    if (!element || renderTheme) return;
    if (still) {
      const explain = () => window.dispatchEvent(new CustomEvent('twilight:feedback', {detail: 'A static wallpaper is active for your motion, device or simple-view settings.'}));
      window.addEventListener('twilight:enable-tilt', explain);
      return () => window.removeEventListener('twilight:enable-tilt', explain);
    }
    let frame = 0;
    let x = 0, y = 0, targetX = 0, targetY = 0;
    const section = document.documentElement.dataset.worldView || 'home';
    const cameraOffset = ['home', 'assistant', 'evidence', 'review', 'status', 'help'].indexOf(section) * 1.4;
    const animate = () => {
      x += (targetX + cameraOffset - x) * .075;
      y += (targetY - y) * .075;
      element.style.setProperty('--valley-x', `${x.toFixed(2)}px`);
      element.style.setProperty('--valley-y', `${y.toFixed(2)}px`);
      if (Math.abs(targetX + cameraOffset - x) + Math.abs(targetY - y) > .05) frame = requestAnimationFrame(animate);
      else frame = 0;
    };
    const schedule = () => {if (!frame && !document.hidden) frame = requestAnimationFrame(animate);};
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      targetX = (event.clientX / innerWidth - .5) * 20;
      targetY = (event.clientY / innerHeight - .5) * 12;
      schedule();
    };
    const reset = () => {targetX = 0; targetY = 0; schedule();};
    const tilt = (event: DeviceOrientationEvent) => {
      targetX = Math.max(-10, Math.min(10, (event.gamma || 0) / 3));
      targetY = Math.max(-6, Math.min(6, ((event.beta || 30) - 30) / 6));
      schedule();
    };
    let tiltEnabled = false;
    const enableTilt = async () => {
      const orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {requestPermission?: () => Promise<string>};
      let message = 'Device tilt is unavailable on this device.';
      try {
        if (orientation && (!orientation.requestPermission || await orientation.requestPermission() === 'granted')) {
          if (!tiltEnabled) window.addEventListener('deviceorientation', tilt, {passive: true});
          tiltEnabled = true;
          tiltRequested.current = true;
          message = 'Background tilt enabled where your device provides motion data.';
        }
      } catch {message = 'Motion permission was not granted. Pointer parallax is still available.';}
      window.dispatchEvent(new CustomEvent('twilight:feedback', {detail: message}));
    };
    const visibility = () => {element.dataset.paused = String(document.hidden); if (document.hidden) {cancelAnimationFrame(frame); frame = 0;} else schedule();};
    window.addEventListener('pointermove', move, {passive: true});
    window.addEventListener('blur', reset);
    window.addEventListener('twilight:enable-tilt', enableTilt);
    if (tiltRequested.current) {window.addEventListener('deviceorientation', tilt, {passive: true}); tiltEnabled = true;}
    document.addEventListener('visibilitychange', visibility);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', reset);
      window.removeEventListener('deviceorientation', tilt);
      window.removeEventListener('twilight:enable-tilt', enableTilt);
      document.removeEventListener('visibilitychange', visibility);
      element.style.setProperty('--valley-x', '0px');
      element.style.setProperty('--valley-y', '0px');
    };
  }, [still, view.section, renderTheme]);

  return <div ref={host} className="twilight-background" data-theme={view.theme} data-static={still} data-low-power={limited || adaptive} data-focused={view.focused} data-render={Boolean(renderTheme)} aria-hidden="true">
    {['obsidian', 'frost'].map(theme => <div className={`twilight-variant variant-${theme}`} key={theme}>
      {still ? <picture><source media="(max-width: 700px)" srcSet={`/wallpapers/twilight-${theme}-mobile.webp`}/><img src={`/wallpapers/twilight-${theme}-desktop.webp`} alt="" decoding="async" loading="eager" onError={event => {event.currentTarget.style.visibility = 'hidden';}}/></picture> : <Landscape theme={theme}/>}
    </div>)}
    <div className="twilight-text-scrim"/>
    <div className="twilight-vignette"/>
  </div>;
}
