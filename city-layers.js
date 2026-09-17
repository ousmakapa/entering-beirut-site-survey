/* Read-only section-perspectives. XY is the shared current building model; qualified Z only.
   Cropped strip views are not surveyed terrain sections. No persistence or network writes. */
window.CityLayers=(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg',W=1600,H=870;
 const C={ink:'#293e3b',muted:'#647771',line:'#a1b4ac',south:'#d8ad72',north:'#6ca9b8',middle:'#a7ba9a',seaside:'#637996',road:'#444f55',route:'#a96920',bridge:'#ba416d',plot:'#f7c44f',paper:'#fffefa'};
 const a=15*Math.PI/180,e=16*Math.PI/180,turn=8*Math.PI/180;
 const along=[Math.sin(a),Math.cos(a),0],depth=[Math.cos(a),-Math.sin(a),0];
 const dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
 const el=(name,attrs={},t)=>{const n=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(t!==undefined)n.textContent=t;return n;};
 const path=(p,close=false)=>p.map((q,i)=>(i?'L':'M')+q.map(x=>x.toFixed(3)).join(',')).join(' ')+(close?' Z':'');
 const txt=(g,x,y,t,size=14,color=C.ink,attrs={})=>g.appendChild(el('text',{x,y,fill:color,'font-size':size,...attrs},t));
 const line=(g,p,color=C.line,width=1,dash,attrs={})=>{const n=el('path',{d:path(p),fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round',...attrs});if(dash)n.setAttribute('stroke-dasharray',dash);g.appendChild(n);return n;};
 let host,svg,drawing,model,drag,state={scale:1,x:0,y:0};
 const specs=[
  {key:'A',title:'SEVEN SPATIAL CONDITIONS / ONE CONTINUOUS DRAWING',range:[-365,405,-130,155],box:[65,280,1470,250]}
 ];
 const conditions=[
  {id:1,key:'south',kind:'fabric',title:'NEIGHBOURHOOD FABRIC',story:['Close buildings and small streets shape','the southern approach through Street 52.']},
  {id:2,key:'highway',kind:'road corridor',title:'HIGHWAY / INTERRUPTION',story:['Fast east–west movement cuts across','the local north–south approach.']},
  {id:3,key:'bridge',kind:'crossing overlay',title:'C1 / CROSSING + STAIRS',story:['The bridge connects the two sides;','stairs interrupt a street-level journey.']},
  {id:4,key:'plot',kind:'bounded opening within middle fabric',title:'OUR PLOT / AN OPENING',story:['Unbuilt ground near the northern arrival.','Making it a transition is our design choice.']},
  {id:5,key:'middle',kind:'fabric and local street edge',title:'PLOT-SIDE BUILT FRONTAGES',story:['Street 80 continues beside existing buildings.','Our plot belongs to this intermediate strip.']},
  {id:6,key:'seaside',kind:'road seam',title:'SEASIDE ROAD / NEXT SEAM',story:['Street 80 meets another east–west route','before the larger northern fabric.']},
  {id:7,key:'north',kind:'fabric',title:'NORTHERN WORKING CONTEXT',story:['Larger footprints change the urban grain.','Their size alone does not establish their use.']}
 ];
 function build(){const base=NorthSouth.build();return{...base,version:'2026-09-17-city-layers-4',view:{type:'one orthographic section-perspective',along,depth,elevationDegrees:16,turnDegrees:8},strips:specs,conditions,
  bandMethod:'Five interpretive conditions follow sampled highway carriageway and Seaside Road traces. Highway uses a graphic 6m margin outside selected centrelines; Seaside seam uses 4m each side in transect coordinates. Neither is a surveyed right-of-way. Local movement is an overlay, not a sixth land-use band. Context tint is not land-use classification. No geometric explosion or new physical gap.',
  scope:'Existing site analysis. No project massing, new landscaping or proven sheltered interior. Context colours do not classify individual uses.',
  conditionMethod:'Seven spatial conditions share one continuous drawing: five context bands, with the source C1 crossing overlay and the actual unbuilt plot highlighted within the middle band. These are not seven independent land-use zones or seven building shells.',
  sectionMethod:'One cropped spatial strip on a flat reference datum. Black front line is the drawing cut; plinth is a graphic convention, not soil depth. Ground and bridge levels TBD. No terrain section or accessible continuous journey is certified.'};}
 function frame(m,p){const q=p.map((v,i)=>v-m.center[i]);return[dot(q,along),dot(q,depth),p[2]||0];}
 function world(m,p){return[m.center[0]+p[0]*along[0]+p[1]*depth[0],m.center[1]+p[0]*along[1]+p[1]*depth[1],p[2]||0];}
 // Sutherland–Hodgman: only the display is clipped. Exported source rings remain untouched.
 function clipRing(r,b){let p=r.map(q=>[...q]);for(const[axis,bound,sign]of [[0,b[0],1],[0,b[1],-1],[1,b[2],1],[1,b[3],-1]]){const out=[];for(let i=0;i<p.length;i++){const s=p[i],t=p[(i+1)%p.length],si=(s[axis]-bound)*sign>=-1e-8,ti=(t[axis]-bound)*sign>=-1e-8;if(si)out.push(s);if(si!==ti){const f=(bound-s[axis])/(t[axis]-s[axis]);out.push(s.map((v,j)=>v+f*(t[j]-v)));}}p=out;if(!p.length)break;}return p;}
 function clipLine(p,b){let lo=0,hi=1;for(let i=0;i<2;i++){const d=p[1][i]-p[0][i];if(Math.abs(d)<1e-9){if(p[0][i]<b[i*2]||p[0][i]>b[i*2+1])return null;}else{let t=(b[i*2]-p[0][i])/d,u=(b[i*2+1]-p[0][i])/d;if(t>u)[t,u]=[u,t];lo=Math.max(lo,t);hi=Math.min(hi,u);if(lo>hi)return null;}}return[lo,hi].map(t=>p[0].map((v,i)=>v+t*(p[1][i]-v)));}
 function draw(m){
  const s=el('svg',{xmlns:NS,viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':'City Layers: seven spatial conditions in one continuous north–south section-perspective','data-city-layers':'sheet'});
  s.appendChild(el('title',{},'From city layers to the plot'));
  s.appendChild(el('desc',{},m.scope+' '+m.conditionMethod+' '+m.sectionMethod));
  s.appendChild(el('style',{},'text{font-family:Arial,sans-serif}path,text,circle,rect{pointer-events:none}.cl-label{paint-order:stroke;stroke:#fffefa;stroke-width:4;stroke-linejoin:round}'));
  const defs=el('defs');s.appendChild(defs);const g=el('g',{'data-cl-drawing':'fixed'});s.appendChild(g);g.appendChild(el('rect',{width:W,height:H,fill:C.paper}));
  txt(g,65,38,'ENTERING BEIRUT  /  READING THE EXISTING CITY',12,C.muted,{'letter-spacing':'2'});
  txt(g,65,85,'One city. Interrupted local continuity.',39,C.ink,{'font-weight':'600'});
  txt(g,65,116,'Seven spatial conditions, read together—not seven separate zones.',19,C.muted);
  txt(g,1535,39,'LAYERS / 01',12,C.muted,{'text-anchor':'end'});
  line(g,[[65,142],[1535,142]],'#d5ded7');
  const ids=m.namedWays,bridgeIds=ids.bridgeAndSteps,highIds=ids.highway,localIds=[...ids.street80,...ids.street52];
  const hatch=el('pattern',{id:'cl-barrier-hatch',width:9,height:9,patternUnits:'userSpaceOnUse',patternTransform:'rotate(35)'});hatch.appendChild(el('path',{d:'M0 0 L0 9',stroke:'#fffefa','stroke-opacity':.36,'stroke-width':2}));defs.appendChild(hatch);
  const legends=[[C.south,'01 · Fabric'],[C.road,'02 · Road barrier'],[C.bridge,'03 · Crossing'],[C.plot,'04 · Plot opening'],[C.middle,'05 · Built edges'],[C.seaside,'06 · Road seam'],[C.north,'07 · Larger grain']];
  legends.forEach(([c,t],i)=>{const x=65+i*210;g.appendChild(el('rect',{x,y:164,width:13,height:8,fill:c}));txt(g,x+20,174,t,13,C.muted);});
  // Use the actual mapped lines to locate interpretive bands, rather than a freehand box.
  const framedRoads=m.roads.map(r=>({...r,uv:r.points.map(p=>frame(m,p))}));
  function crossingUs(v,wanted,fallback){const candidates=framedRoads.filter(r=>wanted.includes(r.id)),hits=[];let near=null,best=Infinity;
   for(const r of candidates){const[p,q]=r.uv,dv=q[1]-p[1];if(Math.abs(dv)<1e-7)continue;const t=(v-p[1])/dv,u=p[0]+t*(q[0]-p[0]);if(t>=0&&t<=1)hits.push(u);const distance=Math.min(Math.abs(v-p[1]),Math.abs(v-q[1]));if(distance<best){best=distance;near=u;}}
   return hits.length?hits:[near??fallback];
  }
  function bandEdges(v){const h=crossingUs(v,highIds,-50).filter(u=>u>-200&&u<100),r=h.length?h:[-50],s=crossingUs(v,[26316545,692400343],150),seam=Math.max(...s);return[Math.min(...r)-6,Math.max(...r)+6,seam-4,seam+4];}
  function scene(spec){
   const b=spec.range,[x,y,w,h]=spec.box;
   const bs=m.buildings.map(q=>({...q,display:q.rings.map(r=>clipRing(r.map(p=>frame(m,p)),b)).filter(r=>r.length>2)})).filter(q=>q.display.length);
   const raw=q=>[q[0]*Math.cos(turn)-q[1]*Math.sin(turn),(q[0]*Math.sin(turn)+q[1]*Math.cos(turn))*Math.sin(e)-q[2]*Math.cos(e)];
   const corners=[[b[0],b[2],0],[b[1],b[2],0],[b[1],b[3],0],[b[0],b[3],0]],samples=[...corners,...bs.flatMap(q=>q.display.flatMap(r=>r.map(p=>[p[0],p[1],q.height||q.minimumHeight||0])))].map(raw);
   const min=[0,1].map(i=>Math.min(...samples.map(p=>p[i]))),max=[0,1].map(i=>Math.max(...samples.map(p=>p[i]))),scale=Math.min(w/(max[0]-min[0]),(h-12)/(max[1]-min[1]));
   const project=q=>{const p=raw(q);return[x+w/2+(p[0]-(min[0]+max[0])/2)*scale,y+h-12+(p[1]-max[1])*scale];};
   const pg=p=>project(frame(m,p));
   const scene=el('g',{'data-cl-scene':spec.key,'data-scale':scale});g.appendChild(scene);
   const poly=(parent,r,attrs={})=>parent.appendChild(el('path',{d:r.map(q=>path(q.map(project),true)).join(' '),'fill-rule':'evenodd',...attrs}));
   const ground=[[b[0],b[2],0],[b[1],b[2],0],[b[1],b[3],0],[b[0],b[3],0]];
   poly(scene,[ground],{fill:'#f3f3eb',stroke:'#c3ccc3','stroke-width':.7});
   const steps=Array.from({length:33},(_,i)=>b[2]+(b[3]-b[2])*i/32),edges=steps.map(v=>bandEdges(v));
   const regions=[{key:'south',color:C.south,index:0},{key:'highway',color:C.road,index:1},{key:'middle',color:C.middle,index:2},{key:'seaside',color:C.seaside,index:3},{key:'north',color:C.north,index:4}];
   for(const region of regions){const k=region.index,left=steps.map((v,i)=>[k===0?b[0]:edges[i][k-1],v,0]),right=steps.map((v,i)=>[k===4?b[1]:edges[i][k],v,0]).reverse(),r=clipRing([...left,...right],b);if(r.length<3)continue;
    poly(scene,[r],{fill:region.color,'fill-opacity':k===1||k===3?.92:.3,'data-context-band':region.key});
    if(k===1)poly(scene,[r],{fill:'url(#cl-barrier-hatch)','data-barrier-hatch':'interpretive'});
    // A heavier coloured cut-edge makes the sequence legible before reading the captions.
    const lo=Math.max(b[0],k===0?b[0]:edges.at(-1)[k-1]),hi=Math.min(b[1],k===4?b[1]:edges.at(-1)[k]);
    if(hi>lo)line(scene,[[lo,b[3],0],[hi,b[3],0]].map(project),region.color,k===1?7:5);
   }
   // Presentation slab is deliberately shallow and explicitly not a terrain profile.
   poly(scene,[[[b[0],b[3],0],[b[1],b[3],0],[b[1],b[3],-3/scale],[b[0],b[3],-3/scale]]],{fill:'#738078','data-graphic-plinth':'not-terrain'});
   const roads=m.roads.map(r=>({...r,clipped:clipLine(r.points.map(p=>frame(m,p)),b)})).filter(r=>r.clipped);
   function road(r,over=false){const main=highIds.includes(r.id),bridge=bridgeIds.includes(r.id),local=localIds.includes(r.id),seaside=[26316545,692400343].includes(r.id);if(over&&!bridge&&!local)return;
    const width=main?8:bridge?3.8:local?3.2:seaside?4:1.2,color=main?C.road:bridge?C.bridge:local?C.route:seaside?C.seaside:'#b5c1b6';
    const [p,t]=r.clipped,dx=t[0]-p[0],dy=t[1]-p[1],len=Math.hypot(dx,dy)||1,n=[-dy/len*width/2,dx/len*width/2];
    const ribbon=clipRing([[p[0]+n[0],p[1]+n[1],0],[t[0]+n[0],t[1]+n[1],0],[t[0]-n[0],t[1]-n[1],0],[p[0]-n[0],p[1]-n[1],0]],b);
    poly(scene,[ribbon],{fill:color,'data-way':r.id,'data-level':'unknown-reference-datum'});
    if(main)line(scene,r.clipped.map(project),'#e4e9e5',Math.min(1.1,.4*scale),'6 5');
   }
   roads.forEach(r=>road(r));
   bs.sort((p,q)=>{const key=t=>{const f=frame(m,t.at);return f[1]*Math.cos(e)+(t.height||t.minimumHeight||0)*Math.sin(e);};return key(p)-key(q);});
   for(const q of bs){const bg=el('g',{'data-building':q.id,'data-height-status':q.status});scene.appendChild(bg);const at=frame(m,q.at),edges=bandEdges(at[1]),color=at[0]<edges[0]?C.south:at[0]>edges[3]?C.north:C.middle;
    poly(bg,q.display,{fill:color,'fill-opacity':.78,stroke:'#82978c','stroke-width':.7});
    const ht=q.height||q.minimumHeight;if(!ht)continue;
    if(q.height){for(const r of q.display){const sign=Math.sign(r.reduce((sum,p,i)=>sum+p[0]*r[(i+1)%r.length][1]-r[(i+1)%r.length][0]*p[1],0));for(let i=0;i<r.length;i++){const p=r[i],t=r[(i+1)%r.length];if(sign*((t[1]-p[1])*Math.sin(turn)-(t[0]-p[0])*Math.cos(turn))<=0)continue;
      poly(bg,[[p,t,[t[0],t[1],ht],[p[0],p[1],ht]]],{fill:color,stroke:'#94a69e','stroke-width':.7});
      for(let z=3.2;z<ht;z+=3.2)line(bg,[[p[0],p[1],z],[t[0],t[1],z]].map(project),'#a0aaa0',.38);
     }}poly(bg,q.display.map(r=>r.map(p=>[p[0],p[1],ht])),{fill:color,'fill-opacity':.88,stroke:'#7c968c','stroke-width':.75});
    }else for(const r of q.display){line(bg,[...r,r[0]].map(p=>project([p[0],p[1],ht])),'#8f9e95',.8,'3 3');for(const p of r)line(bg,[project(p),project([p[0],p[1],ht])],'#b1bbb2',.55,'3 3');}
   }
   // Route traces overlay context only as schematic lines, never an asserted deck section.
   roads.forEach(r=>road(r,true));
   const site=clipRing(m.site.map(p=>frame(m,p)),b);poly(scene,[site],{fill:C.plot,stroke:'#fffefa','stroke-width':6});poly(scene,[site],{fill:C.plot,stroke:'#765b20','stroke-width':2,'data-site':'unbuilt'});
   // C1 is deliberately readable across the dark corridor; no new crossing is drawn.
   for(const r of roads.filter(r=>bridgeIds.includes(r.id)))line(scene,r.clipped.map(project),C.bridge,spec.key==='A'?3:4,null,{'data-crossing-emphasis':r.id});
   for(const r of roads.filter(r=>localIds.includes(r.id)))line(scene,r.clipped.map(project),C.route,spec.key==='A'?2.3:2,null,{'data-local-connection':r.id});
   line(scene,[[b[0],b[3],0],[b[1],b[3],0]].map(project),C.ink,.8);
   txt(g,x,y+h+15,'SOUTH',10,C.muted);txt(g,x+w,y+h+15,'NORTH',10,C.muted,{'text-anchor':'end'});
   const call=(p,tx,ty,title,detail,color=C.ink)=>{const q=pg(p),above=ty<q[1],endY=above?ty+20:ty-16;line(g,[q,[tx,endY]],color,.8,'2 3');g.appendChild(el('circle',{cx:q[0],cy:q[1],r:2.7,fill:color}));
    // Fixed circular markers with simple lettering, in the reference's annotation rhythm.
    txt(g,tx,ty,title,14,color,{'text-anchor':'middle','font-weight':'600',class:'cl-label','data-label':title});if(detail)txt(g,tx,ty+17,detail,11,C.muted,{'text-anchor':'middle',class:'cl-label'});};
   const snap=(u,v,wanted)=>{let answer=null,best=Infinity;for(const r of roads.filter(r=>wanted.includes(r.id))){const [p,t]=r.clipped,dx=t[0]-p[0],dy=t[1]-p[1],f=Math.max(0,Math.min(1,((u-p[0])*dx+(v-p[1])*dy)/(dx*dx+dy*dy||1))),q=[p[0]+f*dx,p[1]+f*dy,0],d=Math.hypot(q[0]-u,q[1]-v);if(d<best){best=d;answer=world(m,q);}}return answer;};
   return{pg,call,snap,project,scale,buildings:bs};
  }
  const A=scene(specs[0]);
  // Seven readings on one continuous source-based drawing. No repeated detail scenes.
  function story(id,anchor,x,y,color,above){
   if(!anchor)throw new Error('Missing source anchor for condition '+id);
   const c=m.conditions.find(c=>c.id===id),q=A.pg(anchor),note=el('g',{'data-condition':id,'data-condition-kind':c.kind});
   g.appendChild(note);
   const joinY=above?y+64:y-22;
   line(note,[q,[x,joinY]],color,1.15,'3 4',{'data-condition-leader':id});
   note.appendChild(el('circle',{cx:q[0],cy:q[1],r:4,fill:color,stroke:C.paper,'stroke-width':1.5}));
   txt(note,x,y,String(id).padStart(2,'0')+'  '+c.title,15,color,{'font-weight':'600','text-anchor':'middle',class:'cl-label'});
   c.story.forEach((t,i)=>txt(note,x,y+25+i*19,t,14,C.ink,{'text-anchor':'middle',class:'cl-label','data-condition-story':id}));
  }
  story(1,world(m,[-255,20,0]),225,230,'#8b5921',true);
  story(3,A.snap(-50,0,[701135687]),590,230,C.bridge,true);
  const near=A.buildings.filter(q=>{const p=frame(m,q.at),ed=bandEdges(p[1]);return p[0]>ed[1]&&p[0]<ed[2]&&p[0]>35;})
   .sort((p,q)=>Math.hypot(frame(m,p.at)[0]-90,frame(m,p.at)[1]+15)-Math.hypot(frame(m,q.at)[0]-90,frame(m,q.at)[1]+15))[0];
  story(5,near?.at,980,230,'#526f40',true);
  story(7,world(m,[275,25,0]),1370,230,'#286e82',true);
  story(2,A.snap(-50,80,highIds),420,603,C.road,false);
  story(4,m.anchors.plot,815,603,'#8b641a',false);
  story(6,A.snap(160,0,[26316545,692400343]),1270,603,C.seaside,false);
  // Named local streets are anchored to their mapped traces, not generic detached tags.
  function street(uv,wanted,label,offset){
   const p=A.snap(...uv,wanted);if(!p)return;const q=A.pg(p);
   txt(g,q[0]+offset[0],q[1]+offset[1],label,13,C.route,{'font-weight':'600','text-anchor':'middle',class:'cl-label','data-fixed-street':label});
  }
  street([-220,0],ids.street52,'STREET 52',[0,-14]);
  street([100,15],ids.street80,'STREET 80',[0,-14]);
  const pq=A.pg(m.anchors.plot);txt(g,pq[0],pq[1]+22,'OUR PLOT',12,'#765b20',{'font-weight':'600','text-anchor':'middle',class:'cl-label'});
  line(g,[[65,692],[1535,692]],'#d5ded7');
  txt(g,65,725,'One local connection. Several changes in space.',23,C.ink,{'font-weight':'600'});
  txt(g,65,752,'Street 52, C1 and Street 80 link different urban conditions. Our plot sits near the northern arrival—not across the whole divide.',16,C.ink);
  txt(g,65,779,'DESIGN QUESTION  /  Could this opening become a connected, more sheltered transition?',17,C.ink,{'font-weight':'600'});
  txt(g,65,807,'Five context bands + one crossing + one opening. Colours do not define exclusive uses; the plot is not an existing public plaza.',12,C.muted);
  txt(g,65,825,'Solid heights = recorded floors × assumed 3.2 m · Dashed tops = visible minimum · Flat footprints = unknown height, not empty land',11,C.muted);
  txt(g,65,843,'Schematic ground / road widths; bridge levels and walking continuity VERIFY. No proposed massing. Source: current building model + © OpenStreetMap contributors.',11,C.muted);
  return s;
 }
 function transform(){drawing?.setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.scale})`);}
 function fit(){state={scale:1,x:0,y:0};transform();}
 function zoom(f,p=[W/2,H/2]){const next=Math.max(.6,Math.min(9,state.scale*f)),ratio=next/state.scale;state.x=p[0]-(p[0]-state.x)*ratio;state.y=p[1]-(p[1]-state.y)*ratio;state.scale=next;transform();}
 function exportSVG(){const s=svg.cloneNode(true);s.querySelector('[data-cl-drawing]').removeAttribute('transform');return new XMLSerializer().serializeToString(s);}
 function save(name,value,type){const u=URL.createObjectURL(new Blob([value],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
 function show(on){document.body.classList.toggle('citylayers-on',on);document.getElementById('workspace').classList.toggle('citylayers-mode',on);if(!on){if(host)host.hidden=true;return;}
  if(!host){host=document.createElement('section');host.id='city-layers-view';host.className='citylayers-view';document.querySelector('.map-shell').appendChild(host);}
  model=build();host.hidden=false;host.innerHTML='<div class="cl-toolbar"><strong>City Layers / 7 conditions · one drawing</strong><button data-cl="in" aria-label="Zoom in">+</button><button data-cl="out" aria-label="Zoom out">−</button><button data-cl="fit">Fit sheet</button><button data-cl="svg">Export SVG</button><button data-cl="json">Geometry & evidence</button><span>Scroll to zoom · drag to pan · fixed drawing</span></div><div class="cl-canvas"></div>';
  svg=draw(model);drawing=svg.querySelector('[data-cl-drawing]');host.querySelector('.cl-canvas').appendChild(svg);fit();
  host.querySelectorAll('[data-cl]').forEach(b=>b.onclick=()=>{const k=b.dataset.cl;if(k==='in')zoom(1.2);if(k==='out')zoom(1/1.2);if(k==='fit')fit();if(k==='svg')save('studio7-city-layers.svg',exportSVG(),'image/svg+xml');if(k==='json')save('studio7-city-layers-geometry.json',JSON.stringify(model,null,2),'application/json');});
  const pos=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return[q.x,q.y];};
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),pos(e));},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={p:pos(e),x:state.x,y:state.y,id:e.pointerId};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=pos(e);state.x=drag.x+p[0]-drag.p[0];state.y=drag.y+p[1]-drag.p[1];transform();});
  svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
 }
 return{show,fit,build,draw,exportSVG,frame,clipRing,clipLine,get model(){return model;}};
})();
