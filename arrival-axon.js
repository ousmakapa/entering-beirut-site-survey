/* Architectural arrival study: preserved XY, qualified storey masses, source-way traces.
   A read-only drawing, never a navigation route or an accessibility certification. */
window.ArrivalAxon=(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg',RADIUS=245;
 const colors={north:'#287c80',south:'#bb7058',bridge:'#925b79',steps:'#ad493f',plot:'#aa8749'};
 const yaw=25*Math.PI/180,elev=42*Math.PI/180;
 const right=[Math.cos(yaw),Math.sin(yaw),0],down=[Math.sin(elev)*Math.sin(yaw),-Math.sin(elev)*Math.cos(yaw),-Math.cos(elev)],camera=[Math.cos(elev)*Math.sin(yaw),-Math.cos(elev)*Math.cos(yaw),Math.sin(elev)];
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const xy=p=>{const q=ArchitecturalMap.project(p);return[q[0],-q[1],0];};
 const path=(p,closed=false)=>p.map((v,i)=>(i?'L':'M')+v.map(n=>n.toFixed(3)).join(',')).join(' ')+(closed?' Z':'');
 const el=(n,a={},text)=>{const e=document.createElementNS(NS,n);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
 let host,svg,drawing,model,drag,state={scale:1,x:0,y:0};
 function build(){
  const {solar,solarMethod,view,...base}=SunAxon.build(BuildingMap.model(),RADIUS);
  const approaches=[
   {key:'north',title:'Street 80',ids:[275315121],color:colors.north,meaning:'Northern same-side road approach. Sidewalk continuity is unverified.'},
   {key:'south',title:'Street 52',ids:[306996681,715531021],color:colors.south,meaning:'Southern road components toward the crossing. Not a mapped pedestrian route.'},
   {key:'bridge',title:'C1 footbridge',ids:[701135687],color:colors.bridge,meaning:'Source-mapped pedestrian bridge. Drawn at Z=0 as a plan trace, not a measured deck.'},
   {key:'steps',title:'Both stair approaches',ids:[701135688,270786366],color:colors.steps,meaning:'Source-mapped stairs; rise, condition and alternatives TBD.'}
  ].map(a=>({...a,segments:base.roads.filter(r=>a.ids.includes(r.id))}));
  return{...base,version:'2026-09-16-arrival-axon-1',view:{type:'orthographic',right,down,camera,azimuthFromSouthDegrees:25,elevationDegrees:42},studyRadiusMetres:RADIUS,
   scope:'Close study of the two nearest approaches, not the whole urban access network. Source road/bridge components are not joined across gaps. No bus stops, drop-off bay, ramp or entrance is invented.',
   heightDatum:'Flat schematic ground Z=0. Bridge and road levels are unknown; coloured traces remain at Z=0 and are NOT a built section.',approaches,
   anchors:{north:xy([33.8970087,35.5415606]),south:xy([33.895269,35.5407867]),bridge:xy([33.89612,35.540951]),edge:xy([33.89657,35.541311]),seaside:xy([33.8979289,35.5419412]),highway:xy([33.89591,35.5421754])}};
 }
 function draw(m){
  const s=el('svg',{xmlns:NS,viewBox:'-282 -209 564 418',role:'img','aria-label':'Arrival axonometric: Street 80, Street 52, the footbridge, mapped stairs and our plot','data-arrival-axon':'drawing'});
  s.appendChild(el('title',{},'Two approaches. One arrival to resolve.'));
  s.appendChild(el('desc',{},m.scope+' '+m.heightDatum));
  s.appendChild(el('style',{},'text{font-family:Arial,sans-serif;paint-order:stroke;stroke:#faf9f5;stroke-width:1.6;stroke-linejoin:round}path,text,circle,rect{pointer-events:none}'));
  const defs=el('defs'),clip=el('clipPath',{id:'aa-context-clip'});clip.appendChild(el('rect',{x:-254,y:-172,width:508,height:338}));defs.appendChild(clip);s.appendChild(defs);
  const g=el('g',{'data-arrival-drawing':'fixed'});s.appendChild(g);
  const project=q=>{const p=q.map((v,i)=>v-(m.center[i]||0));return[dot(right,p),dot(down,p)];};
  const line=(parent,p,color,width=.6,dash,attrs={})=>{const n=el('path',{d:path(p),fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',...attrs});if(dash)n.setAttribute('stroke-dasharray',dash);parent.appendChild(n);return n;};
  const txt=(x,y,t,size=6,color='#46564f',attrs={})=>g.appendChild(el('text',{x,y,fill:color,'font-size':size,...attrs},t));
  const context=el('g',{'data-layer':'context','clip-path':'url(#aa-context-clip)'});g.appendChild(context);
  const ground=el('g',{'data-layer':'ground'});context.appendChild(ground);
  for(const r of m.roads){const highway=/^motorway/.test(r.type),sea=/^trunk/.test(r.type);line(ground,r.points.map(project),highway?'#d3d0c7':sea?'#dcd9d0':'#e0e1d9',highway?5:sea?3:1);}
  const footprints=el('g',{'data-layer':'footprints'});context.appendChild(footprints);
  for(const b of m.buildings)footprints.appendChild(el('path',{d:b.rings.map(r=>path(r.map(project),true)).join(' '),'fill-rule':'evenodd',fill:'#f0f0e9',stroke:'#c2c7be','stroke-width':.45,'data-building':b.id,'data-height-status':b.status}));
  const masses=el('g',{'data-layer':'masses'});context.appendChild(masses);
  for(const b of [...m.buildings].sort((a,b)=>dot(camera,a.at)-dot(camera,b.at))){
   const h=b.height||b.minimumHeight;if(!h)continue;
   const group=el('g',{'data-building':b.id,'data-height':h,'data-height-status':b.status});masses.appendChild(group);
   if(b.height){
    for(const[ri,r]of b.rings.entries()){
     const sign=Math.sign(r.reduce((sum,p,i)=>sum+p[0]*r[(i+1)%r.length][1]-r[(i+1)%r.length][0]*p[1],0))*(ri?-1:1);
     for(let i=0;i<r.length;i++){const a=r[i],c=r[(i+1)%r.length];if(sign*((c[1]-a[1])*camera[0]-(c[0]-a[0])*camera[1])<=0)continue;
      group.appendChild(el('path',{d:path([a,c,[c[0],c[1],h],[a[0],a[1],h]].map(project),true),fill:Math.abs(c[0]-a[0])>Math.abs(c[1]-a[1])?'#dcdfd4':'#e8eae2',stroke:'#aeb5a7','stroke-width':.4}));
     }
    }
    group.appendChild(el('path',{d:b.rings.map(r=>path(r.map(p=>project([p[0],p[1],h])),true)).join(' '),'fill-rule':'evenodd',fill:'#fafaf5',stroke:'#a5ad9e','stroke-width':.5}));
   }else for(const r of b.rings){line(group,[...r,r[0]].map(p=>project([p[0],p[1],h])),'#b4b5a6',.4,'2 1.5');for(const p of r)line(group,[project(p),project([p[0],p[1],h])],'#bfc2b5',.3,'2 1.5');}
  }
  const plot=el('path',{d:path(m.site.map(project),true),fill:'#e6d2a1',stroke:colors.plot,'stroke-width':1.4,'data-layer':'plot'});context.appendChild(plot);
  // Source components only: never interpolate a pavement or a route across a gap.
  const routes=el('g',{'data-layer':'approaches'});context.appendChild(routes);
  for(const a of m.approaches)for(const r of a.segments){const p=r.points.map(project);line(routes,p,'#faf9f5',a.key==='bridge'?4.5:3.5);line(routes,p,a.color,a.key==='steps'?1.4:a.key==='bridge'?2.4:1.9,a.key==='bridge'?'3 1':null,{'data-way':r.id,'data-approach':a.key,'data-z':'0'});
   if(a.key==='steps'){const [u,v]=p,dx=v[0]-u[0],dy=v[1]-u[1],length=Math.hypot(dx,dy);if(length)for(let t=.15;t<1;t+=.25){const x=u[0]+t*dx,y=u[1]+t*dy;line(routes,[[x-2*dy/length,y+2*dx/length],[x+2*dy/length,y-2*dx/length]],a.color,.8);}}
  }
  function call(anchor,to,title,detail,color,icon){const q=project(anchor),turn=[to[0],q[1]];line(g,[q,turn,[to[0],to[1]+5]],color,.55,'1.4 1.6');g.appendChild(el('rect',{x:q[0]-1.8,y:q[1]-1.8,width:3.6,height:3.6,fill:'#faf9f5',stroke:color,'stroke-width':.8}));
   const cx=to[0],cy=to[1]-4;g.appendChild(el('circle',{cx,cy,r:8.5,fill:'#faf9f5',stroke:color,'stroke-width':.7}));
   if(icon==='walk'){g.appendChild(el('circle',{cx,cy:cy-3,r:1.1,fill:color}));line(g,[[cx,cy-1],[cx-1,cy+2],[cx-3,cy+5]],color,.8);line(g,[[cx-1,cy+2],[cx+2,cy+5]],color,.8);line(g,[[cx-3,cy+1],[cx,cy-1],[cx+3,cy+1]],color,.8);}
   if(icon==='stairs')line(g,[[cx-4,cy+3],[cx-1,cy+3],[cx-1,cy],[cx+2,cy],[cx+2,cy-3],[cx+5,cy-3]],color,1);
   if(icon==='entry'){line(g,[[cx-3,cy+4],[cx-3,cy-4],[cx+3,cy-4],[cx+3,cy+4]],color,.8);line(g,[[cx-5,cy+1],[cx+1,cy+1],[cx-1,cy-1]],color,.8);}
   txt(cx+12,cy-1,title,8,color,{'font-weight':'bold','data-label':title});txt(cx+12,cy+8,detail,5.5,'#66736a');
  }
  call(m.anchors.north,[100,-119],'STREET 80','North / same-side approach',colors.north,'walk');
  call(m.anchors.south,[-210,127],'STREET 52','South / towards the bridge',colors.south,'walk');
  call(m.anchors.bridge,[83,93],'FOOTBRIDGE + STAIRS','Plan trace / bridge levels TBD',colors.bridge,'stairs');
  call(m.anchors.edge,[125,-8],'ARRIVAL EDGE','Entrance position to test',colors.plot,'entry');
  const q=project(m.center);line(g,[q,[-89,0],[-89,-37]],colors.plot,.65);txt(-147,-43,'OUR PLOT',9,colors.plot,{'font-weight':'bold'});txt(-147,-33,'Keep the threshold clear',5.8);
  // Street names use exact source anchors, not a copied reference-image label.
  const sea=project(m.anchors.seaside);line(g,[sea,[97,-165]],'#98988c',.45);txt(101,-164,'SEASIDE ROAD',6.2,'#81867a',{'font-weight':'bold'});
  const h=project(m.anchors.highway);line(g,[h,[186,51]],'#8b8b80',.45);txt(190,53,'HIGHWAY',6.5,'#7d8175',{'font-weight':'bold'});
  // A true projected north direction, not the screen's vertical axis.
  const n0=[-228,-144],north=project([m.center[0],m.center[1]+32,0]);line(g,[n0,[n0[0]+north[0],n0[1]+north[1]]],'#617265',.8);const end=[n0[0]+north[0],n0[1]+north[1]],a=Math.atan2(north[1],north[0]);line(g,[[end[0]-5*Math.cos(a-.4),end[1]-5*Math.sin(a-.4)],end,[end[0]-5*Math.cos(a+.4),end[1]-5*Math.sin(a+.4)]],'#617265',.8);txt(end[0]-2,end[1]-7,'N',8,'#617265');
  line(g,[[-241,177],[241,177]],'#d6d9cc',.5);
  txt(-241,189,'APPROACH',6.5,colors.north,{'font-weight':'bold'});txt(-142,189,'CROSSING',6.5,colors.bridge,{'font-weight':'bold'});txt(-37,189,'LANDING',6.5,colors.bridge,{'font-weight':'bold'});txt(67,189,'THRESHOLD',6.5,colors.plot,{'font-weight':'bold'});txt(178,189,'INSIDE',6.5,'#617265',{'font-weight':'bold'});
  txt(-241,201,'Resolve the gaps between each part — no continuous step-free route is verified yet.',5.7,'#748173');
  return s;
 }
 function transform(){drawing?.setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.scale})`);}
 function fit(){state={scale:1,x:0,y:0};transform();}
 function zoom(f,at=[0,0]){const next=Math.max(.55,Math.min(6,state.scale*f)),r=next/state.scale;state.x=at[0]-(at[0]-state.x)*r;state.y=at[1]-(at[1]-state.y)*r;state.scale=next;transform();}
 function save(name,content,type){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
 function exportSVG(){const clone=svg.cloneNode(true);clone.querySelector('[data-arrival-drawing]').removeAttribute('transform');return new XMLSerializer().serializeToString(clone);}
 function show(on){
  document.body.classList.toggle('arrivalaxon-on',on);document.getElementById('workspace').classList.toggle('arrivalaxon-mode',on);if(!on){if(host)host.hidden=true;return;}
  if(!host){host=document.createElement('section');host.id='arrival-axon-view';host.className='sunaxon-view arrivalaxon-view';document.querySelector('.map-shell').appendChild(host);}
  model=build();host.hidden=false;
  host.innerHTML=`<div class="sa-sheet"><header><span>ARRIVAL / A STUDY IN THREE DIMENSIONS</span><h1>Two approaches. One arrival to resolve.</h1><p>Our plot between Street 80 and the southern footbridge approach.</p></header><div class="sa-canvas"></div><div class="sa-toolbar"><button data-aa="in" aria-label="Zoom in">+</button><button data-aa="out" aria-label="Zoom out">−</button><button data-aa="fit">Fit drawing</button><span>Scroll to zoom · drag to pan</span></div><footer><span><i style="background:#287c80"></i>Street 80 · road trace</span><span><i style="background:#bb7058"></i>Street 52 · road traces</span><span><i style="background:#925b79"></i>Footbridge · plan trace</span><span><i style="background:#ad493f"></i>Crossbars · mapped steps</span></footer></div><aside class="sa-story"><span class="sa-kicker">ARRIVAL / OUR PLOT</span><h2>Getting close is not the same as getting in.</h2><p>From the north, <b>Street 80</b> approaches our plot on the same side of the highway. It bends beside the eastern and southern edge. This is where I would test a clear public arrival, while checking the pavement, kerbs and delivery movements before choosing the door.</p><p>From the south, <b>Street 52</b> brings the neighbourhood towards the highway and nearby <b>footbridge</b>. The bridge has mapped stairs at both ends. It creates a crossing opportunity, but the stair route and the gap between landing and entrance cannot yet be called independently usable by everyone.</p><p>Our project should make that final arrival easy to recognise: a sheltered place to pause, a clear route through the threshold, and services kept out of the waiting space. The ochre edge is an <b>entrance study</b>, not a fixed door or an approved drop-off.</p><div class="sa-caution"><b>What the 3D can—and cannot—tell us</b><p>The building outlines come from our current map. Solid masses use recorded floor totals with the same assumed floor height as Sun · 3D. Dashed masses show minimum-only evidence; flat outlines have unknown heights.</p><p>The coloured streets and bridge stay on a flat reference plane. They show their mapped position, not pavement width, gradients or bridge elevation. No new ramp, bus stop or step-free route has been invented.</p></div><details><summary>Evidence & what to verify</summary><p>Street 80: OSM way 275315121. Street 52: 306996681 / 715531021. C1 bridge: 701135687. Stairs: 701135688 / 270786366. Source geometry is preserved; separate components are not joined across gaps.</p><p>Priority visit: both bridge ends, the Street 80 bend and the whole kerb-to-entrance connection. Measure levels, clear passing space and any existing stair alternative. Check wet-weather and evening conditions as well as deliveries.</p><p>This is a close study of the two nearest approaches. The wider western/Armenia and eastern crossing questions remain in the original Arrival & Accessibility map.</p><p><a href="accessibility-research.html#evidence" target="_blank" rel="noopener">Site accessibility evidence</a> · <a href="https://www.openstreetmap.org/way/701135687" target="_blank" rel="noopener">Mapped bridge</a></p><p>Two student-supplied axonometric references informed the pale masses, coloured routes and anchored leaders. Their unrelated buildings and transport amenities have not been copied. Original reference authors/URLs TBD.</p></details><div class="sa-exports"><button data-aa="svg">Vector drawing · SVG</button><button data-aa="json">Geometry & evidence · JSON</button><button data-aa="plan">Original accessibility map</button></div><p class="sa-small">Fixed drawing labels—not clickable tags. No survey records, photos or browser storage are changed by this section.</p></aside>`;
  svg=draw(model);drawing=svg.querySelector('[data-arrival-drawing]');host.querySelector('.sa-canvas').appendChild(svg);fit();
  host.querySelectorAll('[data-aa]').forEach(b=>b.onclick=()=>{const k=b.dataset.aa;if(k==='in')zoom(1.2);if(k==='out')zoom(1/1.2);if(k==='fit')fit();if(k==='svg')save('studio7-arrival-axon.svg',exportSVG(),'image/svg+xml');if(k==='json')save('studio7-arrival-geometry.json',JSON.stringify(model,null,2),'application/json');if(k==='plan')document.querySelector('[data-key="accessibility"]').click();});
  const loc=e=>{const q=svg.createSVGPoint();q.x=e.clientX;q.y=e.clientY;const p=q.matrixTransform(svg.getScreenCTM().inverse());return[p.x,p.y];};
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),loc(e));},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={p:loc(e),x:state.x,y:state.y,id:e.pointerId};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=loc(e);state.x=drag.x+p[0]-drag.p[0];state.y=drag.y+p[1]-drag.p[1];transform();});
  svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
 }
 return{build,draw,show,fit,get model(){return model;}};
})();
