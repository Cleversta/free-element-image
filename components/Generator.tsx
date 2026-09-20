'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import assets from '@/data/assets.json';

type Asset=typeof assets[number];
type Item={uid:string;asset:Asset;x:number;y:number;scale:number;rotation:number;locked:boolean;z:number;flipX:boolean;flipY:boolean;opacity:number;hue:number};
const aliases:Record<string,string>={background:'backgrounds',tree:'trees',building:'buildings',animal:'animals',character:'people',decoration:'decorations',effect:'effects',plant:'plants',structure:'structures',flower:'flowers','small-tree':'small-trees','garden-equipment':'garden-equipment','village-prop':'village-props'};
const CAT_ORDER=['trees','small-trees','flowers','grass','plants','bushes','rocks','buildings','structures','village-props','garden-equipment','decorations','animals','people','water','terrain','effects','backgrounds','sky'];
const catOf=(a:Asset)=>aliases[a.type]||a.type;
const cats=CAT_ORDER.filter(c=>c!=='backgrounds'&&assets.some(a=>catOf(a as Asset)===c));
const pick=<T,>(a:T[])=>a[Math.floor(Math.random()*a.length)];
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const pretty=(v:string)=>v.replace(/-\d+$/,'').replaceAll('-',' ').replace(/\b\w/g,m=>m.toUpperCase());
const icon=(c:string)=>({trees:'🌳','small-trees':'🌱',flowers:'🌸',grass:'🌿',plants:'🍃',bushes:'☘',rocks:'◆',buildings:'⌂',structures:'▥','village-props':'🪵','garden-equipment':'🛠',decorations:'✦',animals:'🐄',people:'●',water:'≈',terrain:'◒',effects:'✧',backgrounds:'▣',sky:'☀'} as Record<string,string>)[c]||'◇';

const BASE_BACKGROUNDS=[
 ['Meadow','#bfe0ef','#9fbd79'],['Village','#c5e1eb','#8faa70'],['Mountains','#b9d8e6','#7e9476'],['Forest','#b7d2cf','#536f55'],
 ['Lake','#b5ddeb','#79b7c9'],['Countryside','#c8e2ea','#a6b66f'],['Farm','#c3dfe8','#b5a665'],['Beach','#9ed9ee','#dfc58c'],
 ['Sunset','#dc9182','#7a674e'],['Autumn','#cad5d5','#a27a50'],['Winter','#c4d8e1','#e4ecee'],['Night','#2b405d','#344c42'],
 ['River Valley','#b8dde9','#78a175'],['Flower Field','#c4e1ea','#91b777'],['Country Road','#c5e0e8','#9bad78'],['Desert','#b6dbe7','#d2a66f'],
 ['Snow Peaks','#b8d0df','#d8e3e6'],['Spring','#c4e4ec','#9ac17c'],['Cloudy','#bac6ca','#81916f'],['Storm','#72838d','#506252'],
 ['Misty Hills','#c9d2d3','#939e90'],['Moonlight','#263a55','#30473e'],['Prairie','#c2dfe7','#b5b16e'],['Marsh','#bdd5d9','#758e71']
].map(([name,sky,ground])=>({name,sky,ground}));

const MERGED_BASE_BACKGROUNDS=[
 {name:'Distant Forest',sky:'#bfdbe3',ground:'#667f5e'},
 {name:'Village Silhouette',sky:'#c8dce2',ground:'#7e8e68'},
 {name:'Cliffs',sky:'#b9d7e2',ground:'#8c806d'},
 {name:'Low Hills',sky:'#c5e0e8',ground:'#91ad73'},
 {name:'Mountain Valley',sky:'#b5d5e4',ground:'#78936b'},
 {name:'Open Countryside',sky:'#c8e3eb',ground:'#a6bd7c'},
 {name:'Distant City',sky:'#c0d7df',ground:'#7c8876'},
 {name:'Forest Edge',sky:'#bad7d6',ground:'#557158'}
];

const ALL_BASE_BACKGROUNDS=[...BASE_BACKGROUNDS,...MERGED_BASE_BACKGROUNDS];

export default function Generator(){
 const [baseBg,setBaseBg]=useState(ALL_BASE_BACKGROUNDS[1]);
 const [items,setItems]=useState<Item[]>([]);
 const [active,setActive]=useState<string|null>(null);
 const [section,setSection]=useState<'backgrounds'|'elements'|'decorations'|'others'>('backgrounds');
 const [pickerCat,setPickerCat]=useState(cats[0]||'trees');
 const [search,setSearch]=useState('');
 const [history,setHistory]=useState<Item[][]>([]);
 const [future,setFuture]=useState<Item[][]>([]);
 const board=useRef<HTMLDivElement>(null);
 const groups=useMemo(()=>Object.fromEntries(cats.map(c=>[c,assets.filter(a=>catOf(a as Asset)===c) as Asset[]])),[]);
 const current=items.find(i=>i.uid===active)||null;
 const filtered=useMemo(()=>(groups[pickerCat]||[]).filter((a:Asset)=>(a.variant||a.id).toLowerCase().includes(search.toLowerCase())),[groups,pickerCat,search]);
 const nextZ=()=>items.reduce((m,i)=>Math.max(m,i.z),0)+1;

 const positionFor=(c:string)=>{
   let x=35+Math.random()*30,y=55+Math.random()*18,scale=.48;
   if(c==='buildings'){y=43;scale=.55} if(c==='trees'){y=42;scale=.58} if(c==='small-trees'){y=55;scale=.38}
   if(['flowers','grass','plants','garden-equipment','village-props','decorations'].includes(c)){y=66;scale=.34}
   if(c==='animals'){y=64;scale=.38} if(c==='sky'||c==='effects'){y=12;scale=.45}
   return {x,y,scale};
 };
 const addAsset=(a:Asset)=>{
   const c=catOf(a),p=positionFor(c);
   const it:Item={uid:crypto.randomUUID(),asset:a,...p,rotation:0,locked:false,z:nextZ(),flipX:false,flipY:false,opacity:1,hue:0};
   setItems(v=>[...v,it]); setActive(it.uid);
 };
 const commit=(next:Item[])=>{setHistory(h=>[...h.slice(-29),items]);setItems(next);setFuture([])};
 const update=(uid:string,p:Partial<Item>)=>setItems(v=>v.map(i=>i.uid===uid?{...i,...p}:i));
 const undo=()=>{if(!history.length)return;const prev=history[history.length-1];setFuture(f=>[items,...f].slice(0,30));setItems(prev);setHistory(h=>h.slice(0,-1));setActive(null)};
 const redo=()=>{if(!future.length)return;const next=future[0];setHistory(h=>[...h,items].slice(-30));setItems(next);setFuture(f=>f.slice(1));setActive(null)};
 const remove=(uid:string)=>{setItems(v=>v.filter(i=>i.uid!==uid));if(active===uid)setActive(null)};
 const duplicate=(it:Item)=>{const n={...it,uid:crypto.randomUUID(),x:clamp(it.x+4,0,92),y:clamp(it.y+3,0,92),z:nextZ(),locked:false};setItems(v=>[...v,n]);setActive(n.uid)};
 const layer=(it:Item,mode:'up'|'down'|'front'|'back')=>{
   if(mode==='front') update(it.uid,{z:nextZ()});
   else if(mode==='back') update(it.uid,{z:1});
   else update(it.uid,{z:Math.max(1,it.z+(mode==='up'?1:-1))});
 };
 const down=(e:React.PointerEvent,it:Item)=>{
   if(it.locked||!board.current)return; e.stopPropagation(); setActive(it.uid); e.currentTarget.setPointerCapture(e.pointerId);
   const r=board.current.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ox=it.x,oy=it.y;
   const move=(ev:PointerEvent)=>update(it.uid,{x:clamp(ox+(ev.clientX-sx)/r.width*100,-8,94),y:clamp(oy+(ev.clientY-sy)/r.height*100,-8,94)});
   const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 };

 const resizeDown=(e:React.PointerEvent,it:Item)=>{
   if(it.locked||!board.current)return;
   e.preventDefault();e.stopPropagation();setActive(it.uid);
   const r=board.current.getBoundingClientRect();
   const cx=r.left+(it.x/100*r.width)+(320*it.scale/2);
   const cy=r.top+(it.y/100*r.height)+(270*it.scale/2);
   const startDist=Math.max(20,Math.hypot(e.clientX-cx,e.clientY-cy));
   const startScale=it.scale;
   const move=(ev:PointerEvent)=>{
     const d=Math.max(10,Math.hypot(ev.clientX-cx,ev.clientY-cy));
     update(it.uid,{scale:clamp(startScale*(d/startDist),.15,4)});
   };
   const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
   window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 };
 const rotateDirect=(uid:string,delta=15)=>{
   const it=items.find(i=>i.uid===uid);if(it)update(uid,{rotation:(it.rotation+delta)%360});
 };
 const randomScene=()=>{
   const out:Item[]=[]; let z=1;
   const addFrom=(c:string,n:number,scale?:number)=>{const pool=groups[c]||[];for(let k=0;k<n&&pool.length;k++){const a=pick(pool),p=positionFor(c);out.push({uid:crypto.randomUUID(),asset:a,x:p.x+(Math.random()*12-6),y:p.y+(Math.random()*8-4),scale:scale||p.scale*(.8+Math.random()*.45),rotation:0,locked:false,z:z++,flipX:false,flipY:false,opacity:1,hue:0})}};
   addFrom('trees',2);addFrom('small-trees',2);addFrom('flowers',3);addFrom('grass',2);addFrom('buildings',1);addFrom('village-props',2);addFrom('garden-equipment',1);addFrom('animals',1);
   setItems(out);setActive(null);setBaseBg(pick(ALL_BASE_BACKGROUNDS));
 };
 const save=()=>localStorage.setItem('freelement-scene',JSON.stringify({baseBg,items}));
 useEffect(()=>{try{const raw=localStorage.getItem('freelement-scene');if(raw){const d=JSON.parse(raw);if(d.baseBg)setBaseBg(d.baseBg);if(Array.isArray(d.items))setItems(d.items)}}catch{}},[]);
 const download=async()=>{
   if(!board.current)return;const W=1200,H=800,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d')!;
   const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,baseBg.sky);grad.addColorStop(.45,baseBg.sky);grad.addColorStop(.451,baseBg.ground);grad.addColorStop(1,baseBg.ground);ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
   for(const it of [...items].sort((a,b)=>a.z-b.z)){await new Promise<void>(res=>{const im=new Image();im.onload=()=>{const w=320*it.scale,h=270*it.scale;ctx.save();ctx.globalAlpha=it.opacity;ctx.filter=`hue-rotate(${it.hue||0}deg)`;ctx.translate(it.x/100*W+w/2,it.y/100*H+h/2);ctx.rotate(it.rotation*Math.PI/180);ctx.scale(it.flipX?-1:1,it.flipY?-1:1);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();res()};im.onerror=()=>res();im.src=it.asset.src})}
   const a=document.createElement('a');a.download='freelement-village.png';a.href=canvas.toDataURL('image/png');a.click();
 };
 const sectionCats=section==='elements'?cats.filter(c=>['trees','small-trees','flowers','grass','plants','bushes','rocks','buildings','structures','animals','people','water'].includes(c))
   :section==='decorations'?cats.filter(c=>['garden-equipment','village-props','decorations','effects'].includes(c))
   :section==='others'?cats.filter(c=>['terrain','sky','water','effects'].includes(c)):[];

 return <main className="villageStudio">
   <header className="vTop">
     <div className="vBrand"><span className="leaf">◒</span><div><b>Freelement Images</b><small>Build a village scene your way</small></div></div>
     <div className="vActions"><button className="iconAction" disabled={!history.length} onClick={undo} title="Undo">↶</button><button className="iconAction" disabled={!future.length} onClick={redo} title="Redo">↷</button><button onClick={()=>{setItems([]);setActive(null)}}>⊕ New</button><button onClick={randomScene}>⟳ Random</button><button onClick={save}>▣ Save</button><button className="download" onClick={download}>⇩ Download PNG</button></div>
   </header>
   <div className="vWorkspace">
     <aside className="vLeft">
       <div className="bigTabs">
         <button className={section==='backgrounds'?'on':''} onClick={()=>setSection('backgrounds')}>▣<span>Scenes</span></button>
         <button className={section==='elements'?'on':''} onClick={()=>setSection('elements')}>◇<span>Objects</span></button>
         <button className={section==='decorations'?'on':''} onClick={()=>setSection('decorations')}>✧<span>Village</span></button>
         <button className={section==='others'?'on':''} onClick={()=>setSection('others')}>⊙<span>More</span></button>
       </div>
       {section==='backgrounds'?<>
         <div className="panelTitle"><b>Scene background</b><small>{ALL_BASE_BACKGROUNDS.length} scenes</small></div>
         <div className="visualBgGrid">{ALL_BASE_BACKGROUNDS.map(bg=><button key={bg.name} className={baseBg.name===bg.name?'selected':''} onClick={()=>setBaseBg(bg)}>
           <span style={{background:`linear-gradient(${bg.sky} 0 58%,${bg.ground} 58%)`}}><i>⌁</i></span><small>{bg.name}</small>
         </button>)}</div>
       </>:<>
         <div className="panelTitle"><b>{section==='decorations'?'Village details':'Elements'}</b><small>{sectionCats.length} groups</small></div>
         <div className="categoryTiles">{sectionCats.map(c=><button key={c} className={pickerCat===c?'on':''} onClick={()=>setPickerCat(c)}><span>{icon(c)}</span><small>{pretty(c)}</small></button>)}</div>
         <input className="vSearch" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search elements..." />
         <div className="miniAssetGrid">{filtered.map(a=><button key={a.id} onClick={()=>addAsset(a)}><span><img src={a.src} alt={a.variant||a.id}/><i>+</i></span><small>{pretty(a.variant||a.id)}</small></button>)}</div>
       </>}
     </aside>

     <section className="vCenter">
       <div className="sceneHead"><span>{baseBg.name.toUpperCase()} • BASE BACKGROUND</span><span>{items.length} elements <button onClick={()=>{setItems([]);setActive(null)}}>♙ Clear All</button></span></div>
       <div ref={board} className="vBoard" onPointerDown={()=>setActive(null)} style={{background:`linear-gradient(${baseBg.sky} 0 45%,${baseBg.ground} 45%)`}}>
         <div className="baseHorizon"/>
         {!items.length&&<div className="emptyScene"><b>Start your village</b><span>Choose a scene, then add trees, flowers, buildings and details.</span><button onClick={()=>setSection('elements')}>Browse objects</button></div>}

         {[...items].sort((a,b)=>a.z-b.z).map(it=>{
           const selected=active===it.uid;
           return <div key={it.uid} className={'assetBox '+(selected?'selected':'')}
             style={{left:`${it.x}%`,top:`${it.y}%`,width:`${320*it.scale}px`,height:`${270*it.scale}px`,zIndex:it.z,
               transform:`rotate(${it.rotation}deg) scale(${it.flipX?-1:1},${it.flipY?-1:1})`}}
             onPointerDown={e=>down(e,it)} onClick={e=>{e.stopPropagation();setActive(it.uid)}}>
             <img src={it.asset.src} alt={it.asset.variant||it.asset.id} draggable={false}
               style={{opacity:it.opacity,filter:`hue-rotate(${it.hue||0}deg)`}} />
             {selected&&<>
               <button className="directDelete" title="Delete" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();remove(it.uid)}}>×</button>
               <span className="resizeHandle nw" onPointerDown={e=>resizeDown(e,it)}/>
               <span className="resizeHandle ne" onPointerDown={e=>resizeDown(e,it)}/>
               <span className="resizeHandle sw" onPointerDown={e=>resizeDown(e,it)}/>
               <span className="resizeHandle se" onPointerDown={e=>resizeDown(e,it)}/>
             </>}
           </div>
         })}
         {current&&<div className="floatingTools" onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
           <button title="Delete" onClick={()=>remove(current.uid)}>🗑</button>
           <button title="Duplicate" onClick={()=>duplicate(current)}>▣</button>
           <button title="Rotate left" onClick={()=>rotateDirect(current.uid,-15)}>↶</button>
           <button title="Rotate right" onClick={()=>rotateDirect(current.uid,15)}>↻</button>
           <button title="Flip horizontal" onClick={()=>update(current.uid,{flipX:!current.flipX})}>↔</button>
           <button title="Bring forward" onClick={()=>layer(current,'up')}>↑</button>
           <button title={current.locked?'Unlock':'Lock'} onClick={()=>update(current.uid,{locked:!current.locked})}>{current.locked?'🔓':'🔒'}</button>
         </div>}
       </div>
       <div className="addedStrip"><div className="stripTitle"><b>Added Elements ({items.length})</b></div><div className="stripItems">
         {items.map(it=><button key={it.uid} className={active===it.uid?'on':''} onClick={()=>setActive(it.uid)}><i onClick={e=>{e.stopPropagation();remove(it.uid)}}>×</i><img src={it.asset.src}/><small>{pretty(it.asset.variant||it.asset.id)}</small></button>)}
         <button className="addMore" onClick={()=>setSection('elements')}><span>＋</span><small>Add More</small></button>
       </div></div>
     </section>

     <aside className="vRight">
       <h3>Element Properties</h3>
       {!current?<div className="noSelection">Select an element on the scene to edit it.</div>:<>
         <div className="selectedCard"><img src={current.asset.src}/><div><b>{pretty(current.asset.variant||current.asset.id)}</b><small>{pretty(catOf(current.asset))}</small></div><button onClick={()=>remove(current.uid)}>♙</button></div>
         <Prop label="Size" value={`${Math.round(current.scale*100)}%`}><input type="range" min="15" max="400" step="5" value={Math.round(current.scale*100)} onChange={e=>update(current.uid,{scale:+e.target.value/100})}/><div className="quick">{[50,75,100,125,150,200].map(n=><button key={n} onClick={()=>update(current.uid,{scale:n/100})}>{n}%</button>)}</div></Prop>
         <Prop label="Rotation" value={`${current.rotation}°`}><input type="range" min="-180" max="180" step="1" value={current.rotation} onChange={e=>update(current.uid,{rotation:+e.target.value})}/></Prop>
         <Prop label="Flip"><div className="twoBtns"><button className={current.flipX?'on':''} onClick={()=>update(current.uid,{flipX:!current.flipX})}>↔ Horizontal</button><button className={current.flipY?'on':''} onClick={()=>update(current.uid,{flipY:!current.flipY})}>↕ Vertical</button></div></Prop>
         <Prop label="Layer"><div className="layerGrid"><button onClick={()=>layer(current,'up')}>▱ Bring Forward</button><button onClick={()=>layer(current,'down')}>▱ Send Backward</button><button onClick={()=>layer(current,'front')}>▣ Bring to Front</button><button onClick={()=>layer(current,'back')}>▣ Send to Back</button></div></Prop>
         <Prop label="Opacity" value={`${Math.round(current.opacity*100)}%`}><input type="range" min="10" max="100" value={Math.round(current.opacity*100)} onChange={e=>update(current.uid,{opacity:+e.target.value/100})}/></Prop>
         <Prop label="Color" value={`${current.hue||0}°`}><input type="range" min="0" max="360" step="1" value={current.hue||0} onChange={e=>update(current.uid,{hue:+e.target.value})}/><div className="quick"><button onClick={()=>update(current.uid,{hue:0})}>Original</button><button onClick={()=>update(current.uid,{hue:45})}>Warm</button><button onClick={()=>update(current.uid,{hue:120})}>Green</button><button onClick={()=>update(current.uid,{hue:200})}>Blue</button><button onClick={()=>update(current.uid,{hue:300})}>Pink</button></div></Prop>
       </>}
     </aside>
   </div>
   <footer className="vFoot"><span>Freelement Images</span><span>Create • Arrange • Customize • Download</span><span>Arrange • customize • export ✨</span></footer>
 </main>
}

function Prop({label,value,children}:{label:string,value?:string,children:React.ReactNode}){
 return <div className="prop"><div className="propHead"><b>{label}</b><span>{value}</span></div>{children}</div>
}
