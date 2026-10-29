import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// The vendored factories are the actual MIT-licensed 3dviz-pro-max kit API.
// @ts-ignore — upstream provides JavaScript factories without declarations.
import { create as cottage } from './vendor/3dviz/buildings/timber-cottage.js';
// @ts-ignore
import { create as longHall } from './vendor/3dviz/buildings/long-hall.js';
// @ts-ignore
import { create as tower } from './vendor/3dviz/buildings/round-tower.js';
// @ts-ignore
import { create as bridge } from './vendor/3dviz/buildings/stone-bridge.js';
// @ts-ignore
import { create as lantern } from './vendor/3dviz/props/lantern-post.js';

type Props = { active: string; onNavigate: (id: string) => void; reducedMotion: boolean; onReady?: () => void; onError?: () => void };
type Landmark = { id: string; name: string; purpose: string; position: [number, number, number]; height: number };
const landmarks: Landmark[] = [
  { id: 'home', name: 'Town Hall', purpose: 'Begin here', position: [0, 0, -3.8], height: 6.5 },
  { id: 'assistant', name: 'Scribe’s Tower', purpose: 'Tell your story', position: [-8, 0, -5.5], height: 9.8 },
  { id: 'evidence', name: 'Evidence Barn', purpose: 'Keep it together', position: [8.3, 0, 1.2], height: 5.7 },
  { id: 'review', name: 'Library of Records', purpose: 'Review your draft', position: [-7.8, 0, 3.8], height: 5.7 },
  { id: 'status', name: 'Watchtower', purpose: 'Your next steps', position: [7, 0, -8.6], height: 9.2 },
  { id: 'help', name: 'Guardian’s Hut', purpose: 'A little support', position: [4.3, 0, 8.4], height: 4.6 },
];

/** A deterministic illustrative diorama. No victim data is passed to this component. */
export default function VillageScene({ active, onNavigate, reducedMotion, onReady, onError }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const labelLayer = useRef<HTMLDivElement>(null);
  const runtime = useRef<{ select: (id: string) => void; reduce: (value: boolean) => void } | null>(null);
  const callbacks = useRef({ onNavigate, onReady, onError });
  callbacks.current = { onNavigate, onReady, onError };
  const initial = useRef({ active, reducedMotion });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { callbacks.current.onError?.(); return; }
    let disposed = false;
    let raf = 0;
    let reduced = initial.current.reducedMotion;
    let selected = initial.current.active;
    let elapsed = 0;
    let previous = performance.now();
    let changed = true;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#263d49', 0.009);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;';
    el.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 160);
    const homePosition = new THREE.Vector3(31, 30, 39);
    const targetPosition = homePosition.clone();
    const targetLook = new THREE.Vector3(0, 1, 0);
    const currentLook = targetLook.clone();
    camera.position.copy(homePosition);
    camera.lookAt(currentLook);
    scene.add(new THREE.HemisphereLight('#9cb7d4', '#334c46', 1.5));
    const key = new THREE.DirectionalLight('#ffcf9a', 1.9);
    key.position.set(-14, 30, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 80 });
    key.shadow.normalBias = 0.08;
    key.shadow.bias = -0.0002;
    scene.add(key);
    const rim = new THREE.DirectionalLight('#719bc8', 1.5);
    rim.position.set(12, 15, -18);
    scene.add(rim);

    const material = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.88, ...extra });
    const green = material('#4c6e66');
    const darkGreen = material('#31584f');
    const rock = material('#3b4c51');
    const pathMat = material('#b4ab8e');
    const wood = material('#6f5946');
    const stone = material('#a1b0a7');
    const waterMat = material('#45858a', { roughness: 0.25, metalness: 0.35 });
    const glowMat = material('#ffdfa1', { emissive: '#ffbd67', emissiveIntensity: 2.4 });
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, group: THREE.Object3D = scene) => {
      const item = new THREE.Mesh(geo, mat);
      item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true; group.add(item); return item;
    };
    let seed = 942;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    // The island is a slightly irregular, hand-cut slab, with exposed facets below its turf.
    const islandGeo = new THREE.CylinderGeometry(17.7, 15.7, 3.1, 40, 2, false);
    const ip = islandGeo.attributes.position;
    for (let i = 0; i < ip.count; i++) {
      const x = ip.getX(i), z = ip.getZ(i), a = Math.atan2(z, x);
      const factor = 1 + Math.sin(a * 5) * .027 + Math.cos(a * 7) * .035;
      ip.setX(i, x * factor); ip.setZ(i, z * factor);
    }
    islandGeo.computeVertexNormals();
    mesh(islandGeo, rock, 0, -1.65, 0);
    mesh(new THREE.CylinderGeometry(17.8, 17.6, .3, 40), green, 0, -.05, 0);
    const sea = mesh(new THREE.CircleGeometry(23, 64), new THREE.MeshBasicMaterial({ color: '#50747d', transparent: true, opacity: .12, depthWrite: false }), 0, -3.3, 0);
    sea.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 27; i++) {
      const angle = i * Math.PI * 2 / 27, r = 17.2 + rand() * .7;
      const boulder = mesh(new THREE.DodecahedronGeometry(.7 + rand() * .8, 0), rock, Math.cos(angle) * r, -1.1 + rand() * .3, Math.sin(angle) * r);
      boulder.scale.set(1, 1.3 + rand(), .8); boulder.rotation.set(rand(), rand(), rand());
    }

    function ribbon(points: [number, number, number][], width: number, mat: THREE.Material) {
      const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
      const samples = curve.getPoints(64), vertices: number[] = [], indices: number[] = [];
      samples.forEach((p, i) => {
        const tangent = curve.getTangent(i / 64); const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
        vertices.push(p.x + normal.x, p.y, p.z + normal.z, p.x - normal.x, p.y, p.z - normal.z);
        if (i < 64) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
      const obj = mesh(geo, mat, 0, 0, 0); obj.material.side = THREE.DoubleSide; return curve;
    }
    ribbon([[-16, .14, 7], [-10, .14, 9.3], [-3, .14, 10.6], [3, .14, 12.1], [11.5, .14, 12]], 2.0, waterMat);
    ribbon([[-11, .17, -6], [-8, .17, -.4], [-2, .17, 2.6], [3, .17, 3.2], [9, .17, 4.6]], 1.35, pathMat);
    ribbon([[0, .18, -1], [.2, .18, 2.2], [-1.6, .18, 5.4], [-3, .18, 10.6], [-3.8, .18, 14]], 1.5, pathMat);
    ribbon([[7, .18, -6.5], [6, .18, -2.4], [3, .18, 3.2], [5, .18, 6.8]], 1.25, pathMat);
    // Paving stones give the paths a tactile, approachable scale.
    const paving = new THREE.InstancedMesh(new THREE.BoxGeometry(.45, .035, .31), stone, 36);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 36; i++) { const t = i / 35; dummy.position.set(-8 + t * 16, .21, 1.3 + Math.sin(t * Math.PI * 1.3) * 1.8); dummy.rotation.y = Math.sin(t) * .4; dummy.updateMatrix(); paving.setMatrixAt(i, dummy.matrix); }
    paving.receiveShadow = true; scene.add(paving);

    // Collapse static kit parts by material: detailed architecture without thousands of draw calls.
    function compact(source: THREE.Group, id?: string) {
      source.updateMatrixWorld(true);
      const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>();
      source.traverse(obj => {
        if (!(obj instanceof THREE.Mesh) || Array.isArray(obj.material)) return;
        const put = (matrix: THREE.Matrix4, color?: THREE.Color) => {
          const old = obj.material as THREE.MeshStandardMaterial;
          const hex = old.color?.getHexString() ?? 'ffffff';
          // Quantize tiny per-tile tint jitter so adjacent courses share one draw call.
          const tint = color?.clone();
          if(tint){tint.r=Math.round(tint.r*24)/24;tint.g=Math.round(tint.g*24)/24;tint.b=Math.round(tint.b*24)/24;}
          const code = hex + (tint?.getHexString() ?? '');
          if (!buckets.has(code)) {
            const mat = old.clone();
            if (['7d5348', '8d5a4a', '4f545a'].includes(hex)) mat.color.set('#365d62');
            if (['2b353b', '2f3a3f', '141210'].includes(hex)) { mat.color.set('#ffcc88'); mat.emissive.set('#ffae58'); mat.emissiveIntensity = 1.5; }
            if (hex === '8c3f45') mat.color.set('#d8b982');
            if (tint) mat.color.multiply(tint);
            buckets.set(code, { mat, geos: [] });
          }
          let geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
          for (const attr of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(attr)) geo.deleteAttribute(attr);
          if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
          geo.applyMatrix4(matrix); buckets.get(code)!.geos.push(geo);
        };
        if (obj instanceof THREE.InstancedMesh) {
          for (let i = 0; i < obj.count; i++) { const m = new THREE.Matrix4(); obj.getMatrixAt(i, m); const c = new THREE.Color(); if (obj.instanceColor) obj.getColorAt(i, c); put(obj.matrixWorld.clone().multiply(m), obj.instanceColor ? c : undefined); }
        } else put(obj.matrixWorld);
      });
      const result = new THREE.Group();
      buckets.forEach(({ mat, geos }) => {
        const joined = mergeGeometries(geos, false);
        if (joined) { const part = new THREE.Mesh(joined, mat); part.castShadow = true; part.receiveShadow = true; part.userData.navigationId = id; result.add(part); }
        geos.forEach(g => g.dispose());
      });
      return result;
    }
    const clickable: THREE.Object3D[] = [];
    for (const [i, place] of landmarks.entries()) {
      let built: { group: THREE.Group };
      if (place.id === 'assistant' || place.id === 'status') built = tower({ height: place.id === 'assistant' ? 6.8 : 6.3, baseRadius: 1.5, topRadius: 1.16, merlons: 12, seed: 13 + i });
      else if (place.id === 'home') built = longHall({ width: 7.6, depth: 4.1, wallHeight: 3, bayCount: 4, roofPitchDeg: 43, seed: 6 });
      else built = cottage({ width: place.id === 'evidence' ? 5.2 : 4.5, depth: 3.9, storeys: 1, roofPitchDeg: place.id === 'help' ? 43 : 49, seed: 17 + i });
      const building = compact(built.group, place.id);
      building.position.set(...place.position);
      building.position.y = .2;
      if (place.id === 'evidence') building.rotation.y = -.24;
      if (place.id === 'review') building.rotation.y = .22;
      scene.add(building); clickable.push(building);
      // Warm light belongs to the doorway and washes the path immediately in front.
      if(place.id==='home'||place.id==='help'){
        const lamp = new THREE.PointLight('#ffc17f', 8, 5.5, 2);
        lamp.position.set(place.position[0], 1.7, place.position[2] + 2.5); scene.add(lamp);
      }
    }
    // Town Hall bell cupola makes the welcome building readable as a civic landmark.
    const cupola = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.15, 1.25, 1.15), stone, 0, 5.2, -3.8, cupola);
    mesh(new THREE.ConeGeometry(1.05, 1.25, 4), material('#386368'), 0, 6.45, -3.8, cupola).rotation.y = Math.PI / 4;
    mesh(new THREE.SphereGeometry(.27, 12, 8), glowMat, 0, 5.4, -3.19, cupola);
    cupola.userData.navigationId = 'home'; cupola.traverse(obj => { obj.userData.navigationId = 'home'; }); scene.add(cupola); clickable.push(cupola);
    const stoneBridge = compact(bridge({ span: 3.6, width: 2.3, rise: .65, springHeight: .1, parapetHeight: .65, approach: 1.1, seed: 22 }).group, 'review');
    stoneBridge.position.set(-3, .12, 10.6); stoneBridge.rotation.y = Math.PI / 2; scene.add(stoneBridge); clickable.push(stoneBridge);

    // Fountain Square: three sculpted tiers and a visible still pool, not a simulated fluid.
    const fountain = new THREE.Group(); fountain.position.set(.1, .2, 3.1);
    mesh(new THREE.CylinderGeometry(1.65, 1.85, .3, 12), stone, 0, .15, 0, fountain);
    mesh(new THREE.TorusGeometry(1.43, .18, 5, 16), stone, 0, .42, 0, fountain).rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(1.4, 1.4, .08, 20), waterMat, 0, .4, 0, fountain);
    mesh(new THREE.CylinderGeometry(.22, .38, 1.2, 8), stone, 0, 1, 0, fountain);
    mesh(new THREE.CylinderGeometry(.9, .6, .22, 12), stone, 0, 1.6, 0, fountain);
    mesh(new THREE.CylinderGeometry(.77, .77, .03, 16), waterMat, 0, 1.73, 0, fountain);
    mesh(new THREE.SphereGeometry(.22, 8, 6), glowMat, 0, 2.02, 0, fountain);
    fountain.traverse(obj => { obj.userData.navigationId = 'help'; }); scene.add(fountain); clickable.push(fountain);

    // Low-poly trees have layered crowns, varying silhouettes, and explicit roots.
    const trees: [number, number, number][] = [[-13,-7,4],[-13,-2,3.8],[-13,3,3.5],[-10,-11,4.4],[-5,-12,3.7],[0,-12.8,4.7],[3,-13.2,3.6],[11,-9,4.4],[13,-5,4.5],[13,0,3.7],[11,6,4],[8,11,3.3],[-11,11,2.8],[-7,13,3],[-14,6,3.6],[-2,-11,3.1]];
    const treeGeo = new THREE.ConeGeometry(1.3, 2.7, 7);
    const treeInstances = new THREE.InstancedMesh(treeGeo, darkGreen, trees.length * 3);
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .23, 1.7, 6), wood, trees.length);
    let treeIndex = 0;
    trees.forEach(([x,z,h], i) => {
      dummy.position.set(x, .9, z); dummy.rotation.set(0,0,0); dummy.scale.set(1,1,1); dummy.updateMatrix(); trunks.setMatrixAt(i,dummy.matrix);
      for (let tier = 0; tier < 3; tier++) { dummy.position.set(x, h * (.4 + tier * .22), z); dummy.rotation.y = i * .6; dummy.scale.setScalar((h / 4) * (1 - tier * .18)); dummy.updateMatrix(); treeInstances.setMatrixAt(treeIndex,dummy.matrix); treeInstances.setColorAt(treeIndex++, new THREE.Color().setHSL(.43 + rand() * .035, .24, .65 + rand() * .16)); }
    });
    treeInstances.castShadow = true; trunks.castShadow = true; scene.add(treeInstances, trunks);
    const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.55, 0), green, 38);
    for(let i=0;i<38;i++){const a=rand()*Math.PI*2,r=12+rand()*3.5;dummy.position.set(Math.cos(a)*r,.4,Math.sin(a)*r);dummy.rotation.set(rand(),rand(),rand());dummy.scale.set(1+rand(),.7+rand()*.6,1);dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);} scene.add(shrubs);
    for(const [i, p] of [[-5.4,1], [4.4,1], [9,-3.2], [-6.5,-1.5], [-3,7.5], [7,6.6]].entries()) {
      const post = compact(lantern({height:2.3,headSize:.4,seed:i+9}).group); post.position.set(p[0],.16,p[1]); scene.add(post);
    }

    // Owl: paired wings hinge in a slow glide; fox: short legs and a white-tipped tail.
    const owl = new THREE.Group();
    const owlBody = material('#d3c7af'); const owlWing = material('#7c8179');
    mesh(new THREE.SphereGeometry(.25,8,6),owlBody,0,0,0,owl).scale.set(.9,1.2,1.2);
    const wings: THREE.Group[] = [];
    for(const side of [-1,1]){const wing=new THREE.Group();wing.position.x=side*.18;owl.add(wing);const w=mesh(new THREE.ConeGeometry(.2,1,3),owlWing,side*.4,0,0,wing);w.rotation.z=side*Math.PI/2;w.scale.z=.3;wings.push(wing);mesh(new THREE.SphereGeometry(.055,6,5),glowMat,side*.1,.07,.23,owl);}
    owl.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.castShadow=false;});scene.add(owl);
    const fox = new THREE.Group();const fur=material('#be7849'), cream=material('#e7d5b5');
    mesh(new THREE.IcosahedronGeometry(.42,0),fur,0,.55,0,fox).scale.set(.65,.85,1.4);
    mesh(new THREE.IcosahedronGeometry(.25,0),fur,0,.83,.48,fox);
    for(const s of [-1,1]){mesh(new THREE.ConeGeometry(.11,.3,3),fur,s*.15,1.08,.42,fox);mesh(new THREE.SphereGeometry(.035,5,4),material('#293430'),s*.15,.87,.65,fox);}
    const tail=mesh(new THREE.ConeGeometry(.19,.85,6),fur,0,.55,-.75,fox);tail.rotation.x=-1;
    const tailTip=mesh(new THREE.ConeGeometry(.13,.3,6),cream,0,.35,-1.08,fox);tailTip.rotation.x=-1;
    const legs:THREE.Mesh[]=[];for(const x of [-.19,.19])for(const z of [-.25,.32]) legs.push(mesh(new THREE.CylinderGeometry(.07,.055,.4,5),fur,x,.24,z,fox));fox.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.castShadow=false;});scene.add(fox);
    const particles = new Float32Array(22*3); const particleBase: number[]=[];
    for(let i=0;i<22;i++) particleBase.push(rand()*Math.PI*2,1.5+rand()*2.4,.6+rand()*1.8);
    const fireGeometry=new THREE.BufferGeometry();fireGeometry.setAttribute('position',new THREE.BufferAttribute(particles,3));
    const fireflies=new THREE.Points(fireGeometry,new THREE.PointsMaterial({color:'#ffe8aa',size:.11,transparent:true,opacity:.9,depthWrite:false}));scene.add(fireflies);
    const ring=mesh(new THREE.RingGeometry(2.5,2.58,64),new THREE.MeshBasicMaterial({color:'#ffe2aa',transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}),0,.25,0);ring.rotation.x=-Math.PI/2;

    const labels = new Map<string,HTMLButtonElement>();
    labelLayer.current?.querySelectorAll<HTMLButtonElement>('[data-landmark]').forEach(label=>labels.set(label.dataset.landmark!,label));
    const projected = new THREE.Vector3();
    function updateLabels(){
      landmarks.forEach(place=>{const label=labels.get(place.id);if(!label)return;projected.set(place.position[0],place.height,place.position[2]).project(camera);const x=(projected.x*.5+.5)*el!.clientWidth,y=(-projected.y*.5+.5)*el!.clientHeight;label.style.transform=`translate(-50%,-100%) translate(${x}px,${y}px)`;label.style.opacity=projected.z>1?'0':'1';label.dataset.active=String(place.id===selected);});
    }
    function select(id:string){
      selected=id; const place=landmarks.find(p=>p.id===id);
      if(!place||id==='home'){targetPosition.copy(homePosition);targetLook.set(0,1,0);ring.visible=false;}
      else{targetLook.set(place.position[0]*.45,2,place.position[2]*.45);targetPosition.copy(homePosition).multiplyScalar(.86).add(targetLook);ring.position.set(place.position[0],.25,place.position[2]);ring.visible=true;}
      if(reduced){camera.position.copy(targetPosition);currentLook.copy(targetLook);camera.lookAt(currentLook);}changed=true;
    }
    runtime.current={select,reduce(value){reduced=value;changed=true;}};select(selected);
    function resize(){const w=el!.clientWidth,h=el!.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<1?47:37;camera.updateProjectionMatrix();changed=true;}
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let hovered:string|undefined;
    let dragStart:number|null=null,dragLast=0,dragDistance=0;
    function hit(event:PointerEvent){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(clickable,true)[0]?.object.userData.navigationId as string|undefined;}
    const down=(event:PointerEvent)=>{if(event.pointerType!=='mouse'||event.button!==0)return;dragStart=event.clientX;dragLast=event.clientX;dragDistance=0;renderer.domElement.setPointerCapture(event.pointerId);};
    const move=(event:PointerEvent)=>{if(dragStart!==null){const dx=event.clientX-dragLast;dragLast=event.clientX;dragDistance+=Math.abs(dx);if(dragDistance>5){const offset=targetPosition.clone().sub(targetLook);offset.applyAxisAngle(new THREE.Vector3(0,1,0),-dx*.004);targetPosition.copy(targetLook).add(offset);changed=true;renderer.domElement.style.cursor='grabbing';return;}}hovered=hit(event);renderer.domElement.style.cursor=hovered?'pointer':'grab';labels.forEach((label,id)=>label.dataset.hover=String(id===hovered));};
    const click=(event:PointerEvent)=>{dragStart=null;if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);if(dragDistance>5){dragDistance=0;return;}const id=hit(event);if(id)callbacks.current.onNavigate(id);};
    const cancel=()=>{dragStart=null;dragDistance=0;};
    const contextLost=(event:Event)=>{event.preventDefault();callbacks.current.onError?.();};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',click);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('webglcontextlost',contextLost);
    function updateCreatures(time:number){
      const angle=time*.12;owl.position.set(Math.cos(angle)*8,8.4+Math.sin(angle*2)*.6,Math.sin(angle)*5-3);owl.rotation.y=-angle;wings.forEach((wing,i)=>wing.rotation.z=Math.sin(time*1.6)*(i?-.14:.14));
      const foxAngle=time*.12;fox.position.set(-1+Math.cos(foxAngle)*3.2,.18,4.8+Math.sin(foxAngle)*1.5);fox.rotation.y=Math.atan2(-Math.sin(foxAngle)*3.2,Math.cos(foxAngle)*1.5);legs.forEach((leg,i)=>leg.rotation.x=Math.sin(time*4+(i===0||i===3?0:Math.PI))*.28);
      const focus=landmarks.find(p=>p.id===selected)?.position??[0,0,-3.8];
      for(let i=0;i<22;i++){const a=particleBase[i*3]+time*.15,r=particleBase[i*3+1];particles[i*3]=focus[0]+Math.cos(a)*r;particles[i*3+1]=particleBase[i*3+2]+Math.sin(time*.7+i)*.25;particles[i*3+2]=focus[2]+Math.sin(a)*r;}fireGeometry.attributes.position.needsUpdate=true;
    }
    updateCreatures(0);
    function frame(now:number){
      if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
      if(document.hidden)return;
      const flying=camera.position.distanceToSquared(targetPosition)>.0001||currentLook.distanceToSquared(targetLook)>.0001;
      if(!reduced){elapsed+=dt;updateCreatures(elapsed);}
      if(flying){const ease=reduced?1:1-Math.exp(-dt*3.5);camera.position.lerp(targetPosition,ease);currentLook.lerp(targetLook,ease);camera.lookAt(currentLook);}
      if(!reduced||flying||changed){renderer.render(scene,camera);updateLabels();changed=false;}
    }
    renderer.render(scene,camera);updateLabels();raf=requestAnimationFrame(frame);callbacks.current.onReady?.();
    // Stable, read-only diagnostics make actual creature and navigation verification possible.
    (el as HTMLDivElement & {sceneDiagnostics?:()=>unknown}).sceneDiagnostics=()=>({active:selected,hovered,reducedMotion:reduced,time:elapsed,owl:owl.position.toArray(),fox:fox.position.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:camera.position.toArray(),targets:landmarks.map(place=>{const p=new THREE.Vector3(place.position[0],place.height*.45,place.position[2]).project(camera);return{id:place.id,x:(p.x*.5+.5)*el.clientWidth,y:(-p.y*.5+.5)*el.clientHeight};})});
    return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();runtime.current=null;renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',click);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('webglcontextlost',contextLost);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Points){geometries.add(obj.geometry);(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  }, []);

  useEffect(()=>runtime.current?.select(active),[active]);
  useEffect(()=>runtime.current?.reduce(reducedMotion),[reducedMotion]);

  return <div className="village-scene" style={{position:'relative',width:'100%',height:'100%'}}>
    <style>{`@media(max-width:760px){.village-scene .village-label{min-width:44px!important;min-height:44px!important;padding:10px!important;justify-content:center}.village-scene .village-label:not([data-active="true"]):not(:focus-visible)>span:last-child{display:none}.village-scene .village-label[data-active="true"]{font-size:10px!important}.village-scene .village-label-dot{flex-shrink:0}}`}</style>
    <div ref={host} data-scene-viewport style={{position:'absolute',inset:0}} />
    <div ref={labelLayer} className="village-labels" style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
      {landmarks.map(place=><button type="button" key={place.id} data-landmark={place.id} className="village-label" aria-label={`${place.name}: ${place.purpose}`} onClick={()=>onNavigate(place.id)} style={{position:'absolute',left:0,top:0,pointerEvents:'auto'}}><span className="village-label-dot"/><span>{place.name}</span></button>)}
    </div>
  </div>;
}
