/* Wider context, not new survey facts. Fixed vector sheet; no storage/sync writes. */
window.TerritoryLayers=(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg',W=1600,H=1460;
 const C={ink:'#293e3b',muted:'#647771',paper:'#fffefa',water:'#8cc4d2',river:'#216d87',coast:'#245d72',industry:'#937247',south:'#d99c70',north:'#c5b27a',middle:'#8ca879',road:'#303b40',seaside:'#506382',route:'#b96718',bridge:'#b82e63',plot:'#ffcd32'};
 const el=(n,a={},t)=>{const q=document.createElementNS(NS,n);Object.entries(a).forEach(([k,v])=>q.setAttribute(k,v));if(t!==undefined)q.textContent=t;return q;};
 const path=(p,closed=false)=>p.map((q,i)=>(i?'L':'M')+q.map(v=>v.toFixed(3)).join(',')).join(' ')+(closed?' Z':'');
 const text=(g,x,y,t,size=14,color=C.ink,a={})=>g.appendChild(el('text',{x,y,fill:color,'font-size':size,...a},t));
 const line=(g,p,c,w=1,dash,a={})=>g.appendChild(el('path',{d:path(p),fill:'none',stroke:c,'stroke-width':w,...(dash?{'stroke-dasharray':dash}:{}),...a}));
 const xy=at=>{const p=ArchitecturalMap.project(at);return[p[0],-p[1],0];};
 let host,svg,drawing,model,drag,state={scale:1,x:0,y:0};
 function build(){const local=NorthSouth.build();return{...TERRITORY_LAYERS_DATA,local,
  scope:'Two distinct geographic relationships: river west of plot; coast farther north. Not a coastal route, proposed promenade, public-access map, flood map or project massing.',
  method:'Orthographic contextual axonometrics. Preserved local building model within its source coverage; wider roads/coastline and unreviewed flat building footprints from separate OSM extracts. No context footprint replaces a local assignment. Flat datum and diagrammatic line widths; unknown heights remain flat.',
  research:[{title:'Harmandayan district study, 2014',url:'https://www.area-arch.it/en/bourj-hammoud-district/'},{title:'Associer strategic study, 2024',url:'https://associer.archi/fr/projets/bourj-hammoud-nord-beyrouth-liban-renouvellement-urbain'}]};}
 function draw(m){
  const s=el('svg',{xmlns:NS,viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':'River and Coast: wider territorial relationships and local approaches','data-territory-layers':'sheet'});
  s.appendChild(el('title',{},'River and coast — two different relationships'));
  s.appendChild(el('desc',{},m.scope+' '+m.method));
  s.appendChild(el('style',{},'text{font-family:Arial,sans-serif}path,text,circle,rect{pointer-events:none}.tl-label{paint-order:stroke;stroke:#fffefa;stroke-width:4;stroke-linejoin:round}'));
  const defs=el('defs');s.appendChild(defs);const g=el('g',{'data-tl-drawing':'fixed'});s.appendChild(g);g.appendChild(el('rect',{width:W,height:H,fill:C.paper}));
  const hatch=el('pattern',{id:'tl-work-hatch',width:8,height:8,patternUnits:'userSpaceOnUse',patternTransform:'rotate(35)'});hatch.appendChild(el('path',{d:'M0 0 L0 8',stroke:C.industry,'stroke-width':2,'stroke-opacity':.7}));defs.appendChild(hatch);
  text(g,65,38,'ENTERING BEIRUT  /  WIDER TERRITORIAL READING',12,C.muted,{'letter-spacing':'2'});
  text(g,65,84,'River and coast. Two different relationships.',38,C.ink,{'font-weight':'600'});
  text(g,65,116,'The river is west of our plot. The sea is farther north, beyond the local crossing and working territory.',17,C.muted);
  text(g,1535,38,'LAYERS / 02',12,C.muted,{'text-anchor':'end'});line(g,[[65,142],[1535,142]],'#d5ded7');
  const legends=[[C.water,'01 · Sea + river'],[C.north,'02 · Northern territory'],[C.middle,'03 · Plot-side strip'],[C.south,'04 · Southern fabric'],[C.road,'Road seams'],[C.plot,'Our plot / crossing']];
  legends.forEach(([c,t],i)=>{const x=65+i*245;g.appendChild(el('rect',{x,y:155,width:13,height:8,fill:c}));text(g,x+20,164,t,11,C.muted);});
  text(g,65,203,'A  /  THE LARGER TERRITORY',15,C.ink,{'font-weight':'600'});
  const yaw=10*Math.PI/180,elev=55*Math.PI/180,cy=Math.cos(yaw),sy=Math.sin(yaw),se=Math.sin(elev),ce=Math.cos(elev);
  const raw=p=>[p[0]*cy+p[1]*sy,(p[0]*sy-p[1]*cy)*se-(p[2]||0)*ce];
  const local=m.local,ids=local.namedWays,seaside=[26316545,692400343],riverCrossing=[452148075,452148076];
  const riverBridge=local.roads.find(r=>riverCrossing.includes(r.id));
  const riverBridgeAnchor=riverBridge?riverBridge.points[0].map((v,i)=>(v+riverBridge.points[1][i])/2):xy([33.89544,35.53678]);
  function scene(box,b,key,mode='all'){
   const [x,y,w,h]=box,corners=[[b[0],b[2],0],[b[1],b[2],0],[b[1],b[3],0],[b[0],b[3],0]],rp=corners.map(raw),min=[0,1].map(i=>Math.min(...rp.map(p=>p[i]))),max=[0,1].map(i=>Math.max(...rp.map(p=>p[i]))),scale=Math.min(w/(max[0]-min[0]),h/(max[1]-min[1]));
   const project=p=>{const q=raw(p);return[x+w/2+(q[0]-(min[0]+max[0])/2)*scale,y+h/2+(q[1]-(min[1]+max[1])/2)*scale];};
   const sc=el('g',{'data-tl-scene':key});g.appendChild(sc);
   const poly=(rings,a={})=>{const clipped=rings.map(r=>CityLayers.clipRing(r,b)).filter(r=>r.length>2);if(!clipped.length)return;sc.appendChild(el('path',{d:clipped.map(r=>path(r.map(project),true)).join(' '),'fill-rule':'evenodd',...a}));};
   const traced=(points,c,width,dash,a={})=>{for(let i=0;i<points.length-1;i++){const q=CityLayers.clipLine([points[i],points[i+1]],b);if(q)line(sc,q.map(project),c,width,dash,a);}};
   poly([corners],{fill:'#f3f2ea',stroke:'#c3cdc4','stroke-width':.7});
   for(const field of m.studyFields)for(const rings of field.polygons)poly(rings,{fill:C[field.key],'fill-opacity':mode==='water'?.22:.66,'data-study-field':field.key});
   for(const f of m.features.filter(f=>f.tags.landuse==='industrial'&&f.points.length>3)){
    // Only closed mapped areas are filled; missing land-use tags stay unclassified.
    if(Math.hypot(f.points[0][0]-f.points.at(-1)[0],f.points[0][1]-f.points.at(-1)[1])>.01)continue;
    poly([f.points],{fill:C.industry,'fill-opacity':.22,stroke:C.industry,'stroke-width':1.1,'data-industrial-area':f.id});
    if(mode==='all')poly([f.points],{fill:'url(#tl-work-hatch)'});
   }
   for(const rings of m.sea)poly(rings,{fill:C.water,'data-sea':'mapped'});
   for(const f of m.features.filter(f=>f.tags.highway))traced(f.points,mode==='water'?'#aeb9b0':C.road,mode==='water'?1:/motorway|trunk/.test(f.tags.highway)?3.2:1.1,null,{'data-territory-way':f.id});
   for(const r of local.roads)traced(r.points,'#c4cec5',.45);
   for(const rings of local.water.map(r=>[r]))poly(rings,{fill:C.water});
   for(const q of m.contextBuildings)poly(q.rings,{fill:'#ece6cf',stroke:'#9e9378','stroke-width':.55,'data-context-building':q.id});
   const buildings=[...local.buildings].sort((a,b)=>b.at[1]-a.at[1]);
   for(const q of buildings){const rings=q.rings.map(r=>CityLayers.clipRing(r,b)).filter(r=>r.length>2);if(!rings.length)continue;
    const color=mode==='water'?'#b3c0b3':local.context[q.id]==='south'?'#b97849':local.context[q.id]==='north'?'#9b8b56':'#829a70';
    poly(rings,{fill:color,'fill-opacity':.85,stroke:'#fffefa','stroke-width':.38,'data-building':q.id});
    if(mode==='water'||!q.height)continue;
    for(const r of rings)for(let i=0;i<r.length;i++){const a=r[i],z=r[(i+1)%r.length];poly([[a,z,[z[0],z[1],q.height],[a[0],a[1],q.height]]],{fill:color,'fill-opacity':.62,stroke:'#98a99e','stroke-width':.3});}
    poly(rings.map(r=>r.map(p=>[p[0],p[1],q.height])),{fill:color,stroke:'#81998f','stroke-width':.3});
   }
   for(const f of m.features.filter(f=>f.tags.natural==='coastline'))traced(f.points,C.coast,2.6,null,{'data-coastline':f.id});
   for(const f of m.features.filter(f=>f.tags.waterway==='river'&&f.tags['name:en']==='Beirut River')){traced(f.points,C.paper,8.5);traced(f.points,C.river,6,null,{'data-river':f.id});}
   for(const r of local.roads){const bridge=ids.bridgeAndSteps.includes(r.id),street=[...ids.street52,...ids.street80].includes(r.id),river=riverCrossing.includes(r.id),sea=seaside.includes(r.id);if(!bridge&&!street&&!sea&&!river)continue;
    traced(r.points,C.paper,bridge||river?6:5);
    traced(r.points,bridge?C.bridge:sea?C.seaside:C.route,bridge||river?4:sea?3.2:3,null,{'data-local-way':r.id});
   }
   poly([local.site],{fill:C.plot,stroke:C.paper,'stroke-width':4});poly([local.site],{fill:C.plot,stroke:'#6f5828','stroke-width':1.3,'data-site':'unbuilt'});
   // The existing detailed building extract has a finite extent. No invented blocks outside it.
   if(key==='A'){const cov=[[33.891206,35.533606],[33.891206,35.546584],[33.901984,35.546584],[33.901984,35.533606]].map(xy);traced([...cov,cov[0]],'#849489',.8,'5 4',{'data-coverage':'detailed-base'});}
   line(sc,[corners[0],corners[1]].map(project),C.ink,1.3);
   const call=(p,x,y,title,detail,c=C.ink,anchor='start')=>{const at=project(p);line(g,[at,[x,y+8]],c,.8,'2 3');g.appendChild(el('circle',{cx:at[0],cy:at[1],r:2.8,fill:c}));text(g,x,y,title,14,c,{'font-weight':'600','text-anchor':anchor,class:'tl-label'});if(detail)text(g,x,y+18,detail,11,C.muted,{'text-anchor':anchor,class:'tl-label'});};
   return{project,call,scale};
  }
  const A=scene([80,255,1030,575],m.bounds,'A');
  A.call(xy([33.90518,35.542097]),475,244,'RIVER MOUTH','Mapped river meets mapped coast',C.coast);
  A.call(xy([33.9085,35.547]),785,289,'01  MEDITERRANEAN SEA','Beyond the local building study',C.coast);
  A.call(xy([33.904,35.5475]),835,430,'02  NORTHERN TERRITORY','Working / infrastructure context', '#80692f');
  A.call(xy([33.898,35.538]),80,498,'BEIRUT RIVER','Western edge; not a route to our door',C.river);
  A.call(local.anchors.seaside,890,597,'SEASIDE ROAD','An inland road, not the coast',C.seaside);
  A.call(local.anchors.plot,774,735,'OUR PLOT','Beside the local crossing','#957020');
  // Direct labels identify the coloured fields without requiring the side explanation.
  const fieldLabel=(at,title,c)=>{const p=A.project(xy(at));text(g,p[0],p[1],title,15,c,{'font-weight':'700','text-anchor':'middle',class:'tl-label','data-field-label':title});};
  fieldLabel([33.9026,35.5448],'02  NORTHERN TERRITORY','#80692f');
  fieldLabel([33.8964,35.5445],'03  PLOT-SIDE STRIP','#456234');
  fieldLabel([33.8931,35.5415],'04  SOUTHERN FABRIC','#925525');
  A.call(local.anchors.highway,107,767,'HIGHWAY','Regional link / local interruption',C.road);
  text(g,90,848,'Colour = study condition, not exclusive land use. Dashed frame = local base; outer footprints are unreviewed.',11,C.muted);
  // Compass vectors share the actual orthographic projection, rather than assuming screen-up north.
  const o=[995,800],p0=raw([0,0,0]),pn=raw([0,70,0]),pe=raw([70,0,0]);
  for(const [p,t]of [[pn,'N'],[pe,'E']]){const q=[o[0]+p[0]-p0[0],o[1]+p[1]-p0[1]];line(g,[o,q],C.ink,1);text(g,q[0]+5,q[1],t,11);}
  line(g,[[1138,224],[1138,854]],'#d5ded7');
  const note=(y,n,title,lines,c)=>{text(g,1170,y,n,13,c,{'font-weight':'600'});text(g,1170,y+27,title,20,C.ink,{'font-weight':'600'});lines.forEach((t,i)=>text(g,1170,y+55+i*21,t,14,C.muted));};
  note(246,'01 / WATER TERRITORY','Two edges, not one band',[
   'The river runs west of our plot and', 'reaches the sea farther north. It adds', 'a separate cross-river question to our', 'north–south crossing study.'],C.river);
  note(415,'02 / COASTAL TERRITORY','The coast is not next door',[
   'Working land and infrastructure lie', 'between the local strip and the coast.', 'A road toward this territory does not', 'prove a public route to the water.'],'#8d7752');
  note(584,'03 / LOCAL SCALE','Our plot has a smaller role',[
   'C1 links the two sides of the highway.', 'Our plot sits near its northern arrival,', 'beside Street 80. It does not reconnect', 'the entire riverfront or waterfront.'],C.bridge);
  text(g,1170,765,'STRONG COLOUR / DIFFERENT CONDITIONS',11,C.ink,{'font-weight':'600'});
  text(g,1170,787,'Blue = water · Ochre = northern territory',11,C.muted);
  text(g,1170,807,'Green = middle strip · Clay = southern fabric',11,C.muted);
  text(g,1170,830,'Hatch alone marks OSM industrial polygons.',11,C.muted);
  line(g,[[65,882],[1535,882]],'#d5ded7');
  text(g,65,919,'B  /  WEST–EAST: CROSSING THE RIVER',15,C.ink,{'font-weight':'600'});
  text(g,845,919,'C  /  NORTH–SOUTH: CROSSING THE HIGHWAY',15,C.ink,{'font-weight':'600'});
  const B=scene([80,973,680,260],[-760,250,-360,380],'B','water');
  B.call(riverBridgeAnchor,85,959,'ARMENIA STREET CROSSING','Separate western approach',C.route);
  B.call(local.anchors.plot,650,1250,'OUR PLOT','East of the river','#957020','middle');
  const D=scene([858,981,660,250],[-110,250,-240,280],'C');
  D.call(local.anchors.street52,866,959,'STREET 52','Southern approach',C.route);
  D.call(local.anchors.street80,1395,959,'STREET 80','Northern approach',C.route,'middle');
  D.call(local.anchors.bridge,1010,1250,'C1 FOOTBRIDGE','Existing stairs / levels TBD',C.bridge,'middle');
  D.call(local.anchors.plot,1380,1250,'OUR PLOT','Near the northern arrival','#957020','middle');
  text(g,65,1301,'A bridge across the river is not the same crossing as C1.',15,C.ink,{'font-weight':'600'});
  text(g,65,1324,'Onward pavements and exact entrances remain to be checked.',12,C.muted);
  text(g,845,1301,'A local connection through several urban layers.',15,C.ink,{'font-weight':'600'});
  text(g,845,1324,'Mapped components—not a verified step-free route to the sea.',12,C.muted);
  line(g,[[65,1348],[1535,1348]],'#d5ded7');
  text(g,65,1378,'From territorial edges to a local threshold: keep connection and shelter together.',21,C.ink,{'font-weight':'600'});
  text(g,65,1405,'Source: © OpenStreetMap contributors / 2026-09-17 wider extract + preserved corrected local building model. Fixed geometry; no project massing.',11,C.muted);
  text(g,65,1424,'Context interpretation: Harmandayan (2014), Associer strategic study (2024). Not measured hazards, certified public access or a completed waterfront project.',11,C.muted);
  text(g,65,1443,'Solid local heights = recorded floors × assumed 3.2 m. Other heights stay flat; outer footprints unreviewed. River stroke and road widths are graphic.',11,C.muted);
  return s;
 }
 function transform(){drawing?.setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.scale})`);}
 function fit(){state={scale:1,x:0,y:0};transform();}
 function zoom(f,p=[W/2,H/2]){const next=Math.max(.6,Math.min(9,state.scale*f)),r=next/state.scale;state.x=p[0]-(p[0]-state.x)*r;state.y=p[1]-(p[1]-state.y)*r;state.scale=next;transform();}
 function exportSVG(){const s=svg.cloneNode(true);s.querySelector('[data-tl-drawing]').removeAttribute('transform');return new XMLSerializer().serializeToString(s);}
 function save(name,value,type){const u=URL.createObjectURL(new Blob([value],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
 function show(on){document.body.classList.toggle('territorylayers-on',on);document.getElementById('workspace').classList.toggle('territorylayers-mode',on);if(!on){if(host)host.hidden=true;return;}
  if(!host){host=document.createElement('section');host.id='territory-layers-view';host.className='territorylayers-view';document.querySelector('.map-shell').appendChild(host);}
  model=build();host.hidden=false;host.innerHTML='<div class="cl-toolbar"><strong>River & Coast / wider context</strong><button data-tl="in" aria-label="Zoom in">+</button><button data-tl="out" aria-label="Zoom out">−</button><button data-tl="fit">Fit sheet</button><button data-tl="svg">Export SVG</button><button data-tl="json">Geometry & evidence</button><span>Scroll to zoom · drag to pan · fixed drawing</span></div><div class="cl-canvas"></div>';
  svg=draw(model);drawing=svg.querySelector('[data-tl-drawing]');host.querySelector('.cl-canvas').appendChild(svg);fit();
  host.querySelectorAll('[data-tl]').forEach(b=>b.onclick=()=>{const k=b.dataset.tl;if(k==='in')zoom(1.2);if(k==='out')zoom(1/1.2);if(k==='fit')fit();if(k==='svg')save('studio7-river-coast.svg',exportSVG(),'image/svg+xml');if(k==='json')save('studio7-river-coast-geometry.json',JSON.stringify(model,null,2),'application/json');});
  const pos=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return[q.x,q.y];};
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),pos(e));},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={p:pos(e),x:state.x,y:state.y,id:e.pointerId};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=pos(e);state.x=drag.x+p[0]-drag.p[0];state.y=drag.y+p[1]-drag.p[1];transform();});
  svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
 }
 return{show,fit,build,draw,exportSVG,get model(){return model;}};
})();
