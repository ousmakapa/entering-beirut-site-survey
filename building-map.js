/* Shared north-up display geometry. No storage, sync or source-data writes.
   Display rectangles are not legal parcels or certified surveyed footprints. */
window.BuildingMap=(function(){
 'use strict';
 let api=null,cache=null,signature='',current=null,legacyRenderer=null;
 const keys=['history','siteplot','figureground','grain','edges','surveyuse','surveystoreys','surveyera','surveygreen','pictures','streets','access','noise','sun','wind'];
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clone=x=>JSON.parse(JSON.stringify(x));
 const B=()=>window.PICTURES_NEW_DATA;
 const inside=(p,ring)=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const contains=(p,poly)=>inside(p,poly[0])&&!poly.slice(1).some(h=>inside(p,h));
 function center(poly){
  const ring=poly[0],bounds=L.latLngBounds(ring),mid=bounds.getCenter(),p=[mid.lat,mid.lng];if(contains(p,poly))return p;
  // A scan-line interior point keeps tags inside concave outlines, not on their bounding box.
  let best=null;for(let n=1;n<20;n++){const y=bounds.getSouth()+(bounds.getNorth()-bounds.getSouth())*n/20,xs=[];
   poly.forEach(r=>{for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[0]>y)!==(b[0]>y))xs.push(a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0]));}});xs.sort((a,b)=>a-b);
   for(let i=0;i+1<xs.length;i+=2){const q=[y,(xs[i]+xs[i+1])/2],w=xs[i+1]-xs[i];if(contains(q,poly)&&(!best||w>best.w))best={p:q,w};}
  }return best?best.p:ring[0];
 }
 function area(poly){const k=111320,cos=Math.cos(poly[0][0][0]*Math.PI/180);return poly.reduce((sum,r,n)=>{let a=0;const o=r[0];for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(r[j][1]-o[1])*(r[i][0]-o[0])-(r[i][1]-o[1])*(r[j][0]-o[0]);return sum+(n?-1:1)*Math.abs(a)*k*k*cos/2;},0);}
 function model(){
  const entries=window.picturesAuto?.readBuildings()||[],original=api?.records()||[];
  const sig=JSON.stringify([entries,original]);if(cache&&sig===signature)return cache;signature=sig;
  const records=new Map(entries.map(e=>[e.record.id,{...e,record:{...e.record}}]));
  original.forEach(r=>{const e=records.get(r.id);if(e)e.record={...e.record,...r};else records.set(r.id,{record:clone(r),shape:{parts:[],kind:'unassigned'},shots:[]});});
  // Reviewed Auto attributes are a read-only projection. Current explicit values win.
  if(window.AutoAttributes)records.forEach(e=>{e.record=AutoAttributes.resolve(e.record,e.shots);});
  const layout=window.PICTURES_AUTO_DATA?.layout||{},hidden=new Set(layout.hiddenBuildingIds||[]),features=[],byGeometry=new Map();
  const put=(id,rings,recordId,approx,parent)=>{const hash=JSON.stringify(rings);let f=byGeometry.get(hash);if(!f){f={id,rings,at:center(rings),area:area(rings),recordIds:[],approx:!!approx,parent};features.push(f);byGeometry.set(hash,f);}if(recordId&&!f.recordIds.includes(recordId))f.recordIds.push(recordId);return f;};
  for(const e of records.values())if(e.shape.kind!=='site'&&e.shape.parts?.length){
   e.shape.parts.forEach((poly,i)=>put('record-'+e.record.id+'-'+i,poly,e.record.id,e.shape.kind!=='building'||e.shape.status!=='confirmed',e.shape.parentId));
  }
  const owned=new Set(features.map(f=>f.parent).filter(Boolean));
  B().buildings.forEach(b=>{if(!hidden.has(b.id)&&!owned.has(b.id))put(b.id,b.rings,null,false,b.id);});
  // Keep non-building observations separate; they never become a coloured building.
  const openSpace=[...records.values()].filter(e=>e.shape.kind==='site'&&e.shape.parts?.length);
  cache={features,records,openSpace,unplaced:[...records.values()].filter(e=>!e.shape.parts?.length),bounds:B().bounds,site:B().site};return cache;
 }
 function base(group,renderer,options={}){
  group.clearLayers();const m=model(),hidden=new Set(window.PICTURES_AUTO_DATA?.layout.hiddenBaseIndices||[]);
  B().base.forEach((f,i)=>{if(f.building||hidden.has(i))return;
   if(f.polygon)L.polygon(f.polygon,{stroke:false,fillColor:f.color==='#2469b9'?'#c4dbe3':'#d9e3d5',fillOpacity:1,interactive:false,renderer}).addTo(group);
  });
  (window.CONNECTIONS_DATA?.ways||[]).forEach(w=>L.polyline(w.lines,{color:/^(motorway|trunk)/.test(w.tags.highway)?'#9caeb2':'#b4c3c5',weight:/^(motorway|trunk)/.test(w.tags.highway)?2.4:.85,opacity:.8,interactive:false,renderer}).addTo(group));
  m.features.forEach(f=>L.polygon(f.rings,{color:'#73898e',weight:.7,fill:false,opacity:.78,interactive:false,renderer,bmRole:'building-base',bmId:f.id}).addTo(group));return m;
 }
 function shade(ring,options={}){
  const group=L.featureGroup(),context=options.bmContext||'Study context, not an observed building attribute';
  model().features.filter(f=>inside(f.at,ring)).forEach(f=>L.polygon(f.rings,{...options,stroke:true,weight:.8,dashArray:null,fillOpacity:Math.max(.20,options.fillOpacity||0),bmRole:'context-building',bmId:f.id,bmContext:context}).addTo(group));
  return group;
 }
 function point(at,bearing,metres){const a=bearing*Math.PI/180;return[at[0]+metres*Math.cos(a)/111320,at[1]+metres*Math.sin(a)/(111320*Math.cos(at[0]*Math.PI/180))];}
 function note(group,at,text,color='#344f54'){ArchitecturalMap.label(at,text,{height:['siteplot','edges'].includes(current)?2.7:['history','figureground','grain','streets','access','noise'].includes(current)?20:7,color,interactive:false,className:'bm-label'}).addTo(group);}
 function arrow(group,start,end,color){L.polyline([start,end],{color,weight:2.5,dashArray:'7 5',interactive:false}).addTo(group);const a=ArchitecturalMap.project(start),b=ArchitecturalMap.project(end),t=Math.atan2(b[1]-a[1],b[0]-a[0]);L.polyline([ArchitecturalMap.unproject([b[0]-9*Math.cos(t-.5),b[1]-9*Math.sin(t-.5)]),end,ArchitecturalMap.unproject([b[0]-9*Math.cos(t+.5),b[1]-9*Math.sin(t+.5)])],{color,weight:2.5,interactive:false}).addTo(group);}
 function fit(key){if(!api||!keys.includes(key))return false;api.map.invalidateSize();const close=['siteplot','edges'].includes(key),climate=['sun','wind'].includes(key),field=key.startsWith('survey')||key==='pictures',ctr=center([B().site]),recordPoints=model().features.filter(f=>f.recordIds.length).flatMap(f=>f.rings[0]),bounds=close?L.latLngBounds(B().site).pad(.65):climate?L.latLngBounds([point(ctr,0,290),point(ctr,90,290),point(ctr,180,290),point(ctr,270,290)]):field&&recordPoints.length?L.latLngBounds(recordPoints).pad(.08):B().bounds;api.map.fitBounds(bounds,{paddingTopLeft:[22,35],paddingBottomRight:[22,45],maxZoom:close?19:field?17.75:17,animate:false});return true;}
 function distanceToRoad(at,ways){const k=111320,c=Math.cos(at[0]*Math.PI/180);let best=Infinity;const xy=p=>[(p[1]-at[1])*k*c,(p[0]-at[0])*k];for(const w of ways)for(const line of w.lines)for(let i=1;i<line.length;i++){const a=xy(line[i-1]),b=xy(line[i]),v=[b[0]-a[0],b[1]-a[1]],l=v[0]*v[0]+v[1]*v[1],t=l?Math.max(0,Math.min(1,-(a[0]*v[0]+a[1]*v[1])/l)):0;best=Math.min(best,Math.hypot(a[0]+t*v[0],a[1]+t*v[1]));}return best;}
 function hasField(key,r,e){if(key==='pictures')return api.records().some(o=>o.id===r.id)&&(!api.missingOnly()||!api.shots(r.id).length);return key==='surveyuse'?!!(r.use||r.ground||r.autoUpperUse||r.autoGroundUses):key==='surveystoreys'?!!(r.storeys||r.autoStoreysMinimum):key==='surveyera'?!!r.era&&(e.shots.length||api.shots(r.id).length):key==='surveygreen'?!!r.green:!!r.autoRoofObservation||['y','n'].includes(r.added)||['y','n'].includes(r.ready);}
 function category(key,r){
  if(key==='surveystoreys'&&r.autoStoreysMinimum&&!r.storeys)return {id:'minimum',label:'At least '+r.autoStoreysMinimum+' visible levels; total unknown',short:'≥'+r.autoStoreysMinimum+'F',color:'#819294',partial:true};
  if(key==='surveychange'&&r.autoRoofObservation)return {id:'roof-observation',label:'Visible roof / frame observation; date and capacity unknown',short:'Roof',color:'#98754e'};
  const c=api.category(key,r);if(key==='surveyuse'&&c){
   if(r.autoUpperUse){const u=api.category(key,{use:r.autoUpperUse,storeys:2});c.upperColor=u.upperColor;c.aboveLabel=r.autoUpperUse+' · visual interpretation';}
   if(r.autoGroundUses){c.color=c.groundColor='#917963';c.groundShort='several ground uses';}
  }return c;
 }
 function proofs(entry,key){const all=new Map();entry.shots.filter(s=>key!=='pictures'||!s.auto).forEach(s=>all.set(s.id,{...s}));api.shots(entry.record.id).forEach(s=>all.set(s.id,{...all.get(s.id),...s}));return [...all.values()];}
 function popup(entry,key){
  const r=entry.record,shots=proofs(entry,key),dom='bm-proof-'+r.id.replace(/[^\w-]/g,'-');
  const field=key==='pictures'?api.card(r,{[r.id]:shots}):r.autoAttributeReview?AutoAttributes.rows(r,key):api.fieldRows(key,r);
  return '<h3>'+esc(r.note||entry.record.autoEvidence?.title||'Recorded building')+'</h3>'+field+'<p class="bm-small">One record, on its assigned display outline. ≈ means approximate, not a certified parcel.</p>'+(shots.length?'<div class="bm-proof" id="'+dom+'"></div>':'')+(r.autoCreated?'<button data-bm-auto="'+esc(r.id)+'">Open Auto evidence</button>':'<button data-bm-original="'+esc(r.id)+'">Open original record</button>');
 }
 function hydrate(entry,key){const id=entry.record.id,box=document.getElementById('bm-proof-'+id.replace(/[^\w-]/g,'-'));if(box){box.innerHTML='';proofs(entry,key).forEach(s=>{const figure=document.createElement('figure'),link=document.createElement('a'),img=document.createElement('img'),cap=document.createElement('figcaption');img.alt=s.caption||'Original linked survey screenshot';img.loading='eager';img.addEventListener('load',()=>{if(figure.isConnected)requestAnimationFrame(()=>api.fitPopup());});link.target='_blank';link.rel='noopener';link.appendChild(img);figure.appendChild(link);cap.textContent=s.auto?(s.caption||'Auto evidence')+' · '+(s.attribution||'')+' · imagery '+(s.imageryDate||'date not recorded'):'Original survey screenshot · preserved';figure.appendChild(cap);if(s.sourceUrl){const source=document.createElement('a');source.href=s.sourceUrl;source.target='_blank';source.rel='noopener';source.textContent=' · Source view';cap.appendChild(source);}box.appendChild(figure);const show=src=>{if(!figure.isConnected)return;const url=typeof src==='string'?src:src?URL.createObjectURL(src):s.file;if(url){img.src=url;link.href=url;}else cap.textContent+=' · unavailable on this device';};if(s.auto&&s.file)show(s.file);else api.getPhoto(s.id,show);});}document.querySelectorAll('[data-bm-auto]').forEach(b=>b.onclick=()=>{api.go('picturesauto');window.picturesAuto.open(b.dataset.bmAuto,true);});document.querySelectorAll('[data-bm-original]').forEach(b=>b.onclick=()=>window.editPlot(b.dataset.bmOriginal));}
 function popupNode(entry,key){const node=document.createElement('div');node.innerHTML=popup(entry,key);return node;}
 function wire(layer,entry,key){if(key!=='pictures'){layer.options.interactive=false;return;}layer.options.bubblingMouseEvents=false;layer.bindPopup(popupNode(entry,key),{maxWidth:360});layer.on('popupopen',()=>{if(!api.capture(entry.record))hydrate(entry,key);});}
 function render(key){
  if(api)ArchitecturalMap.smoothZoom(api.map);
  current=key;document.body.classList.toggle('building-map-on',keys.includes(key));if(!keys.includes(key)||!api)return;
  const group=api.groups[key],renderer=legacyRenderer||(legacyRenderer=L.canvas({padding:.4})),m=base(group,renderer),isField=key.startsWith('survey')||key==='pictures',painted=[],mappedIds=new Set(),unknownIds=new Set(),autoIds=new Set(),minimumIds=new Set(),conflicts=[];
  const highways=(window.CONNECTIONS_DATA?.ways||[]).filter(w=>/^(motorway|trunk)/.test(w.tags.highway));
  const sizes=m.features.map(f=>f.area).sort((a,b)=>a-b),q1=sizes[Math.floor(sizes.length/3)],q2=sizes[Math.floor(sizes.length*2/3)];
  m.features.forEach(f=>{
   let color=null,opacity=.44,label=null,entry=null,stroke=null,partial=false,unknown=false,reviewed=false;
   if(isField){const es=f.recordIds.map(id=>m.records.get(id)).filter(e=>hasField(key,e.record,e)||(key!=='pictures'&&e.record.autoAttributeReview));if(es.length===1){entry=es[0];const r=entry.record;unknown=!hasField(key,r,entry);reviewed=!!r.autoAttributeReview&&AutoAttributes.applied(key,r);if(unknown)unknownIds.add(r.id);else mappedIds.add(r.id);if(reviewed)autoIds.add(r.id);const cat=key==='pictures'||unknown?null:category(key,r);partial=!!cat?.partial;if(partial)minimumIds.add(r.id);color=unknown?'#a8b1b3':cat?.color||'#5d7566';stroke=key==='surveyuse'&&!r.use&&!r.autoUpperUse?'#819294':cat?.upperColor||color;label=unknown?(key==='surveystoreys'?'?':null):key==='pictures'?(r.storeys?r.storeys+'F':r.autoEvidence?.label||'•'):key==='surveyuse'?null:cat?.short;opacity=unknown||partial||key==='pictures'||key==='surveyuse'&&!r.ground&&!r.autoGroundUses?0:.45;}else if(es.length>1)conflicts.push(...es);}
   else if(key==='figureground'){color='#40585e';opacity=.75;}
   else if(key==='grain'){color=f.area<=q1?'#dacabb':f.area<=q2?'#ad9277':'#755e48';opacity=.65;}
   else if(key==='noise'){const d=distanceToRoad(f.at,highways);if(d<100){color=d<25?'#a65345':d<50?'#c88568':'#dfb5a0';opacity=.50;}}
   if(color){const p=L.polygon(f.rings,{color:stroke||color,weight:unknown?1:entry?1.8:.8,fillColor:color,fillOpacity:opacity,dashArray:unknown||reviewed?'4 3':null,renderer,bmRole:'building-analysis',bmId:f.id,bmRecordId:entry?.record.id||null,bmAttributeStatus:unknown?'unknown':partial?'minimum':reviewed?'auto-reading':'recorded'}).addTo(group);painted.push(f.id);if(entry){wire(p,entry,key);if(label){const marker=ArchitecturalMap.label(f.at,label+(!partial&&!unknown&&(f.approx||reviewed)?'≈':''),{height:4.5,box:true,className:'bm-tag',bmRecordId:entry.record.id}).addTo(group);wire(marker,entry,key);}}else if(key==='noise')p.bindPopup('Building proximity to the mapped highway centreline. This is not measured sound or air pollution.');}
  });
  if(['streets','access','history','noise','edges'].includes(key)){
   (window.CONNECTIONS_DATA?.ways||[]).forEach(w=>{const major=/^(motorway|trunk)/.test(w.tags.highway),walk=/^(footway|pedestrian|steps|path)$/.test(w.tags.highway);if(key==='access'&&!walk&&!w.tags.bridge)return;if(key==='history'&&!major)return;
    const col=walk?'#a63f69':major?'#a35f45':'#39817f';L.polyline(w.lines,{color:col,weight:walk?3.2:major?3:1.5,opacity:.9,renderer,bmRole:'source-road'}).bindPopup(esc(w.name||w.tags.highway)+'<p>Mapped source geometry, not a verified accessible pavement or a measured street width.</p>').addTo(group);
   });
  }
  const ctr=center([B().site]);
  const namedBuildings={surveyuse:['wmttorinikfw','wmttot59lzkm','wmttougywivz'],surveystoreys:['wmttqjojmmgt','wmtvtqgfe0x7','wmttorinikfw','wmttovkrn5zf'],surveyera:['wmttot59lzkm','wmttqjojmmgt','wmtvtqgfe0x7','wmttougywivz'],surveygreen:['wmttqjojmmgt','wmttot59lzkm']};
  const buildingNames={wmttorinikfw:'Suzuki',wmttot59lzkm:'Chidiac · timber',wmttougywivz:'Harley / Bassoul',wmttqjojmmgt:'Credit Libanais',wmtvtqgfe0x7:'Maserati Tower',wmttovkrn5zf:'PLEMICOR'};
  (namedBuildings[key]||[]).forEach(id=>{const f=m.features.find(f=>f.recordIds.includes(id));if(!f)return;const at=point(f.at,id==='wmttovkrn5zf'?270:90,id==='wmttovkrn5zf'?30:38);L.polyline([f.at,at],{color:'#60736b',weight:.65,interactive:false,renderer,bmRole:'named-building-leader',recordId:id}).addTo(group);ArchitecturalMap.label(at,buildingNames[id],{height:7,color:'#263f37',interactive:false,className:'bm-building-name'}).addTo(group);});
  if(!['siteplot','edges','pictures'].includes(key)){
   note(group,[33.89739,35.54164],'STREET 80 · north approach','#267e78');
   note(group,[33.8948,35.54062],'STREET 52 · south approach','#267e78');
   note(group,[33.89543,35.5366],'ARMENIA · river bridge','#267e78');
   note(group,[33.8961,35.5408],'FOOTBRIDGE · mapped stairs','#a33867');
   note(group,[33.89825,35.53965],'SEASIDE ROAD','#a35f45');
   note(group,[33.8956,35.5449],'HIGHWAY','#a35f45');
   note(group,[33.8956,35.53755],'BEIRUT RIVER','#387f89');
  }
  if(key!=='pictures'){
   [275315121,306996681,715531021,701135687,701135688,270786366].forEach(id=>{const w=CONNECTIONS_DATA.ways.find(w=>w.id===id);if(w)L.polyline(w.lines,{color:id===275315121?'#267e78':id===306996681||id===715531021?'#438982':'#a33867',weight:6,interactive:false,renderer,bmRole:'named-reference-road',sourceWay:id}).addTo(group);});
   if(['siteplot','edges'].includes(key)){note(group,[33.89667,35.5414],'STREET 80','#267e78');note(group,[33.89604,35.54104],'HIGHWAY + FOOTBRIDGE','#a33867');}
  }
  if(key==='pictures'&&!api.missingOnly()){
   const linked=new Set(api.records().flatMap(r=>api.shots(r.id).map(s=>s.id)));
   api.media().filter(s=>!s.of&&!linked.has(s.id)&&Number.isFinite(s.lat)&&Number.isFinite(s.lng)).forEach(s=>{
    const dom='bm-place-'+s.id,marker=L.circleMarker([s.lat,s.lng],{radius:5,color:'#8b6950',fillColor:'#fff',fillOpacity:1,bubblingMouseEvents:false,bmRole:'place-record'}).addTo(group);
    const content=document.createElement('div');content.innerHTML=api.mediaPopup([s],dom,null,'Recorded location · not a building assignment');marker.bindPopup(content,{maxWidth:360});marker.on('popupopen',()=>api.fillGallery(dom,[s]));
   });
  }
  if(key==='sun'){[['summer','#bf8732',230],['equinox','#a96649',170],['winter','#785691',115]].forEach(([season,col,r])=>{[9,12,15].forEach(hour=>{const s=window.protectionSolar(season,hour),end=point(ctr,s.azimuth,r);arrow(group,ctr,end,col);note(group,end,season[0].toUpperCase()+' · '+(hour===9?'AM':hour===12?'Noon':'PM'),col);});});}
  if(key==='wind'){[[225,'SW'],[257,'WSW'],[337,'NNW']].forEach(([bearing,name])=>{const start=point(ctr,bearing,210);arrow(group,start,ctr,'#387f89');note(group,start,'From '+name+' · test case','#387f89');});}
  if(key==='history'){note(group,[33.8971,35.5375],'River corridor','#387f89');note(group,[33.8953,35.5445],'Highway corridor','#a35f45');}
  L.polygon(B().site,{color:'#263f37',weight:2.5,fillColor:'#f2dea8',fillOpacity:.85,renderer,bmRole:'project-site'}).bindPopup('Our project plot. The corrected site boundary is retained separately from the surrounding building outlines.').addTo(group);
  note(group,ctr,'OUR PLOT','#263f37');
  if(['siteplot','edges'].includes(key)){
   const s=B().site,edges=[{points:s.slice(0,2),name:'Traffic-facing edge',color:'#a75d46'},{points:s.slice(1,4),name:'Local-street edge',color:'#2f807b'},{points:s.slice(3,7),name:'Northern neighbour',color:'#8d719b'},{points:[s[6],s[0]],name:'Western neighbour',color:'#8d719b'}];
   edges.forEach(e=>L.polyline(e.points,{color:e.color,weight:4,renderer,bmRole:'project-edge'}).bindPopup('<b>'+e.name+'</b><p>Design relationship on the corrected site outline. Not a new legal boundary or verified opening/access permission.</p>').addTo(group));
  }
  const legend=document.getElementById('map-legend');legend.innerHTML='<b class="ml-title">'+esc(api.title(key))+'</b>';
  const rows=isField?(key==='pictures'?[['#5d7566','Original records · click one building']]:api.legend(key).map(r=>[r.literal||api.css(r.color),r.label.replace(/parcel/gi,'building outline')])):key==='figureground'?[['#40585e','Building footprints · not land parcels']]:key==='grain'?[['#dacabb','Smaller building outlines'],['#ad9277','Middle-sized building outlines'],['#755e48','Larger building outlines']]:key==='noise'?[['#a65345','Closest to highway centreline'],['#c88568','Intermediate proximity'],['#dfb5a0','Further within the study band']]:key==='sun'?[['#bf8732','Summer · morning / noon / afternoon'],['#a96649','Equinox · same three moments'],['#785691','Winter · same three moments']]:key==='wind'?[['#387f89','SW / WSW / NNW comparison cases']]:[['#a35f45','Main road corridor'],['#39817f','Local road'],['#a63f69','Mapped footway / stairs']];
  if(key==='surveyuse')rows.push(['#917963','Several ground uses · click for both']);
  if(key==='surveychange')rows.push(['#98754e','Auto roof/frame observation · not dated change']);
  let rowHost=legend;if(key==='surveyuse'){const p=document.createElement('p');p.className='bm-small';p.textContent='Fill = ground-floor use. Outline = use above / building use. Includes original records and reviewed Auto screenshots.';legend.appendChild(p);const d=document.createElement('details');d.innerHTML='<summary>Use colours</summary>';legend.appendChild(d);rowHost=d;}
  rows.filter(([,t])=>!t.startsWith('Badge =')&&!t.startsWith('THE PLOT')).forEach(([c,t])=>{const d=document.createElement('div');d.className='legend-row';d.innerHTML='<i class="bm-swatch" style="background:'+c+'"></i><span>'+esc(t)+'</span>';rowHost.appendChild(d);});
  const msg=document.createElement('p');msg.className='bm-small';msg.textContent=isField?(key==='pictures'?'Original survey records and exact linked photographs.':'Dashed colour = Auto screenshot reading / VERIFY. Grey unfilled outline = reviewed but unknown; click for its photo. '+(key==='surveystoreys'?'≥ = minimum visible levels, NOT total floors; these stay unfilled. ≈ = estimate / approximate outline.':'Colour stays inside the same assigned building outline.')):key==='grain'?'Relative sizes of display outlines, not legal parcel areas. Approximate rectangles influence this comparison.':key==='noise'?'Geometric proximity only—not a sound, exposure or safety rating.':'Corrected building base · approximate display geometry. Roads and our site remain separate.';legend.appendChild(msg);
  const panel=document.getElementById('facts-panel');panel.querySelectorAll('.bm-coverage').forEach(n=>n.remove());const archive=panel.querySelector(':scope > details.jury-more');if(archive&&!archive.querySelector('.bm-archive-note')){const n=document.createElement('p');n.className='bm-small bm-archive-note';n.textContent='Earlier CAD/parcel study retained for reference. Its parcel counts and old geometric calculations do not describe the current building map.';archive.querySelector('summary').after(n);}
  if(isField){const pending=[...m.records.values()].filter(e=>hasField(key,e.record,e)&&!mappedIds.has(e.record.id));const d=document.createElement('details');d.className='bm-coverage';d.innerHTML='<summary>'+mappedIds.size+' mapped readings · '+autoIds.size+' from Auto'+(minimumIds.size?' ('+minimumIds.size+' minimum counts)':'')+' · '+unknownIds.size+' Auto unknown</summary><p>'+pending.length+' readings are not on a building outline. Includes unplaced records and open-space observations. No nearby building is assigned automatically. Original records and photos are preserved; Auto readings are historical visual interpretations.</p>';pending.forEach(e=>{const b=document.createElement('button');b.textContent=e.record.note||e.record.id;b.onclick=()=>{L.popup({maxWidth:360}).setLatLng(api.map.getCenter()).setContent(popupNode(e,key)).openOn(api.map);hydrate(e,key);};d.appendChild(b);});panel.appendChild(d);}
  if(key!=='pictures'){
   const freeze=layer=>{if(layer.eachLayer)layer.eachLayer(freeze);else{layer.unbindPopup?.();layer.options.interactive=false;const element=layer.getElement?.();if(element){element.classList.remove('leaflet-interactive');element.style.pointerEvents='none';layer.removeInteractiveTarget?.(element);}}};group.eachLayer(freeze);
   legend.querySelectorAll('p,span').forEach(n=>{n.textContent=n.textContent.replace(/; click for its photo\./g,'; photographs remain in Pictures Auto.').replace(/ · click for both/g,' · combined reading');});
  }
  ArchitecturalMap.scalePaths(api.map,group,18);
  window.BUILDING_MAP_AUDIT={key,features:m.features.length,painted,mappedIds:[...mappedIds],autoIds:[...autoIds],unknownIds:[...unknownIds],minimumIds:[...minimumIds],conflicts:conflicts.map(e=>e.record.id),unplaced:m.unplaced.map(e=>e.record.id),source:'Pictures Auto corrected display geometry + reviewed attributes'};
 }
 return {configure(a){api=a;},model,base,shade,fit,render,contains,center,area,keys,recordAt(p){const m=model(),hits=m.features.filter(f=>contains(p,f.rings));if(hits.length!==1||hits[0].recordIds.length!==1)return null;return api.records().find(r=>r.id===hits[0].recordIds[0])||null;},refresh(){if(current)render(current);}};
})();
