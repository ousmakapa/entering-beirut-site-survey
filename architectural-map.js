/* Presentation only. One authored drawing per analysis, in fixed projected coordinates.
   SVG, text, strokes, symbols and hatches scale together. No viewport label solver,
   storage, record edits, new footprints, environmental measurements or route inference. */
window.ArchitecturalMap=(function(){
 'use strict';
 const NS='http://www.w3.org/2000/svg',origin=[33.89653,35.54112],cos=Math.cos(origin[0]*Math.PI/180),states={};
 const palette={ink:'#263f3b',road:'#a05843',walk:'#a33867',local:'#267e78',home:'#40806a',work:'#b47b37',north:'#796195',water:'#387da0',air:'#b37836',sun:'#bf8b21',wind:'#338c94',noise:'#b64d48',grey:'#718187'};
 const frames={connections:[-660,-620,1350,1240],people:[-660,-620,1350,1240],daily:[-660,-530,1350,1120],accessibility:[-530,-290,1120,820],protection:[-250,-215,530,410]};
 function el(name,attrs={},text){const n=document.createElementNS(NS,name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n;}
 function project(at){const o=L.CRS.EPSG3857.project(L.latLng(origin)),p=L.CRS.EPSG3857.project(L.latLng(at));return[(p.x-o.x)*cos,(o.y-p.y)*cos];}
 function unproject(p){const o=L.CRS.EPSG3857.project(L.latLng(origin));return L.CRS.EPSG3857.unproject(L.point(o.x+p[0]/cos,o.y-p[1]/cos));}
 function bounds(f){return L.latLngBounds(unproject([f[0],f[1]+f[3]]),unproject([f[0]+f[2],f[1]]));}
 const path=(points,close=false)=>points.map((p,i)=>(i?'L':'M')+p.map(x=>x.toFixed(3)).join(',')).join(' ')+(close?' Z':'');
 const geoPath=(rings,close=true)=>{const paths=[];const visit=r=>{if(!r?.length)return;if(Array.isArray(r[0])&&typeof r[0][0]==='number')paths.push(path(r.map(project),close));else r.forEach(visit);};visit(rings);return paths.join(' ');};
 function svgFrame(f,key){const svg=el('svg',{xmlns:NS,viewBox:f.join(' '),preserveAspectRatio:'none','data-architectural-map':key,role:'group','aria-label':key+' fixed architectural analysis drawing'});
  const style=el('style');style.textContent='.arch-text{font-family:Inter,"Segoe UI",Arial,sans-serif;paint-order:stroke;stroke:#fafaf6;stroke-width:2;stroke-linejoin:round}.arch-hit{cursor:pointer;pointer-events:all}.arch-hit:focus{outline:none;filter:drop-shadow(0 0 2px #263f3b)}.arch-hit:focus .arch-text,.arch-hit:hover .arch-text{fill:#142f29;text-decoration:underline}.arch-ref{font-family:Inter,"Segoe UI",Arial,sans-serif;cursor:pointer;pointer-events:all}.arch-ref:hover,.arch-ref:focus{font-weight:900;text-decoration:underline;outline:none}';svg.appendChild(style);return svg;
 }
 function line(parent,pts,color,width=1,dash,attrs={}){const p=el('path',{d:path(pts),fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',...attrs});if(dash)p.setAttribute('stroke-dasharray',dash);parent.appendChild(p);return p;}
 function text(parent,p,words,size=10,color=palette.ink,attrs={}){const n=el('text',{x:p[0],y:p[1],fill:color,'font-size':size,class:'arch-text',...attrs},words);parent.appendChild(n);return n;}
 function arrow(parent,a,b,color,size=6,width=1.5,dash){line(parent,[a,b],color,width,dash);const t=Math.atan2(b[1]-a[1],b[0]-a[0]);line(parent,[[b[0]-size*Math.cos(t-.48),b[1]-size*Math.sin(t-.48)],b,[b[0]-size*Math.cos(t+.48),b[1]-size*Math.sin(t+.48)]],color,width);}
 function glyph(parent,type,p,size,color){const g=el('g',{transform:'translate('+p.join(' ')+') scale('+size+')','data-symbol':type,fill:'none',stroke:color,'stroke-width':.11,'stroke-linecap':'round','stroke-linejoin':'round'});parent.appendChild(g);
  const d={noise:'M-.8 .3 L-.5 .3 L-.15 .6 L-.15 -.6 L-.5 -.3 L-.8 -.3 Z M.1 -.38 Q.6 0 .1 .38 M.4 -.65 Q1.2 0 .4 .65',sun:'M0 -.55 A.55 .55 0 1 1 -.001 -.55 M0 -.9 V-1.1 M.75 -.75 L.9 -.9 M.9 0 H1.1 M.75 .75 L.9 .9 M0 .9 V1.1 M-.75 .75 L-.9 .9 M-.9 0 H-1.1 M-.75 -.75 L-.9 -.9',wind:'M-1 -.3 H.5 Q1 -.3 .8 -.65 Q.6 -.9 .4 -.6 M-1 .15 H.9 M-.7 .55 H.4 Q.8 .55 .7 .85',water:'M0 -1 Q1.3 .4 .5 .85 Q0 1.2 -.5 .85 Q-1.3 .4 0 -1 Z',steps:'M-1 .8 H-.5 V.3 H0 V-.2 H.5 V-.7 H1 M-1 1 H1',bridge:'M-1 -.45 H1 M-1 .45 H1 M-.6 -.7 V.7 M.6 -.7 V.7 M-1 0 H1',home:'M-1 0 L0 -.9 L1 0 M-.7 -.15 V.85 H.7 V-.15 M-.15 .85 V.3 H.2 V.85',work:'M-1 .75 V-.4 L-.3 0 V-.4 L.4 0 V-.9 H.8 V.75 Z',clock:'M0 -1 A1 1 0 1 1 -.001 -1 M0 -.6 V0 L.45 .25',entry:'M-.7 .9 V-.9 H.7 V.9 M-1.2 0 H.2 M-.1 -.3 L.2 0 L-.1 .3',check:'M0 -1 L1 .8 H-1 Z M0 -.4 V.15 M0 .4 V.48',view:'M-1 0 Q0 -1.2 1 0 Q0 1.2 -1 0 M0 -.25 A.25 .25 0 1 1 -.001 -.25',road:'M-.55 -1 V1 M.55 -1 V1 M0 -.9 V-.4 M0 -.15 V.25 M0 .5 V.9'};
  if(type==='air'){[[-.75,0],[-.3,-.45],[.3,-.1],[.7,-.55],[-.1,.55],[.7,.55]].forEach(([x,y],i)=>g.appendChild(el('circle',{cx:x,cy:y,r:i%2?.15:.1,fill:color,stroke:'none'})));}
  else g.appendChild(el('path',{d:d[type]||d.check}));return g;
 }
 function addPatterns(svg,key,s){const defs=el('defs');svg.appendChild(defs);for(const [name,col]of [['air',palette.air],['water',palette.water],['traffic',palette.north]]){const p=el('pattern',{id:'arch-'+key+'-'+name,patternUnits:'userSpaceOnUse',width:s,height:s});if(name==='air')p.appendChild(el('circle',{cx:s/2,cy:s/2,r:s*.13,fill:col}));else p.appendChild(el('path',{d:'M0 '+s+' L'+s+' 0',stroke:col,'stroke-width':s*.1}));defs.appendChild(p);}}
 function base(svg,unit){const m=BuildingMap.model(),g=el('g',{'data-drawing-base':'Pictures Auto effective geometry'});svg.appendChild(g);const hidden=new Set(window.PICTURES_AUTO_DATA?.layout.hiddenBaseIndices||[]);
  PICTURES_NEW_DATA.base.forEach((f,i)=>{if(f.building||hidden.has(i)||!f.polygon)return;g.appendChild(el('path',{d:geoPath([f.polygon]),fill:f.color==='#2469b9'?'#c8dfe6':'#e0e5d9',stroke:'none'}));});
  CONNECTIONS_DATA.ways.forEach(w=>g.appendChild(el('path',{d:geoPath(w.lines,false),fill:'none',stroke:'#bac5c4','stroke-width':/^(motorway|trunk)/.test(w.tags.highway)?unit*1.4:unit*.48,'data-source-way':w.id})));
  m.features.forEach(f=>g.appendChild(el('path',{d:geoPath(f.rings),fill:'#f7f7f1','fill-rule':'evenodd',stroke:'#b3bfbd','stroke-width':unit*.4,'data-bm-id':f.id})));return m;
 }
 function context(svg,m,zones,colors,unit){const g=el('g',{'data-role':'building-aligned-study-context'});svg.appendChild(g);zones.forEach((z,i)=>{m.features.filter(f=>BuildingMap.contains(f.at,[z.ring])).forEach(f=>g.appendChild(el('path',{d:geoPath(f.rings),fill:colors[i],opacity:.18,stroke:colors[i],'stroke-width':unit*.25,'data-context-building':f.id})));});}
 function roads(svg,ids,col,width,dash){ids.forEach(id=>{const w=CONNECTIONS_DATA.ways.find(w=>w.id===id);if(w){const p=el('path',{d:geoPath(w.lines,false),fill:'none',stroke:col,'stroke-width':width,'stroke-linecap':'round','data-role':'named-source-street','data-source-way':id});if(dash)p.setAttribute('stroke-dasharray',dash);svg.appendChild(p);}});}
 function commonRoads(svg,unit,options={}){roads(svg,[200611932,237737315,692409629],options.highway||palette.road,unit*3);roads(svg,[26316545,692400343],palette.road,unit*2);roads(svg,[275315121],options.local||palette.local,unit*2.6,options.dash);roads(svg,[306996681,715531021],options.local||palette.local,unit*2.3,options.dash);roads(svg,[701135687,701135688,270786366,1069243892,1069243890,1069243891],palette.walk,unit*3.3);roads(svg,[452148075,452148076],palette.local,unit*2.2);}
 function site(svg,unit){const g=el('g',{'data-role':'project-site'});g.appendChild(el('path',{d:geoPath([PICTURES_NEW_DATA.site]),fill:'#efdc91',stroke:palette.ink,'stroke-width':unit*2,'fill-opacity':.88}));svg.appendChild(g);return g;}
 function refs(parent,ids,p,size,col,state){ids.forEach((id,i)=>{const t=state.tags.find(t=>t.id===id);if(!t)return;const n=text(parent,[p[0]+i*size*3.6,p[1]],id,size,col,{class:'arch-ref',role:'button',tabindex:'0','data-evidence':id,'aria-label':id+' · '+t.title});n.appendChild(el('title',{},t.title));const activate=e=>{e.stopPropagation();state.open(id);select(state.key,id);};n.addEventListener('click',activate);n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(e);}});});}
 function callout(state,ids,p,title,sub,symbol,col,options={}){const {svg,size,tags}=state,t=tags.find(t=>t.id===ids[0]);if(!t)return;const at=project(t.at),g=el('g',{'data-callout':ids.join(' ')});svg.appendChild(g);const anchor=[p[0]-size*1.25,p[1]-size*.2];line(g,[at,anchor],col,size*.065,'2 2',{'data-role':'fixed-leader'});g.appendChild(el('circle',{cx:at[0],cy:at[1],r:size*.16,fill:col}));glyph(g,symbol,anchor,size*.7,col);text(g,p,title,size,col,{'font-weight':750});
  const captions=[];(Array.isArray(sub)?sub:[sub]).filter(Boolean).forEach(s=>{let row='';s.split(' ').forEach(word=>{if((row+' '+word).length>38&&row){captions.push(row);row=word;}else row+=(row?' ':'')+word;});if(row)captions.push(row);});captions.forEach((s,i)=>text(g,[p[0],p[1]+size*(1.35+i*1.2)],s,size*.78,palette.ink));refs(g,ids,[p[0],p[1]+size*(1.45+captions.length*1.2)],size*.68,col,state);return g;}
 function titleAt(svg,p,s,size,col){text(svg,p,s,size,col,{'font-weight':650,'letter-spacing':size*.035});}
 function north(svg,f,size){const x=f[0]+f[2]-size*2,y=f[1]+size*3;arrow(svg,[x,y+size*2.5],[x,y],palette.ink,size*.7,size*.16);text(svg,[x,y-size*.5],'N',size,palette.ink,{'text-anchor':'middle'});}
 function urban(state){const {svg,size,key}=state,u=2.2,m=base(svg,u);if(key==='connections')context(svg,m,CONNECTIONS_DATA.zones,[palette.north,palette.work,palette.home],u);else context(svg,m,(key==='people'?PEOPLE_DATA:DAILY_DATA).zones,[palette.home,palette.work,palette.north,palette.water],u);
  commonRoads(svg,u);site(svg,u);titleAt(svg,[-21,-8],'OUR PLOT',size*.82,palette.ink);titleAt(svg,[-590,60],'BEIRUT RIVER',size*.85,palette.water);
  if(key==='connections'){
   callout(state,['Q1'],[280,-570],'SHORELINE IS FURTHER NORTH','No continuous waterfront route established','check',palette.grey);
   callout(state,['R2'],[-160,-372],'SEASIDE ROAD','Northern road corridor — not the coast','road',palette.road);
   callout(state,['D3'],[-570,-175],'FORUM DE BEYROUTH','Destination across the river','work',palette.north);
   callout(state,['L2'],[160,-227],'STREET 80','Northern approach beside our plot','road',palette.local);
   callout(state,['D1','D2'],[250,-63],'WORKING FRONTAGES','Business + service destinations nearby','work',palette.work);
   callout(state,['P','C1','Q2'],[-236,39],'FOOTBRIDGE → OUR PLOT',['From the southern neighbourhood','Stairs + final landing need checking'],'bridge',palette.walk);
   callout(state,['R1'],[240,90],'HIGHWAY','Regional connection / local barrier','road',palette.road);
   callout(state,['C2'],[360,290],'EASTERN FOOTBRIDGE','Another crossing — also mapped steps','bridge',palette.walk);
   callout(state,['C3'],[-570,225],'ARMENIA BRIDGE','West–east crossing of the river','bridge',palette.local);
   callout(state,['L1'],[-190,324],'STREET 52','Southern approach toward the footbridge','road',palette.local);
   callout(state,['L3'],[60,475],'LOCAL SHOPS + WORKSHOPS','Armenia / Street 12 network','work',palette.home);
  }else if(key==='people'){
   callout(state,['Q1'],[280,-557],'FURTHER-NORTH WORKERS?','Workplaces and trips not established','check',palette.grey);
   callout(state,['N2','N3'],[40,-367],'NORTH · BUSINESS + MIXED USES',['Possible partners, learners and staff','Homes and workshops also occur here'],'work',palette.north);
   callout(state,['W1'],[-570,-190],'WEST · OCCASIONAL VISITORS','Across the river — not guaranteed users','bridge',palette.water);
   callout(state,['N1','E1'],[225,-91],'NEARBY · STAFF + CUSTOMERS',['Potential short visits / shared resources','A reason to stop must be tested'],'work',palette.work);
   callout(state,['P','C1'],[-250,76],'OUR PLOT · SHARED THRESHOLD',['Connect learning, display and meeting','Bridge stairs can exclude some users'],'entry',palette.walk);
   callout(state,['S1','S2'],[20,304],'SOUTH · RESIDENTS + MAKERS',['Everyday neighbours, trade and learning','Support quiet use alongside working life'],'home',palette.home);
   callout(state,['S3'],[-238,514],'BUILD ON EXISTING LEARNING','Test partnerships, not duplicated provision','work',palette.home);
  }else{
   callout(state,['T3','T4'],[60,-350],'NORTH · DIFFERENT WORKING HOURS','Shift patterns and closing times: verify','clock',palette.north);
   callout(state,['T9','T8'],[-570,-160],'WEST · OCCASIONAL EVENTS','Arrival and return across Armenia bridge','clock',palette.water);
   callout(state,['T2','T7'],[225,-89],'PLOT SIDE · WORK + DELIVERIES',['Morning setup → customers → closing','Keep service movements out of waiting space'],'work',palette.work);
   callout(state,['P','T11','T6'],[-260,61],'OUR PLOT · OPEN IN LAYERS',['Daytime shared use → evening arrival','Keep the bridge-to-door route legible'],'entry',palette.walk);
   callout(state,['T5'],[280,124],'HIGHWAY · A DIFFERENT CLOCK','Closed shops do not mean a silent street','noise',palette.road);
   callout(state,['T1','T10'],[20,334],'SOUTH · HOME LIFE CONTINUES',['Trade → evening use → rest','Protect neighbours after work closes'],'home',palette.home);
   // A temporal sequence, not a quantity or live opening-hours chart.
   const x=-180,y=505;['MORNING','WORKING DAY','EVENING / REST'].forEach((s,i)=>{const xx=x+i*225;if(i<2)arrow(svg,[xx+9,y],[xx+207,y],palette.grey,7,1.2);svg.appendChild(el('circle',{cx:xx,cy:y,r:6,fill:[palette.work,palette.home,palette.north][i]}));text(svg,[xx,y+23],s,12,palette.ink);});text(svg,[x,y+46],'Sequence to investigate · no measured hourly flows',11,palette.grey);
  }
 }
 function accessibility(state){const {svg,size}=state,u=1.5;base(svg,u);commonRoads(svg,u,{highway:'#c0b5ac',local:palette.local,dash:'10 5'});site(svg,u);titleAt(svg,[-26,-12],'OUR PLOT',size*.78,palette.ink);
  // Steps are the mapped geometry, not generic crossing dots.
  [270786366,701135688,1069243890,1069243891].forEach(id=>{const w=CONNECTIONS_DATA.ways.find(w=>w.id===id);if(w)w.lines.forEach(r=>{const pts=r.map(project);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],t=Math.atan2(b[1]-a[1],b[0]-a[0]),len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<len;d+=4){const x=a[0]+d*Math.cos(t),y=a[1]+d*Math.sin(t);line(svg,[[x-4*Math.sin(t),y+4*Math.cos(t)],[x+4*Math.sin(t),y-4*Math.cos(t)]],palette.walk,1.4);}}});});
  callout(state,['X5','X12'],[85,-209],'NORTH · STREET 80',['Same-side approach / loading interface','Pavements and driveways need checking'],'road',palette.local);
  callout(state,['X10','X11','P'],[-277,-95],'ONE LEGIBLE ENTRANCE',['Street → threshold → shared rooms','Shelter without a compulsory stair'],'entry',palette.ink);
  callout(state,['X13'],[215,-53],'ASSISTED ARRIVAL?','Legal stopping place still to be located','check',palette.water);
  callout(state,['X2','X8','X14'],[126,53],'LANDING → BEND → DOOR',['Separate waiting from turning traffic','Check levels, rain and evening light'],'entry',palette.work);
  callout(state,['X1','X4','X9'],[-209,223],'SOUTH · STREET 52 + FOOTBRIDGE',['Mapped stairs interrupt step-free access','Check the full approach, not only the deck'],'steps',palette.walk);
  callout(state,['X6','X7'],[-490,145],'WEST · ARMENIA BRIDGE',['River crossing + onward local junctions','Continuous usable pavement: verify'],'bridge',palette.local);
  callout(state,['X3'],[280,310],'EAST · SECOND FOOTBRIDGE',['Mapped bridge and steps','Not a verified step-free detour'],'steps',palette.walk);
  text(svg,[-290,451],'APPROACH  →  CROSSING  →  LANDING  →  THRESHOLD',13,palette.ink,{'font-weight':700});text(svg,[-290,473],'Dashed street colour = route to audit, not an accessible-route certification',11,palette.grey);
 }
 function protection(state){const {svg,size}=state,u=.42;base(svg,u);addPatterns(svg,'protection',2.5);roads(svg,[200611932,237737315,692409629],palette.noise,2.1);roads(svg,[26316545,692400343],palette.grey,1.2);roads(svg,[275315121],palette.north,1.7);roads(svg,[701135687,701135688,270786366],palette.walk,1.8);site(svg,u);
  // Pattern restricted to the mapped source-line stroke; not a dispersion halo.
  [200611932,237737315,692409629].forEach(id=>{const w=CONNECTIONS_DATA.ways.find(w=>w.id===id);if(w)svg.appendChild(el('path',{d:geoPath(w.lines,false),stroke:'url(#arch-protection-air)','stroke-width':6,fill:'none','data-mechanism':'traffic-emission-source-not-plume'}));});
  // Sound-wave pictogram directed away from a source anchor, NOT measured isophones.
  const source=project(PROTECTION_DATA.tags.find(t=>t.id==='N1').at);for(const r of [5,9,13])svg.appendChild(el('path',{d:'M'+(source[0]-r)+','+source[1]+' Q'+source[0]+','+(source[1]-r*1.6)+' '+(source[0]+r)+','+source[1],fill:'none',stroke:palette.noise,'stroke-width':.75,'data-mechanism':'sound-source-symbol'}));
  // West-facing afternoon test and two airflow cases, all explicitly illustrative.
  [-15,0,15].forEach(y=>arrow(svg,[-62,y],[-31,y],palette.sun,3,.8));glyph(svg,'sun',[-74,0],4,palette.sun);
  arrow(svg,[-37,-79],[-13,-33],palette.wind,3,.75,'3 2');arrow(svg,[-72,65],[-26,30],palette.wind,3,.75,'3 2');
  const east=project(PROTECTION_DATA.tags.find(t=>t.id==='R2').at);glyph(svg,'water',[east[0]+7,east[1]+3],3,palette.water);
  // Small cross-hatch sample marks an investigation station, not a flood/soil boundary.
  svg.appendChild(el('rect',{x:-9,y:-18,width:10,height:9,fill:'url(#arch-protection-water)','data-mechanism':'ground-investigation-station'}));
  glyph(svg,'entry',[26,0],4,palette.north);glyph(svg,'view',[-20,37],3,palette.north);
  titleAt(svg,[-14,-1],'OUR PLOT',4.3,palette.ink);text(svg,[-15,6],'shelter ≠ sealed',3.4,palette.ink);
  callout(state,['N2'],[-34,-187],'OTHER ROAD SOURCES','North is not automatically quiet','noise',palette.grey);
  callout(state,['W1','W2'],[-206,-148],'AIRFLOW · TEST OPENINGS',['Illustrative NNW / SW cases','Shelter must not trap air'],'wind',palette.wind);
  callout(state,['S1','S2'],[-203,-71],'SUN + HEAT',['West-side afternoon shade test','Green colour does not prove shade'],'sun',palette.sun);
  callout(state,['N1'],[-203,71],'TRAFFIC NOISE',['Southern highway → plot','Test shielding in section'],'noise',palette.noise);
  callout(state,['A1','A2'],[87,94],'DUST + EXHAUST',['Road-source strip, not a plume','Intakes / outlets need locating'],'air',palette.air);
  callout(state,['R1','R2','G1'],[96,21],'RAIN + GROUND',['Check levels and drainage','River ≠ a plot flood boundary'],'water',palette.water);
  callout(state,['T1','V2'],[92,-83],'STREET 80 · ARRIVAL',['Keep waiting clear of vehicles','Find the entrance after dark'],'road',palette.north);
  callout(state,['T2','V1'],[-118,142],'BRIDGE LANDING + VIEWS','Clear passage / privacy in section','bridge',palette.walk);
  callout(state,['P','C1','E1'],[74,-159],'SELECTIVE SHELTER',['Shared space and upper rooms','Need different exposure tests'],'entry',palette.ink);
 }
 function render(key,api,open){const f=frames[key];if(!f)return false;const D=window[({connections:'CONNECTIONS',people:'PEOPLE',daily:'DAILY',accessibility:'ACCESSIBILITY',protection:'PROTECTION'})[key]+'_DATA'],svg=svgFrame(f,key),state={key,svg,tags:D.tags,open,size:key==='protection'?8:key==='accessibility'?19:22};
  if(key==='protection')protection(state);else if(key==='accessibility')accessibility(state);else urban(state);north(svg,f,state.size);
  const layer=L.svgOverlay(svg,bounds(f),{interactive:false,className:'architectural-drawing',bubblingMouseEvents:false});api.group.clearLayers();layer.addTo(api.group);state.layer=layer;states[key]=state;
  const keybox=document.getElementById(key+'-key');if(keybox){keybox.innerHTML='<b>'+({connections:'EXISTING LINKS',people:'POTENTIAL USERS',daily:'ONE DAY, DIFFERENT NEEDS',accessibility:'THE WHOLE ARRIVAL',protection:'DIFFERENT PRESSURES'})[key]+'</b><span>Words name the feature. Symbols explain its role.</span><span>Small references open the evidence.</span><small>'+({connections:'Solid colour follows mapped streets and bridges. Building tint groups context, not individual use.',people:'Tint = study context, not population. User groups and reasons to visit are hypotheses.',daily:'Sequence = time questions, not counted activity or confirmed opening hours.',accessibility:'Stair strokes = mapped steps. Dashed roads = approaches to check, not certified accessible routes.',protection:'Waves = sound source · dots = emissions source<br>Rays = sun test · arrows = airflow cases<br>No measured exposure, plume or flood extent.'})[key]+'</small>';}
  const caption=document.getElementById(key+'-caption');if(caption)caption.innerHTML='FIXED ARCHITECTURAL DRAWING · labels, symbols and hatches zoom with the buildings<br><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · corrected building base · interpretation, not measured performance';
  window.ARCHITECTURAL_MAP_AUDIT={key,tagIds:[...svg.querySelectorAll('[data-evidence]')].map(n=>n.getAttribute('data-evidence')),featureIds:[...svg.querySelectorAll('[data-bm-id]')].map(n=>n.getAttribute('data-bm-id')),frame:f.slice(),fixed:true};return true;
 }
 function select(key,id){const s=states[key],t=s?.tags.find(t=>t.id===id);if(!s)return;s.svg.querySelectorAll('[data-selected-evidence]').forEach(n=>n.remove());if(!t)return;const p=project(t.at),r=key==='protection'?3:10;s.svg.appendChild(el('circle',{cx:p[0],cy:p[1],r,fill:'none',stroke:palette.ink,'stroke-width':r/7,'data-selected-evidence':id}));}
 function fit(key,map,panel){if(!frames[key])return false;map.invalidateSize();map.fitBounds(bounds(frames[key]),{paddingTopLeft:[22,50],paddingBottomRight:innerWidth<700?[18,panel.offsetHeight+20]:[panel.offsetWidth+35,30],animate:false});return true;}
 // Geographic SVG labels for building / photo maps. No CSS screen-size compensation.
 function label(at,words,options={}){const p=project(at),h=options.height||3.4,w=Math.max(h*2,words.length*h*.7),f=[p[0]-w/2,p[1]-h*.85,w,h*1.7],svg=svgFrame(f,'label');svg.setAttribute('class','arch-world-label '+(options.className||''));svg.setAttribute('data-fixed-at',JSON.stringify(at));svg.style.overflow='visible';
  if(options.box)svg.appendChild(el('rect',{x:f[0],y:f[1],width:w,height:f[3],fill:options.fill||'#fafaf4',stroke:options.color||palette.ink,'stroke-width':h*.08,rx:h*.12}));text(svg,[p[0],p[1]+h*.35],words,h,options.color||palette.ink,{'text-anchor':'middle','font-weight':650,style:'stroke-width:'+h*.24});
  if(options.dataRecord)svg.setAttribute('data-record',options.dataRecord);if(options.dataManual)svg.setAttribute('data-manual',options.dataManual);
  const layer=L.svgOverlay(svg,bounds(f),{interactive:options.interactive!==false,bubblingMouseEvents:false,...options});layer.getLatLng=()=>L.latLng(at);return layer;
 }
 // Freeze presentation stroke sizes to a reference zoom; coordinates never change.
 function scalePaths(map,group,reference=18){let applying=false;const update=()=>{if(applying||!map.hasLayer(group))return;applying=true;const scale=map.getZoomScale(map.getZoom(),reference);const visit=l=>{if(l.eachLayer)l.eachLayer(visit);else if(l instanceof L.Path){if(!l._architecturalStyle)l._architecturalStyle={weight:l.options.weight,dash:l.options.dashArray,radius:l instanceof L.CircleMarker&&!(l instanceof L.Circle)?l.getRadius():null};const o=l._architecturalStyle;if(Number.isFinite(o.weight))l.setStyle({weight:o.weight*scale,dashArray:o.dash?String(o.dash).split(/[ ,]+/).map(Number).map(v=>v*scale).join(' '):null});if(o.radius!==null)l.setRadius(o.radius*scale);}};visit(group);applying=false;};if(!group._architecturalScale){group._architecturalScale=update;map.on('zoomend',update);group.on('add',update);}update();}
 return{render,select,fit,label,scalePaths,project,unproject,frames};
})();
