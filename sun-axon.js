/* Read-only architectural sun study. XY comes from the effective BuildingMap model.
   Z is an explicit storey-height assumption, never a measured roof elevation.
   The shared ENU model feeds SVG and a layered CAD wireframe; no survey/storage writes. */
window.SunAxon=(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg',ORIGIN=[33.89653,35.54112],FLOOR=3.2,RADIUS=190;
 const seasons=[['summer','SUMMER','#c25c2d'],['equinox','EQUINOX','#a79670'],['winter','WINTER','#cca036']];
 let host,svg,drawing,model,state={scale:1,x:0,y:0},drag=null;
 const el=(name,attrs={},text)=>{const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;};
 const xy=p=>{const q=ArchitecturalMap.project(p);return[q[0],-q[1],0];};
 // Orthonormal camera: 20 degrees east of south, 20 degrees above the horizon.
 // Equal unit axes avoid the former unequal horizontal/vertical scale.
 const yaw=20*Math.PI/180,elevation=20*Math.PI/180;
 const right=[Math.cos(yaw),Math.sin(yaw),0],down=[Math.sin(elevation)*Math.sin(yaw),-Math.sin(elevation)*Math.cos(yaw),-Math.cos(elevation)],camera=[Math.cos(elevation)*Math.sin(yaw),-Math.cos(elevation)*Math.cos(yaw),Math.sin(elevation)];
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const iso=([e,n,z=0])=>[dot(right,[e,n,z]),dot(down,[e,n,z])];
 const path=(pts,closed=false)=>pts.map((p,i)=>(i?'L':'M')+p.map(v=>v.toFixed(3)).join(',')).join(' ')+(closed?' Z':'');
 const ring=r=>{const a=r.map(xy);if(a.length>1&&Math.hypot(a[0][0]-a.at(-1)[0],a[0][1]-a.at(-1)[1])<.001)a.pop();return a;};
 const positive=x=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):null;
 function build(source=BuildingMap.model()){
  const site=ring(source.site),cross=site.map((p,i)=>p[0]*site[(i+1)%site.length][1]-site[(i+1)%site.length][0]*p[1]),area2=cross.reduce((s,v)=>s+v,0);
  const center=[0,1].map(axis=>site.reduce((s,p,i)=>s+(p[axis]+site[(i+1)%site.length][axis])*cross[i],0)/(3*area2));center.push(0);
  const buildings=source.features.filter(f=>Math.hypot(...xy(f.at).slice(0,2).map((v,i)=>v-center[i]))<=RADIUS).map(f=>{
   const records=f.recordIds.map(id=>source.records.get(id)?.record).filter(Boolean),r=records.length===1?records[0]:null;
   const total=r&&positive(r.storeys),minimum=r&&positive(r.autoStoreysMinimum),status=total?'recorded-total':minimum?'minimum-only':records.length>1?'conflicting-records':'unknown';
   return{id:f.id,recordIds:[...f.recordIds],name:r?.note||r?.autoEvidence?.title||'',rings:f.rings.map(ring),at:xy(f.at),approximateFootprint:f.approx,status,storeys:total,minimumStoreys:minimum,height:total?total*FLOOR:null,minimumHeight:!total&&minimum?minimum*FLOOR:null};
  });
  // Clip line segments to the study square, without moving their mapped centrelines.
  const clip=(a,b)=>{let lo=0,hi=1;for(let i=0;i<2;i++){const d=b[i]-a[i],min=center[i]-RADIUS,max=center[i]+RADIUS;if(Math.abs(d)<1e-9){if(a[i]<min||a[i]>max)return null;}else{let t=(min-a[i])/d,u=(max-a[i])/d;if(t>u)[t,u]=[u,t];lo=Math.max(lo,t);hi=Math.min(hi,u);if(lo>hi)return null;}}return[lo,hi].map(t=>a.map((v,i)=>v+t*(b[i]-v)));};
  const roads=[];for(const w of window.CONNECTIONS_DATA?.ways||[])for(const line of w.lines)for(let i=1;i<line.length;i++){const segment=clip(xy(line[i-1]),xy(line[i]));if(segment)roads.push({id:w.id,name:w.name,type:w.tags.highway,bridge:w.tags.bridge,points:segment});}
  const solar=seasons.map(([key,name,color])=>{const dec={summer:23.44,equinox:0,winter:-23.44}[key],rad=Math.PI/180,h=Math.acos(-Math.tan(ORIGIN[0]*rad)*Math.tan(dec*rad))/rad/15,start=12-h,end=12+h;
   const sample=hour=>{const s=protectionSolar(key,hour),a=s.altitude*rad,b=s.azimuth*rad;return{hour,altitude:s.altitude,azimuth:s.azimuth,point:[center[0]+175*Math.cos(a)*Math.sin(b),center[1]+175*Math.cos(a)*Math.cos(b),Math.max(0,175*Math.sin(a))]};};
   return{key,name,color,start,end,points:Array.from({length:97},(_,i)=>sample(start+(end-start)*i/96)),noon:sample(12)};
  });
  return{version:'2026-09-16-sun-axon-2',view:{type:'orthographic',azimuthFromSouthDegrees:20,elevationDegrees:20,right,down,camera},originLatLng:ORIGIN,axes:'X east; Y north; Z up',units:'metres',projection:'Local EPSG:3857 deltas scaled by cos(origin latitude); NOT the survey CAD CRS',heightAssumptionMetresPerStorey:FLOOR,heightDatum:'Flat schematic ground, Z=0. Ground levels and bridge/deck heights TBD.',scope:'Existing display footprints, not proposed design. Unknown heights remain unextruded. No calculated shadows.',solarMethod:'Fixed seasonal declinations + local apparent solar time; not civil clock time. Arc radius is diagrammatic.',site,center,buildings,roads,solar};
 }
 function line(parent,pts,color,width=.6,dash){const n=el('path',{d:path(pts.map(iso)),fill:'none',stroke:color,'stroke-width':width,'stroke-linejoin':'round','stroke-linecap':'round'});if(dash)n.setAttribute('stroke-dasharray',dash);parent.appendChild(n);return n;}
 function label(parent,p,text,size=7,color='#3d4d49',attrs={}){const q=iso(p);parent.appendChild(el('text',{x:q[0],y:q[1],'font-size':size,fill:color,...attrs},text));}
 function draw(m){
  const s=el('svg',{xmlns:NS,viewBox:'-335 -205 670 405',role:'img','aria-label':'Seasonal sun paths over the existing plot and evidence-based schematic building masses','data-sun-axon':'drawing'});
  s.appendChild(el('title',{},'Our plot through the seasons — a sun-path axonometric'));
  s.appendChild(el('desc',{},m.scope+' '+m.heightDatum+' Storeys multiplied by '+FLOOR+' metres for illustration only.'));
  s.appendChild(el('style',{},'text{font-family:Arial,sans-serif;paint-order:stroke;stroke:#faf9f5;stroke-width:1.1;stroke-linejoin:round}path,polygon,text,circle{pointer-events:none}'));
  const g=el('g',{'data-sun-drawing':'fixed'});s.appendChild(g);
  const ground=el('g',{'data-layer':'ground'});g.appendChild(ground);
  for(const r of m.roads){const isBridge=[701135687,701135688,270786366].includes(r.id),high=/^(motorway|trunk)/.test(r.type),street=r.id===275315121||[306996681,715531021].includes(r.id);line(ground,r.points,isBridge?'#9c6c7e':street?'#90aaa2':high?'#d2cec5':'#e0ddd6',isBridge?1.4:high?2.7:street?1.4:.6,isBridge?'2 1':null);}
  const footprints=el('g',{'data-layer':'footprints'});g.appendChild(footprints);
  for(const b of m.buildings){const p=el('path',{d:b.rings.map(r=>path(r.map(iso),true)).join(' '),'fill-rule':'evenodd',fill:b.status==='unknown'||b.status==='conflicting-records'?'#f0eee8':'#eeebe4',stroke:'#c7c6bf','stroke-width':.35,'data-building':b.id,'data-height-status':b.status});footprints.appendChild(p);}
  const plot=el('path',{d:path(m.site.map(iso),true),fill:'#e7ca78',stroke:'#786b42','stroke-width':1.15,'data-layer':'site'});g.appendChild(plot);
  const masses=el('g',{'data-layer':'masses'});g.appendChild(masses);
  // Far to near, with opaque back faces culled. Minimum-only masses remain wireframes.
  const ordered=[...m.buildings].sort((a,b)=>dot(camera,a.at)-dot(camera,b.at));
  for(const b of ordered){const h=b.height||b.minimumHeight;if(!h)continue;const group=el('g',{'data-building':b.id,'data-height-status':b.status,'data-height':h});masses.appendChild(group);
   if(b.height){for(const [ri,r] of b.rings.entries()){const sign=Math.sign(r.reduce((sum,p,i)=>sum+p[0]*r[(i+1)%r.length][1]-r[(i+1)%r.length][0]*p[1],0))*(ri?-1:1);for(let i=0;i<r.length;i++){const a=r[i],c=r[(i+1)%r.length];if(sign*((c[1]-a[1])*camera[0]-(c[0]-a[0])*camera[1])<=0)continue;group.appendChild(el('path',{d:path([a,c,[c[0],c[1],h],[a[0],a[1],h]].map(iso),true),fill:Math.abs(c[0]-a[0])>Math.abs(c[1]-a[1])?'#dedbd3':'#eae7e0',stroke:'#aaa99e','stroke-width':.35,'data-face':'visible-wall'}));}}
    group.appendChild(el('path',{d:b.rings.map(r=>path(r.map(p=>iso([p[0],p[1],h])),true)).join(' '),'fill-rule':'evenodd',fill:'#faf9f5',stroke:'#989f95','stroke-width':.45}));
   }else for(const r of b.rings){line(group,[...r,r[0]].map(p=>[p[0],p[1],h]),'#ada18a',.5,'1.5 1');for(const p of r)line(group,[p,[p[0],p[1],h]],'#c0b7a4',.4,'1.5 1');}
  }
  const arcs=el('g',{'data-layer':'solar'});g.appendChild(arcs);
  line(arcs,Array.from({length:129},(_,i)=>[m.center[0]+175*Math.cos(i*Math.PI/64),m.center[1]+175*Math.sin(i*Math.PI/64),0]),'#b5ac98',.5,'2 3').setAttribute('data-horizon','ground');
  for(const a of m.solar){line(arcs,a.points.map(x=>x.point),a.color,a.key==='equinox'?.65:1.4,a.key==='equinox'?'2 2':null);const q=iso(a.noon.point);arcs.appendChild(el('circle',{cx:q[0],cy:q[1],r:3.1,fill:'#faf9f5',stroke:a.color,'stroke-width':1}));
   for(let i=0;i<8;i++){const t=i*Math.PI/4;arcs.appendChild(el('path',{d:path([[q[0]+4.7*Math.cos(t),q[1]+4.7*Math.sin(t)],[q[0]+6.2*Math.cos(t),q[1]+6.2*Math.sin(t)]]),fill:'none',stroke:a.color,'stroke-width':.6}));}
   line(arcs,[m.center,a.noon.point],a.color,.35,'1 3');
   label(arcs,[a.noon.point[0]-16,a.noon.point[1],a.noon.point[2]+10],a.name+' / '+Math.round(a.noon.altitude)+'°',7.5,a.color,{'text-anchor':'end','font-weight':'bold'});
   const start=a.points[0].point,end=a.points.at(-1).point;line(arcs,[start,[start[0],start[1],-3]],a.color,.6);line(arcs,[end,[end[0],end[1],-3]],a.color,.6);
   // A small tangent arrow communicates morning-to-evening travel without floating tags.
   const k=66,p=iso(a.points[k].point),v=iso(a.points[k-1].point),t=Math.atan2(p[1]-v[1],p[0]-v[0]);arcs.appendChild(el('path',{d:path([[p[0]-4*Math.cos(t-.5),p[1]-4*Math.sin(t-.5)],p,[p[0]-4*Math.cos(t+.5),p[1]-4*Math.sin(t+.5)]]),stroke:a.color,'stroke-width':.8,fill:'none'}));
  }
  const annotations=el('g',{'data-layer':'annotations'});g.appendChild(annotations);
  const call=(at,offset,words,color='#435750')=>{const to=at.map((v,i)=>v+offset[i]);line(annotations,[at,to],color,.55);label(annotations,[to[0],to[1],to[2]+3],words,7,color);};
  call(m.center,[-50,-18,0],'OUR PLOT / unbuilt','#7c662f');
  const roadPoint=(id)=>m.roads.find(r=>r.id===id)?.points[0];
  if(roadPoint(275315121))call(roadPoint(275315121),[36,25,3],'STREET 80','#48746a');
  const bridge=window.CONNECTIONS_DATA?.tags?.find(t=>t.id==='C1');if(bridge)call(xy(bridge.at),[-64,-35,0],'FOOTBRIDGE / plan trace only','#986475');
  const high=m.roads.find(r=>/^(motorway|trunk)/.test(r.type)&&Math.hypot(...r.points[0].slice(0,2))<130);if(high)call(high.points[0],[65,-30,0],'HIGHWAY','#7e796e');
  const bank=m.buildings.find(b=>b.recordIds.includes('wmttqjojmmgt'));if(bank)call([bank.at[0],bank.at[1],bank.height||0],[36,-14,12],'CREDIT LIBANAIS / recorded 9 floors','#6c756c');
  const cardinals=[['N',0,215],['E',215,0],['S',0,-215],['W',-215,0]];
  for(const [word,e,n]of cardinals){const p=[m.center[0]+e,m.center[1]+n,0];line(annotations,[[p[0]*.95,p[1]*.95,0],p],'#7f9088',.7);label(annotations,[p[0],p[1],-7],word,6.3,'#607970',{'text-anchor':'middle','font-weight':'bold'});}
  label(annotations,[m.center[0]+208,m.center[1]+12,0],'MORNING',4.1,'#8c806b');label(annotations,[m.center[0]-215,m.center[1]-13,0],'EVENING',4.1,'#8c806b',{'text-anchor':'end'});
  return s;
 }
 function dxf(m=model){
  const out=[],pair=(k,v)=>out.push(String(k),String(v)),poly=(layer,points,closed=false)=>{pair(0,'POLYLINE');pair(8,layer);pair(66,1);pair(10,0);pair(20,0);pair(30,0);pair(70,closed?9:8);for(const p of points){pair(0,'VERTEX');pair(8,layer);pair(10,p[0]);pair(20,p[1]);pair(30,p[2]);pair(70,32);}pair(0,'SEQEND');pair(8,layer);};
  pair(0,'SECTION');pair(2,'HEADER');pair(9,'$ACADVER');pair(1,'AC1009');pair(0,'ENDSEC');pair(0,'SECTION');pair(2,'ENTITIES');
  pair(999,'LOCAL METRES; X EAST Y NORTH Z UP. Set insertion units to metres. NOT survey CAD CRS.');
  pair(999,'Origin lat/lng '+ORIGIN.join(',')+'. Heights = recorded floors x 3.2m; unknowns flat; minima wireframe.');
  poly('SITE_UNBUILT',m.site,true);
  for(const b of m.buildings){const layer=b.height?'BUILDING_ESTIMATED_Z':b.minimumHeight?'BUILDING_MINIMUM_ONLY':'BUILDING_HEIGHT_TBD',h=b.height||b.minimumHeight;for(const r of b.rings){poly(layer,r,true);if(h){poly(layer,r.map(p=>[p[0],p[1],h]),true);for(const p of r)poly(layer,[p,[p[0],p[1],h]]);}}}
  for(const r of m.roads)poly('ROAD_PLAN_TRACE',r.points);
  for(const a of m.solar)poly('SUN_'+a.key.toUpperCase()+'_DIAGRAM',a.points.map(p=>p.point));
  pair(0,'ENDSEC');pair(0,'EOF');return out.join('\r\n')+'\r\n';
 }
 function save(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 function exportSVG(){const copy=svg.cloneNode(true);copy.setAttribute('viewBox','-335 -225 670 440');copy.querySelector('[data-sun-drawing]').removeAttribute('transform');
  for(const [y,text,size]of [[-212,'OUR PLOT THROUGH THE SEASONS / SUN AXONOMETRIC',10],[191,'Solid: recorded floors × 3.2 m (assumed) · Dashed: minimum levels · Flat: height unknown',7],[204,'Existing approximate footprints · Flat datum · Solar-time arcs · No measured heights or calculated shadows',6]])copy.appendChild(el('text',{x:-310,y,'font-size':size,fill:'#566151'},text));
  return new XMLSerializer().serializeToString(copy);
 }
 function transform(){drawing?.setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.scale})`);}
 function fit(){state={scale:1,x:0,y:0};transform();}
 function zoom(factor,point=[0,0]){const next=Math.min(5,Math.max(.55,state.scale*factor)),r=next/state.scale;state.x=point[0]-(point[0]-state.x)*r;state.y=point[1]-(point[1]-state.y)*r;state.scale=next;transform();}
 function show(on){document.body.classList.toggle('sunaxon-on',on);document.getElementById('workspace').classList.toggle('sunaxon-mode',on);if(!on){if(host)host.hidden=true;return;}
  if(!host){host=document.createElement('section');host.id='sunaxon-view';host.className='sunaxon-view';host.setAttribute('aria-label','Three-dimensional sun study');document.querySelector('.map-shell').appendChild(host);}
  model=build();host.hidden=false;
  const totals=model.buildings.filter(b=>b.height).length,min=model.buildings.filter(b=>b.minimumHeight).length,unknown=model.buildings.length-totals-min;
  host.innerHTML='<div class="sa-sheet"><header><span>SITE STUDY / SOLAR GEOMETRY</span><h1>Our plot through the seasons</h1><p>The same building footprints, seen in three dimensions.</p></header><div class="sa-canvas"></div><div class="sa-toolbar" aria-label="Drawing controls"><button data-sa="in" aria-label="Zoom in">+</button><button data-sa="out" aria-label="Zoom out">−</button><button data-sa="fit">Fit drawing</button><span>Scroll to zoom · drag to pan</span></div><footer><span><i class="sa-solid"></i>Recorded floors → estimated mass</span><span><i class="sa-dash"></i>Visible minimum only</span><span><i class="sa-flat"></i>Outline only → height unknown</span></footer></div><aside class="sa-story"><span class="sa-kicker">SUN / AXONOMETRIC</span><h2>High summer sun.<br>Low winter sun.</h2><p>Our unbuilt plot sits beside Street 80, just north of the highway and its footbridge. Credit Libanais rises to the east as one of our taller documented neighbours. The building footprints come directly from the current Pictures Auto layout.</p><p>The summer sun climbs high above the site. In winter, it follows a lower arc across the southern sky, towards the highway side. For our project, this means testing summer shade at the entrance and roof while keeping useful winter light in the shared spaces.</p><p>The bank and other neighbours must be part of that test. This drawing shows the seasonal geometry, but it does not yet prove which parts of our plot they shade.</p><div class="sa-caution"><b>How to read the model</b><p>Solid masses use recorded floor counts × 3.2 m per floor. This is a drawing assumption, not a measured height. Dashed masses stop at the minimum visible levels; their true tops are unknown. Flat outlines are buildings with no usable height evidence—not empty land.</p><p>Flat ground is schematic. Bridge levels, terrain and actual roof heights are still TBD. No proposed building, landscaping or calculated shadows have been added.</p></div><details><summary>Evidence, model & CAD</summary><p>'+totals+' estimated masses · '+min+' minimum-only wireframes · '+unknown+' height-unknown outlines. Existing corrected display footprints may themselves be approximate.</p><p>Arcs use the site latitude and fixed solstice/equinox declinations. Circle marks indicate solar noon, not 12:00 civil time. The dotted ellipse is the ground horizon. Fine rays connect solar noon to the plot; they are not building shadows. The view is orthographic, looking from south-east at 20 degrees elevation. Arc radius is diagrammatic; it is not a real distance to the sun.</p><p><a href="https://gml.noaa.gov/grad/solcalc/solareqns.PDF" target="_blank" rel="noopener">NOAA solar equations</a> · <a href="https://help.autodesk.com/cloudhelp/2024/ENU/AutoCAD-DXF/files/GUID-ABF6B778-BE20-4B49-9B58-A94E64CEFFF3.htm" target="_blank" rel="noopener">Autodesk 3D polyline format</a></p><p>The CAD export is a layered 3D wireframe in local metres, not a DWG solid model. Set insertion units to metres. X is east, Y north, Z up. It needs a checked transformation before overlaying the original survey CAD. Sun arcs are on separate layers and can be removed.</p></details><div class="sa-exports"><button data-sa="svg">Vector drawing · SVG</button><button data-sa="dxf">CAD wireframe · DXF</button><button data-sa="json">Geometry & evidence · JSON</button></div><p class="sa-small">The original Sun plan remains available in its own tab. This section does not edit survey records.</p></aside>';
  svg=draw(model);drawing=svg.querySelector('[data-sun-drawing]');host.querySelector('.sa-canvas').appendChild(svg);fit();
  host.querySelectorAll('[data-sa]').forEach(b=>b.onclick=()=>{const k=b.dataset.sa;if(k==='in')zoom(1.2);if(k==='out')zoom(1/1.2);if(k==='fit')fit();if(k==='svg')save('studio7-sun-axon.svg',exportSVG(),'image/svg+xml');if(k==='dxf')save('studio7-sun-local-metres.dxf',dxf(),'application/dxf');if(k==='json')save('studio7-sun-geometry.json',JSON.stringify(model,null,2),'application/json');});
  const loc=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return[q.x,q.y];};
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),loc(e));},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={p:loc(e),x:state.x,y:state.y,id:e.pointerId};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=loc(e);state.x=drag.x+p[0]-drag.p[0];state.y=drag.y+p[1]-drag.p[1];transform();});
  const end=()=>{drag=null;};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
 }
 return{show,fit,build,draw,dxf,iso,get model(){return model;}};
})();
