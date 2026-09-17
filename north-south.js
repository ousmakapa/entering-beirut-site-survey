/* Site analysis, not proposed massing. Shared corrected XY and evidence-qualified Z.
   One fixed vector sheet; no data, storage, synchronization or assignment writes. */
window.NorthSouth=(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg',RADIUS=650;
 const C={ink:'#324746',muted:'#718481',north:'#9fc7d5',south:'#dbca9f',route:'#d48c3e',bridge:'#ad6078',highway:'#87939b',water:'#bedee5',plot:'#e9bd58'};
 const highIds=[200611932,237737315,692409629],northIds=[275315121],southIds=[306996681,715531021],bridgeIds=[701135687,701135688,270786366];
 const yaw=25*Math.PI/180,elev=46*Math.PI/180;
 const right=[Math.cos(yaw),Math.sin(yaw),0],down=[Math.sin(elev)*Math.sin(yaw),-Math.sin(elev)*Math.cos(yaw),-Math.cos(elev)],camera=[Math.cos(elev)*Math.sin(yaw),-Math.cos(elev)*Math.cos(yaw),Math.sin(elev)];
 const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),xy=p=>{const q=ArchitecturalMap.project(p);return[q[0],-q[1],0];};
 const el=(name,a={},t)=>{const n=document.createElementNS(NS,name);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v));if(t!==undefined)n.textContent=t;return n;};
 const path=(pts,closed=false)=>pts.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(3)).join(',')).join(' ')+(closed?' Z':'');
 const line=(parent,pts,color,width=1,dash,attrs={})=>{const n=el('path',{d:path(pts),stroke:color,'stroke-width':width,fill:'none','stroke-linecap':'round','stroke-linejoin':'round',...attrs});if(dash)n.setAttribute('stroke-dasharray',dash);parent.appendChild(n);return n;};
 const text=(parent,x,y,t,size=14,color=C.ink,a={})=>parent.appendChild(el('text',{x,y,'font-size':size,fill:color,...a},t));
 let host,svg,drawing,model,state={scale:1,x:0,y:0},drag;
 function build(){
  const {solar,solarMethod,view,...base}=SunAxon.build(BuildingMap.model(),RADIUS),features=BuildingMap.model().features;
  const zones=CONNECTIONS_DATA.zones,context={};
  for(const b of base.buildings){const f=features.find(f=>f.id===b.id);context[b.id]=zones.some(z=>['north','middle'].includes(z.id)&&BuildingMap.contains(f.at,[z.ring]))?'north':zones.some(z=>z.id==='south'&&BuildingMap.contains(f.at,[z.ring]))?'south':'other';}
  const water=[];function rings(r){if(typeof r?.[0]?.[0]==='number')water.push(r.map(xy));else if(Array.isArray(r))r.forEach(rings);}
  PICTURES_NEW_DATA.base.filter(f=>!f.building&&f.polygon&&f.color==='#2469b9').forEach(f=>rings(f.polygon));
  // Anchor named streets to their own mapped segments, not approximate text pin coordinates.
  const snap=(at,ids)=>{const p=xy(at);let best=p,distance=Infinity;for(const r of base.roads.filter(r=>ids.includes(r.id))){const [a,b]=r.points,d=b.map((v,i)=>v-a[i]),len=dot(d,d),t=Math.max(0,Math.min(1,len?dot(p.map((v,i)=>v-a[i]),d)/len:0)),q=a.map((v,i)=>v+t*d[i]),dist=Math.hypot(...q.map((v,i)=>v-p[i]));if(dist<distance){best=q;distance=dist;}}return best;};
  return{...base,version:'2026-09-16-north-south-1',studyRadiusMetres:RADIUS,view:{right,down,camera,type:'orthographic',azimuthFromSouthDegrees:25,elevationDegrees:46},context,water,
   classification:'Blue and sand distinguish approximate north-side / south-side study context, NOT building use, ownership, identity or a surveyed district boundary.',
   scope:'Existing site only. Street 52, C1 and Street 80 are source components, not a verified continuous accessible journey. No new crossing, entrance, project building or landscape is proposed.',
   heightDatum:'Flat reference ground. All street and bridge traces remain at Z=0; levels and gradients TBD.',
   namedWays:{highway:highIds,street80:northIds,street52:southIds,bridgeAndSteps:bridgeIds},
   anchors:{plot:base.center,street80:snap([33.8970087,35.5415606],northIds),street52:snap([33.89485,35.54045],southIds),bridge:snap([33.89612,35.540951],[701135687]),highway:snap([33.89591,35.5421754],highIds),seaside:snap([33.8979289,35.5419412],[26316545,692400343]),north:xy([33.89915,35.54365]),south:xy([33.8936,35.5404]),river:xy([33.8968,35.5368])}};
 }
 function draw(m){
  const s=el('svg',{xmlns:NS,viewBox:'0 0 1400 1160',role:'img','aria-label':'North and south: actual site axonometric, highway, existing bridge, Street 52 and Street 80','data-north-south':'sheet'});
  s.appendChild(el('title',{},'Across the highway — a connection in layers'));
  s.appendChild(el('desc',{},m.scope+' '+m.classification+' '+m.heightDatum));
  s.appendChild(el('style',{},'text{font-family:Arial,sans-serif}path,text,circle,rect,polygon{pointer-events:none}.ns-call{paint-order:stroke;stroke:#fffefa;stroke-width:5;stroke-linejoin:round}'));
  const defs=el('defs');s.appendChild(defs);const g=el('g',{'data-ns-drawing':'fixed'});s.appendChild(g);
  g.appendChild(el('rect',{width:1400,height:1160,fill:'#fffefa'}));
  text(g,50,45,'ENTERING BEIRUT     /     SITE RELATIONSHIPS',12,C.muted,{'letter-spacing':'2'});
  text(g,50,91,'Across the highway',40,C.ink,{'font-weight':'600'});
  text(g,50,122,'North and south are already linked. Our plot sits beside a crossing—not across the whole divide.',17,C.muted);
  text(g,1348,47,'01 / NORTH–SOUTH',12,C.muted,{'text-anchor':'end'});
  line(g,[[50,144],[1350,144]],'#d7dfdb',1);
  const raw=p=>{const q=p.map((v,i)=>v-(m.center[i]||0));return[dot(right,q),dot(down,q)];};
  // All scenes share one orthographic camera. Fit uses mapped context, never stretched axes.
  const bounds=m.buildings.flatMap(b=>b.rings.flatMap(r=>r.map(raw)));
  const min=[0,1].map(i=>Math.min(...bounds.map(p=>p[i]))),max=[0,1].map(i=>Math.max(...bounds.map(p=>p[i])));
  const mid=min.map((v,i)=>(v+max[i])/2);
  function scene(box,key,mode){
   const [x,y,w,h]=box,scale=Math.min(w/(max[0]-min[0]),h/(max[1]-min[1]));
   const project=p=>{const q=raw(p);return[x+w/2+(q[0]-mid[0])*scale,y+h/2+(q[1]-mid[1])*scale];};
   const cp=el('clipPath',{id:'ns-clip-'+key});cp.appendChild(el('rect',{x,y,width:w,height:h}));defs.appendChild(cp);
   const scene=el('g',{'clip-path':'url(#ns-clip-'+key+')','data-ns-scene':key});g.appendChild(scene);
   const poly=(parent,rings,a)=>parent.appendChild(el('path',{d:rings.map(r=>path(r.map(project),true)).join(' '),'fill-rule':'evenodd',...a}));
   for(const r of m.water)poly(scene,[r],{fill:C.water,opacity:mode==='hero'?.55:.4});
   for(const r of m.roads){const main=/^(motorway|trunk)/.test(r.type);line(scene,r.points.map(project),main?'#d9dddc':'#e5e9e5',(main?3.3:.8)*scale);}
   const buildings=el('g',{'data-layer':'buildings'});scene.appendChild(buildings);
   for(const b of [...m.buildings].sort((a,b)=>dot(camera,a.at)-dot(camera,b.at))){
    const region=m.context[b.id],tint=region==='north'?C.north:region==='south'?C.south:'#dfe4de',colored=mode==='hero'||mode==='fabric';
    const fill=colored?tint:'#e1e5de',height=b.height||b.minimumHeight;
    const bg=el('g',{'data-building':b.id,'data-height-status':b.status,'data-context':region});buildings.appendChild(bg);
    poly(bg,b.rings,{fill,opacity:colored?.42:.38,stroke:colored?'#b1bbb7':'#c2c9c4','stroke-width':.48*scale});
    if(!height)continue;
    if(b.height){
     for(const [ri,r]of b.rings.entries()){const sign=Math.sign(r.reduce((sum,p,i)=>sum+p[0]*r[(i+1)%r.length][1]-r[(i+1)%r.length][0]*p[1],0))*(ri?-1:1);
      for(let i=0;i<r.length;i++){const a=r[i],c=r[(i+1)%r.length];if(sign*((c[1]-a[1])*camera[0]-(c[0]-a[0])*camera[1])<=0)continue;
       const face=[a,c,[c[0],c[1],height],[a[0],a[1],height]];poly(bg,[face],{fill,stroke:'#9baaa7','stroke-width':.42*scale});
       if(mode==='hero')for(let z=3.2;z<height;z+=3.2)line(bg,[[a[0],a[1],z],[c[0],c[1],z]].map(project),'#95a7a5',.27*scale);
      }
     }
     poly(bg,b.rings.map(r=>r.map(p=>[p[0],p[1],height])),{fill:colored?fill:'#f1f1eb',stroke:'#9aaba7','stroke-width':.6*scale});
    }else for(const r of b.rings){line(bg,[...r,r[0]].map(p=>project([p[0],p[1],height])),'#91a3a0',.55*scale,'2 2');for(const p of r)line(bg,[project(p),project([p[0],p[1],height])],'#aab8b1',.35*scale,'2 2');}
   }
   if(mode!=='fabric')for(const r of m.roads.filter(r=>highIds.includes(r.id))){line(scene,r.points.map(project),'#fffefa',7*scale);line(scene,r.points.map(project),C.highway,4.5*scale,null,{'data-highway':r.id});}
   if(mode==='hero'||mode==='link')for(const r of m.roads.filter(r=>[...northIds,...southIds,...bridgeIds].includes(r.id))){const bridge=bridgeIds.includes(r.id),p=r.points.map(project);line(scene,p,'#fffefa',7*scale);line(scene,p,bridge?C.bridge:C.route,(bridge?4.5:3.5)*scale,null,{'data-route':r.id,'data-z':'0'});}
   poly(scene,[m.site],{fill:C.plot,stroke:'#806539','stroke-width':1.7*scale,'data-site':'unbuilt'});
   if(mode==='hero'||mode==='link'){const q=project(m.anchors.bridge);for(const radius of [9,14])scene.appendChild(el('circle',{cx:q[0],cy:q[1],r:radius*scale,stroke:C.bridge,fill:'none','stroke-width':.8*scale}));}
   return{project,scale};
  }
  const hero=scene([100,175,1200,585],'main','hero');
  function call(anchor,tx,ty,title,detail,color=C.ink){const q=hero.project(anchor),left=tx<400,end=left?tx+255:tx-12;line(g,[q,[end,ty-5],[end+(left?-9:9),ty-5]],color,.8);g.appendChild(el('circle',{cx:q[0],cy:q[1],r:2.8,fill:color}));text(g,tx,ty,title,15,color,{'font-weight':'bold',class:'ns-call','data-label':title});if(detail)text(g,tx,ty+19,detail,12,C.muted,{class:'ns-call'});}
  call(m.anchors.north,900,196,'NORTH SIDE','Larger footprints in a mixed urban fabric','#4d8c9e');
  call(m.anchors.seaside,1070,318,'SEASIDE ROAD','Onward northern street—not the shoreline','#577c83');
  call(m.anchors.street80,990,402,'STREET 80','Northern approach beside our plot','#b57b2e');
  call(m.anchors.plot,935,500,'OUR PLOT','Unbuilt · beside the northern arrival','#977022');
  call(m.anchors.highway,1000,604,'HIGHWAY','Regional link / local crossing barrier','#687c87');
  call(m.anchors.bridge,82,422,'C1 FOOTBRIDGE','Existing crossing + mapped stairs',C.bridge);
  call(m.anchors.street52,82,592,'STREET 52','Southern approach towards the bridge','#b57b2e');
  call(m.anchors.south,670,745,'SOUTH SIDE','Finer streets and mixed neighbourhood fabric','#a48948');
  call(m.anchors.river,66,270,'BEIRUT RIVER','A separate east–west crossing question','#659da8');
  // Projected north is computed from the camera, not assumed to be screen-up.
  const n=raw([m.center[0],m.center[1]+40,0]),o=[1290,215],tip=[o[0]+n[0],o[1]+n[1]],ang=Math.atan2(n[1],n[0]);line(g,[o,tip],C.ink,1.4);line(g,[[tip[0]-7*Math.cos(ang-.4),tip[1]-7*Math.sin(ang-.4)],tip,[tip[0]-7*Math.cos(ang+.4),tip[1]-7*Math.sin(ang+.4)]],C.ink,1.4);text(g,tip[0]-4,tip[1]-8,'N',13);
  const legend=[['#9fc7d5','North-side context'],['#dbca9f','South-side context'],[C.highway,'Highway'],[C.route,'Local approach streets'],[C.bridge,'Existing bridge + stairs'],[C.plot,'Our plot']];
  legend.forEach(([c,t],i)=>{const x=58+i*220;g.appendChild(el('rect',{x,y:789,width:13,height:7,fill:c}));text(g,x+20,797,t,11,C.muted);});
  text(g,58,820,'Colours locate relationships, not building functions. Road strokes are diagrammatic—not pavement widths or measured flows.',11,C.muted);
  line(g,[[50,840],[1350,840]],'#d7dfdb',1);
  const minis=[['01','TWO URBAN FABRICS','fabric','Different grain on each side; neither side has only one use.'],['02','THE CROSSWISE BARRIER','barrier','The highway links the city but concentrates local crossings.'],['03','THE EXISTING LOCAL LINK','link','Street 52 → C1 → plot-side arrival → Street 80.']];
  minis.forEach(([number,title,mode,caption],i)=>{const x=50+i*442;text(g,x,871,number,13,C.muted);text(g,x+28,871,title,13,C.ink,{'font-weight':'bold'});scene([x,887,410,149],'detail-'+i,mode);text(g,x,1058,caption,10.8,C.muted);});
  line(g,[[50,1080],[1350,1080]],'#d7dfdb',1);
  text(g,50,1104,'The question for our plot: how can the connection continue without leaving arrival exposed?',16,C.ink,{'font-weight':'bold'});
  text(g,50,1127,'Existing corrected footprints · Solid height = recorded floors × assumed 3.2 m · Dashed = visible minimum · Flat = height unknown',10.7,C.muted);
  text(g,50,1145,'Bridge and roads shown at reference level, not a surveyed section. Landing, pavement continuity and entrance remain VERIFY. © OpenStreetMap contributors',10.7,C.muted);
  return s;
 }
 function transform(){drawing?.setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.scale})`);}
 function fit(){state={scale:1,x:0,y:0};transform();}
 function zoom(f,p=[700,580]){const next=Math.max(.6,Math.min(8,state.scale*f)),r=next/state.scale;state.x=p[0]-(p[0]-state.x)*r;state.y=p[1]-(p[1]-state.y)*r;state.scale=next;transform();}
 function exportSVG(){const clone=svg.cloneNode(true);clone.querySelector('[data-ns-drawing]').removeAttribute('transform');return new XMLSerializer().serializeToString(clone);}
 function save(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 function show(on){
  document.body.classList.toggle('northsouth-on',on);document.getElementById('workspace').classList.toggle('northsouth-mode',on);if(!on){if(host)host.hidden=true;return;}
  if(!host){host=document.createElement('section');host.id='north-south-view';host.className='northsouth-view';document.querySelector('.map-shell').appendChild(host);}
  model=build();host.hidden=false;host.innerHTML='<div class="ns-toolbar"><strong>North–South / site study</strong><button data-ns="in" aria-label="Zoom in">+</button><button data-ns="out" aria-label="Zoom out">−</button><button data-ns="fit">Fit sheet</button><button data-ns="svg">Export SVG</button><button data-ns="json">Geometry & evidence</button><span>Scroll to zoom · drag to pan · fixed labels</span></div><div class="ns-canvas"></div>';
  svg=draw(model);drawing=svg.querySelector('[data-ns-drawing]');host.querySelector('.ns-canvas').appendChild(svg);fit();
  host.querySelectorAll('[data-ns]').forEach(b=>b.onclick=()=>{const k=b.dataset.ns;if(k==='in')zoom(1.2);if(k==='out')zoom(1/1.2);if(k==='fit')fit();if(k==='svg')save('studio7-north-south.svg',exportSVG(),'image/svg+xml');if(k==='json')save('studio7-north-south-geometry.json',JSON.stringify(model,null,2),'application/json');});
  const loc=e=>{const q=svg.createSVGPoint();q.x=e.clientX;q.y=e.clientY;const p=q.matrixTransform(svg.getScreenCTM().inverse());return[p.x,p.y];};
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),loc(e));},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={p:loc(e),x:state.x,y:state.y,id:e.pointerId};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=loc(e);state.x=drag.x+p[0]-drag.p[0];state.y=drag.y+p[1]-drag.p[1];transform();});
  svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
 }
 return{show,fit,build,draw,exportSVG,get model(){return model;}};
})();
