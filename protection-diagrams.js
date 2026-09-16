/* Six small multiples on one unchanged source model. Symbols describe investigations,
   not measured hazards, certified shelter, proposed buildings or simulation results. */
window.ProtectionDiagrams=(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const conditions=[
  {key:'noise',title:'Noise',color:'#af625a',take:'Buffer the road. Check above the buffer.',text:'The highway borders our southern context. Test quieter ground-level spaces and upper rooms separately: an edge that screens one may leave the other exposed.',limit:'Sound waves are symbols—not decibel contours.',check:'Measure sound and source/receiver levels.',sources:['map','noise'],tags:['N1','N2','C1']},
  {key:'air',title:'Air, dust & odour',color:'#a47d39',take:'Choose openings after checking the sources.',text:'Road traffic and Street 80 servicing need a source check. Compare waiting places and intake positions before calling an inner space clean; enclosure alone is not proof.',limit:'Dotted inspection points—not a pollutant plume.',check:'Locate exhausts and idling; pair observations with wind.',sources:['air','beirut'],tags:['A1','A2']},
  {key:'solar',title:'Sun, glare & heat',color:'#b68c32',take:'Shade the places where people stay.',text:'Test afternoon exposure at our western edge and shade at the arrival. Neighbouring masses affect the study, but schematic heights cannot establish actual shadows or thermal comfort.',limit:'Equinox afternoon direction—not a shadow study.',check:'Verify heights, seasonal shade and occupied conditions.',sources:['solar','heat'],tags:['S1','S2']},
  {key:'wind',title:'Wind & ventilation',color:'#41838c',take:'Shelter the entrance without sealing the plot.',text:'Compare southwest, west-southwest and north-northwest approaches around the same neighbours. A recessed Street 80 threshold should shelter waiting while openings elsewhere still allow useful exchange.',limit:'Separate direction cases—not simultaneous airflow.',check:'Check local wind and calm periods; no clean-air claim.',sources:['climate','air'],tags:['W1','W2']},
  {key:'water',title:'Rain, drainage & ground',color:'#597da5',take:'Keep the arrival dry and easy to enter.',text:'Study rain cover and the Street 80 threshold together. Ground levels, drains and soil remain unknown: a raised platform can obstruct access, and the nearby river does not prove flooding here.',limit:'Falling rain symbols—not runoff or flood extent.',check:'Survey levels, drainage and ground before designing flows.',sources:['water','soil','access'],tags:['R1','R2','G1']},
  {key:'traffic',title:'Traffic & visual exposure',color:'#86678e',take:'Protect the doorstep, not hide the entrance.',text:'Street 80 and the footbridge meet our arrival context. Keep walking and waiting separate from service movements, then check privacy from the bridge and neighbouring upper levels.',limit:'Viewpoints to investigate—not verified sightlines.',check:'Check loading, clear passage and eye levels in section.',sources:['access','course'],tags:['T1','T2','V1','V2']}
 ];
 let host,model,scale=1,pan=[0,0],drag;
 const el=(n,a={},t)=>{const e=document.createElementNS(NS,n);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);if(t!==undefined)e.textContent=t;return e;};
 const path=(p,close=false)=>p.map((v,i)=>(i?'L':'M')+v.map(n=>n.toFixed(3)).join(',')).join(' ')+(close?' Z':'');
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const xy=p=>{const q=ArchitecturalMap.project(p);return[q[0],-q[1],0];};
 function build(){
  const {solar,solarMethod,...base}=SunAxon.build(BuildingMap.model(),135),arrival=ArrivalAxon.build();
  const s=protectionSolar('equinox',15),a=s.altitude*Math.PI/180,b=s.azimuth*Math.PI/180;
  const sun={season:'equinox',solarHour:15,altitude:s.altitude,azimuth:s.azimuth,vector:[Math.cos(a)*Math.sin(b),Math.cos(a)*Math.cos(b),Math.sin(a)]};
  return{...base,version:'2026-09-16-protection-six-1',view:arrival.view,approaches:[],conditions,sun,
   windCases:[{name:'SW',from:225},{name:'WSW',from:257},{name:'NNW',from:337}],
   scope:'Six separate investigations, not six verified hazards. Same existing building geometry, camera and scale in every diagram. No proposed shelter geometry or measured performance.',
   symbols:'Sound waves, inspection dots, rain strokes and view cones are authored analytical symbols, not model results. Wind cases are alternatives. Upper receiver stem is a schematic test, not a proposed room or measured elevation.',
   anchors:{highway:xy([33.8961813,35.5403841]),road:xy([33.8966799,35.5414193]),bend:xy([33.8963428,35.54125]),bridge:xy([33.89612655,35.5409535]),west:xy([33.89657,35.54097])}};
 }
 function draw(m,c){
  const original=ArrivalAxon.draw(m,{contextOnly:true}),s=el('svg',{xmlns:NS,viewBox:'-153 -112 306 224',role:'img','aria-label':c.title+' on our plot','data-protection-diagram':c.key});
  s.appendChild(el('title',{},c.title+' — '+c.take));s.appendChild(el('desc',{},c.text+' '+c.limit));
  s.appendChild(el('style',{},'text{font-family:Arial,sans-serif;paint-order:stroke;stroke:#faf9f5;stroke-width:1.5;stroke-linejoin:round}path,text,circle,rect,ellipse{pointer-events:none}'));
  const defs=original.querySelector('defs').cloneNode(true),id='pd-context-'+c.key;defs.querySelector('clipPath').id=id;s.appendChild(defs);
  const g=el('g',{'data-protection-drawing':'fixed'});s.appendChild(g);const context=original.querySelector('[data-layer="context"]').cloneNode(true);context.setAttribute('clip-path','url(#'+id+')');g.appendChild(context);
  const p=q=>{const r=q.map((v,i)=>v-(m.center[i]||0));return[dot(m.view.right,r),dot(m.view.down,r)];};
  const at=(e,n,z=0)=>[m.center[0]+e,m.center[1]+n,z];
  const layer=el('g',{'data-layer':'condition','data-condition':c.key});g.appendChild(layer);
  const line=(points,color=c.color,width=.85,dash)=>{const e=el('path',{d:path(points),fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round'});if(dash)e.setAttribute('stroke-dasharray',dash);layer.appendChild(e);return e;};
  const text=(x,y,t,size=6.5,color=c.color,attrs={})=>layer.appendChild(el('text',{x,y,fill:color,'font-size':size*1.25,...attrs},t));
  const leader=(q,to,label)=>{line([p(q),to],c.color,.5);text(to[0],to[1]-3,label,6.2,c.color,{'font-weight':'bold'});};
  const highlight=(ids,color=c.color,dash)=>{for(const r of m.roads.filter(r=>ids.includes(r.id)))line(r.points.map(p),color,1.6,dash);};
  const arrow=(a,b,color=c.color)=>{const u=p(a),v=p(b),t=Math.atan2(v[1]-u[1],v[0]-u[0]);line([u,v],color,1.35);line([[v[0]-6*Math.cos(t-.42),v[1]-6*Math.sin(t-.42)],v,[v[0]-6*Math.cos(t+.42),v[1]-6*Math.sin(t+.42)]],color,1.35);};
  const ring=(q,r=3.5)=>{const [cx,cy]=p(q);layer.appendChild(el('circle',{cx,cy,r,fill:'#faf9f5',stroke:c.color,'stroke-width':1}));};
  const roads=[200611932,237737315,692409629];
  if(c.key==='noise'){
   highlight(roads);const q=p(at(-7,-53));for(const r of [10,17,24]){const points=Array.from({length:20},(_,i)=>{const t=-Math.PI*.85+i/19*Math.PI*.65;return[q[0]+r*Math.cos(t),q[1]+r*Math.sin(t)];});line(points,c.color,1.1);}
   line([p(m.center),p(at(0,0,25))],c.color,.8,'2 2');ring(m.center,2.5);ring(at(0,0,25),2.5);
   leader(at(0,0,25),[39,-45],'GROUND + UPPER');leader(m.anchors.highway,[-139,47],'HIGHWAY SOUND');
  }
  if(c.key==='air'){
   highlight(roads);highlight([275315121]);for(const a of [at(-21,-44),m.anchors.road,m.anchors.bend]){const q=p(a);layer.appendChild(el('circle',{cx:q[0],cy:q[1],r:7,fill:'none',stroke:c.color,'stroke-width':1,'stroke-dasharray':'1 2'}));text(q[0],q[1]+2.4,'?',7,c.color,{'text-anchor':'middle'});}
   leader(m.anchors.road,[42,-63],'SOURCE CHECKS');leader(m.center,[-133,-23],'INTAKE / STAY?');
  }
  if(c.key==='solar'){
   const q=m.sun.vector.map((v,i)=>m.center[i]+v*105),u=p(q);line([u,p(m.center)],c.color,1.2,'3 2');layer.appendChild(el('circle',{cx:u[0],cy:u[1],r:6,fill:'#efe0aa',stroke:c.color,'stroke-width':1}));for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[u[0]+8*Math.cos(a),u[1]+8*Math.sin(a)],[u[0]+12*Math.cos(a),u[1]+12*Math.sin(a)]],c.color,.7);}
   leader(m.anchors.west,[-133,39],'WEST EDGE');text(-139,-79,'AFTERNOON SUN',7,c.color,{'font-weight':'bold'});text(-139,-69,'Equinox / 15:00 solar time',5.6);
   leader(m.anchors.bend,[39,47],'SHADE THE ARRIVAL');
  }
  if(c.key==='wind'){
   for(const w of m.windCases){const a=w.from*Math.PI/180,d=[Math.sin(a),Math.cos(a)],start=at(d[0]*118,d[1]*118),end=at(d[0]*40,d[1]*40);arrow(start,end);const q=p(start);text(q[0]-5,q[1]-5,w.name,7,c.color,{'font-weight':'bold'});}
   leader(m.anchors.bend,[48,68],'SHELTER / EXCHANGE');text(-141,94,'Also test calm conditions',6);
  }
  if(c.key==='water'){
   for(const [x,y]of [[-12,-8],[0,-8],[12,-8],[-12,7],[0,7],[12,7]]){line([p(at(x,y,61)),p(at(x,y,47))],c.color,.9);}
   ring(m.anchors.bend,6);const q=p(m.anchors.bend);text(q[0],q[1]+2,'?',7,c.color,{'text-anchor':'middle'});
   leader(m.anchors.bend,[45,51],'THRESHOLD LEVELS?');leader(m.center,[-133,65],'SOIL + DRAINAGE?');text(-135,-82,'RAIN COVER',7,c.color,{'font-weight':'bold'});
  }
  if(c.key==='traffic'){
   highlight([275315121]);highlight([701135687,701135688,270786366],c.color,'2 1.5');
   const eye=q=>{const u=p(q);layer.appendChild(el('ellipse',{cx:u[0],cy:u[1]-11,rx:6,ry:3,fill:'#faf9f5',stroke:c.color,'stroke-width':.8}));layer.appendChild(el('circle',{cx:u[0],cy:u[1]-11,r:1.4,fill:c.color}));line([[u[0],u[1]-7],u],c.color,.6,'1 2');line([[u[0]+5,u[1]-11],p(at(0,0,15))],c.color,.65,'2 2');};
   eye(m.anchors.bridge);eye(at(65,22,18));leader(m.anchors.road,[44,-64],'STREET 80');leader(m.anchors.bridge,[-139,62],'BRIDGE / VIEWS?');text(28,74,'KEEP ARRIVAL CLEAR',6.1,c.color,{'font-weight':'bold'});
  }
  // A common orientation and plot label are repeated, not repositioned per topic.
  const center=p(m.center);text(center[0],center[1]+10,'OUR PLOT',5.5,'#716343',{'text-anchor':'middle','font-weight':'bold'});
  if(c.key!=='traffic'){line([p(m.anchors.road),[64,-85]],'#8c9988',.35);text(64,-87,'STREET 80',5.4,'#71826f');}
  if(c.key!=='noise')text(18,100,'HIGHWAY',5.2,'#86907e');
  const n=[-137,-94],end=[n[0]+m.view.right[1]*15,n[1]+m.view.down[1]*15];line([n,end],'#7f8b7c',.6);text(end[0]-2,end[1]-3,'N',5.5,'#7f8b7c');
  return s;
 }
 function transform(){host?.querySelectorAll('[data-protection-drawing]').forEach(g=>g.setAttribute('transform',`translate(${pan[0]} ${pan[1]}) scale(${scale})`));}
 function fit(){scale=1;pan=[0,0];transform();}
 function zoom(f){scale=Math.max(.7,Math.min(3.5,scale*f));transform();}
 function save(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 function boardSVG(){
  const s=el('svg',{xmlns:NS,viewBox:'0 0 1200 1100',width:1200,height:1100});s.appendChild(el('rect',{width:1200,height:1100,fill:'#faf9f5'}));
  const t=(x,y,v,size,color='#354640')=>s.appendChild(el('text',{x,y,'font-family':'Arial,sans-serif','font-size':size,fill:color},v));
  t(24,34,'ONE PLOT / SIX PROTECTION CONDITIONS',24);t(24,58,'Same geometry and scale. Coloured symbols are investigations, not measured performance.',12);
  for(const[i,c]of conditions.entries()){const x=(i%3)*400,y=80+Math.floor(i/3)*470;const d=draw(model,c);d.setAttribute('x',x+10);d.setAttribute('y',y+35);d.setAttribute('width',380);d.setAttribute('height',275);s.appendChild(d);t(x+22,y+20,String(i+1).padStart(2,'0')+' / '+c.title.toUpperCase(),15,c.color);
   const wrap=(str,max)=>{const lines=[];let l='';for(const w of str.split(' ')){if((l+' '+w).length>max){lines.push(l);l=w;}else l+=(l?' ':'')+w;}if(l)lines.push(l);return lines;};
   let ty=y+330;for(const l of wrap(c.take,48)){t(x+22,ty,l,13,c.color);ty+=17;}for(const l of wrap(c.text,57)){t(x+22,ty+5,l,11);ty+=15;}for(const l of wrap(c.limit,62)){t(x+22,ty+9,l,10,'#737f70');ty+=14;}
  }
  t(24,1062,'Floor-based schematic masses. Minimum-only heights dashed; unknown heights flat. No proposed building or certified shelter.',12);
  t(24,1082,'Road and bridge levels TBD. Local ENU model, not surveyed CAD coordinates. Original Protection map retained.',12);
  return new XMLSerializer().serializeToString(s);
 }
 function show(on){document.body.classList.toggle('protectiondiagrams-on',on);document.getElementById('workspace').classList.toggle('protectiondiagrams-mode',on);if(!on){if(host)host.hidden=true;return;}
  if(!host){host=document.createElement('section');host.id='protection-diagrams-view';host.className='protection-diagrams-view';document.querySelector('.map-shell').appendChild(host);}
  model=build();host.hidden=false;
  host.innerHTML='<header class="pd-heading"><div><span>PROTECTION / SIX CONDITIONS</span><h1>One plot. Different kinds of shelter.</h1><p>The same site in every frame. Each colour asks a different design question.</p></div><div class="pd-controls"><button data-pd="in" aria-label="Enlarge all six diagrams">+</button><button data-pd="out" aria-label="Reduce all six diagrams">−</button><button data-pd="fit">Fit all</button><button data-pd="svg">Export sheet · SVG</button><button data-pd="json">Geometry · JSON</button></div></header><div class="pd-grid"></div><footer class="pd-footer"><b>Read these as investigations, not six confirmed hazards.</b> Floor-based masses are estimates; dashed masses are minimum-only evidence and flat outlines have unknown heights. No proposed building, measured hazard boundary or guaranteed shelter is shown. All drawing labels stay fixed.<details><summary>Evidence, limits & original map</summary><p>Same current Pictures Auto building footprints, plot and source street geometry in every frame. Orthographic camera and scale are identical. Road and bridge heights remain TBD. Sun direction uses the existing equinox / 15:00 solar-time calculation; it is not a cast-shadow model. Wind arrows are separate SW, WSW and NNW cases, not measured prevailing flow.</p><p>Graphic waves do not measure noise; dotted circles do not identify actual exhausts; rain strokes do not establish runoff; eye symbols do not establish observer heights or actual privacy. Any upper receiver or eye position is a conceptual test point, not a new room. The drainage and ground drawings do not assert flooding, contamination or safe infiltration.</p><p>Our six existing Protection research categories control this series; the attached “6 Points of Views” reference supplies only its small-multiple format. Its building, routes and six viewpoints are not transferred.</p><p><a href="protection-research.html" target="_blank" rel="noopener">Protection research and sources</a></p><button data-pd="original">Original Protection map</button></details></footer>';
  const grid=host.querySelector('.pd-grid');for(const[i,c]of conditions.entries()){const card=document.createElement('article');card.className='pd-card';card.style.setProperty('--condition',c.color);card.innerHTML='<h2><span>'+String(i+1).padStart(2,'0')+'</span>'+c.title+'</h2><div class="pd-canvas"></div><h3>'+c.take+'</h3><p>'+c.text+'</p><small>'+c.limit+'</small><details><summary>Check on site</summary><p>'+c.check+'</p><p>'+c.sources.map(k=>{const src=PROTECTION_DATA.sources[k];return'<a href="'+src.url+'" target="_blank" rel="noopener">'+src.title+'</a>';}).join(' · ')+'</p></details>';const svg=draw(model,c);card.querySelector('.pd-canvas').appendChild(svg);grid.appendChild(card);
   const loc=e=>{const q=svg.createSVGPoint();q.x=e.clientX;q.y=e.clientY;const p=q.matrixTransform(svg.getScreenCTM().inverse());return[p.x,p.y];};
   svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={svg,id:e.pointerId,point:loc(e),pan:[...pan]};svg.setPointerCapture(e.pointerId);});svg.addEventListener('pointermove',e=>{if(drag?.svg!==svg||drag.id!==e.pointerId)return;const p=loc(e);pan=[drag.pan[0]+p[0]-drag.point[0],drag.pan[1]+p[1]-drag.point[1]];transform();});svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
  }
  fit();host.querySelectorAll('[data-pd]').forEach(b=>b.onclick=()=>{const k=b.dataset.pd;if(k==='in')zoom(1.2);if(k==='out')zoom(1/1.2);if(k==='fit')fit();if(k==='svg')save('studio7-protection-six.svg',boardSVG(),'image/svg+xml');if(k==='json')save('studio7-protection-geometry.json',JSON.stringify(model,null,2),'application/json');if(k==='original')document.querySelector('[data-key="protection"]').click();});
 }
 return{build,draw,show,fit,boardSVG,get model(){return model;}};
})();
