/* Pictures Auto: geometry assignments are additive metadata on the existing record.
   Opening this map never saves guessed assignments or changes original parcel/at. */
window.createPicturesAutoView = function(api){
  'use strict';
  var D=window.PICTURES_AUTO_DATA, active=false, selected=null, mode=null, clicks=[], undo=[], drafts={}, markers={}, display={}, baseReady=false;
  var bg=L.layerGroup(), buildings=L.layerGroup(), records=L.layerGroup(), old=L.layerGroup(), reference=L.layerGroup(), guide=L.layerGroup(), roadLayers=[];
  var panel=document.createElement('section'); panel.id='pictures-auto-panel';panel.hidden=true;
  panel.innerHTML='<header><div><b>Pictures Auto</b><small id="pa-count"></small></div><button id="pa-collapse" title="Collapse record list">−</button></header>'+
    '<div id="pa-body"><div class="pa-controls"><input id="pa-search" aria-label="Search records" placeholder="Search name, old plot, or record…">'+
    '<label for="pa-filter">Show on map and in list</label><select id="pa-filter" aria-label="Filter records"><option value="all">All cards</option><option value="batch30">Latest batch — 30 screenshots</option><option value="new">New Auto records only</option><option value="auto">Auto additions — with new screenshots</option><option value="enriched">Existing cards enriched by Auto</option><option value="baseline">Your original collection — all cards</option><option value="original">Original only — no Auto additions</option><option value="unassigned">Unassigned — no guessed shape</option><option value="pending">Needs checking</option><option value="confirmed">Checked placements</option><option value="placeholder">User-placed squares</option><option value="split">Approximate building parts</option><option value="site">Open-space observations</option><option value="missing">Needs screenshot</option></select>'+
    '<label><input type="checkbox" id="pa-old"> Aligned old plot outlines</label><label><input type="checkbox" id="pa-context"> Source footprint reference</label><button id="pa-fit">Fit records</button><button id="pa-site">Our plot</button></div>'+
    '<p id="pa-hint" role="status">One tag opens one building/frontage card. A = Auto observation; ≈ = approximate tag position. Dashed outlines remain provisional. Zoom closer if nearby tags overlap.</p>'+
    '<div id="pa-list"></div><div id="pa-detail" hidden></div><small class="pa-source">Base © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · Survey parts are schematic, not cadastral boundaries.</small></div>';
  document.getElementById('map').parentElement.appendChild(panel);
  var streetOption=document.createElement('option');streetOption.value='street';streetOption.textContent='Ring street — 5 new + 3 corrected';
  document.getElementById('pa-filter').insertBefore(streetOption,document.getElementById('pa-filter').options[1]);
  document.querySelector('#pa-filter option[value="batch30"]').textContent='Earlier batch — 30 screenshots';
  document.querySelector('#pa-filter option[value="placeholder"]').textContent='Approximate / user-placed outlines';
  L.DomEvent.disableClickPropagation(panel);L.DomEvent.disableScrollPropagation(panel);
  function el(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function title(r){return r.note||'Old plot '+r.parcel+' · '+r.id.slice(-4);}
  function rectangle(at){
    var width=Number(el('pa-width').value),depth=Number(el('pa-depth').value),angle=Number(el('pa-angle').value)*Math.PI/180;
    if(!Number.isFinite(width)||!Number.isFinite(depth)||!Number.isFinite(angle)||width<2||depth<2||width>150||depth>150)throw Error('Use approximate width/depth between 2 and 150 metres and a valid rotation.');
    var ring=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(function(p){var x=p[0]*width/2,y=p[1]*depth/2;
      return [at[0]+(x*Math.sin(angle)+y*Math.cos(angle))/111320,at[1]+(x*Math.cos(angle)-y*Math.sin(angle))/(111320*Math.cos(at[0]*Math.PI/180))];});
    return [[ring]];
  }
  function shape(r){return drafts[r.id]||(r.newMap&&r.newMap.version===D.version?r.newMap:null)||(D.layout&&D.layout.placements||{})[r.id]||r.newMap||D.seeds[r.id]||{featureId:'record-'+r.id,parts:[],kind:'unassigned',status:'pending',basis:'New record awaiting an explicit placement. No shape has been guessed.'};}
  function mapped(s){return Array.isArray(s.parts)&&s.parts.length>0;}
  function kindName(s){return ({unassigned:'Unassigned — no shape',building:'Building candidate','survey-part':'Approximate survey-derived part',split:'User-divided part',site:'Open-space observation',placeholder:'User-placed outline',schematic:'Legacy schematic square','approximate-outline':'Approximate building outline','schematic-rectangle':'Schematic building rectangle',adjusted:'User-adjusted outline'})[s.kind]||s.kind;}
  function placeName(r,s){return !mapped(s)&&r.autoEvidence&&r.autoEvidence.tagAnchor?'Individual frontage tag — approximate position':kindName(s);}
  function hint(text){el('pa-hint').textContent=text;}
  function padding(){return {paddingTopLeft:[20,20],paddingBottomRight:window.innerWidth<700?[20,panel.offsetHeight+20]:[panel.offsetWidth+20,20]};}
  function snapshotState(r){return {id:r.id,value:r.newMap?clone(r.newMap):null};}
  function save(updates,message){
    var before=updates.map(function(u){return snapshotState(api.record(u.id));});
    if (!api.saveAssignments(updates))return false;
    undo.push(before);if(undo.length>20)undo.shift();drafts={};mode=null;clicks=[];guide.clearLayers();baseReady=false;draw();
    if(selected)open(selected,false);hint(message);return true;
  }
  function edited(r,parts,kind,parent){var s=clone(shape(r));s.parts=parts;delete s.anchor;s.kind=kind;s.parentId=parent||null;s.status='pending';s.basis=kind==='unassigned'?'Placement removed by user; original card and photos retained.':'User-adjusted shape; review position against screenshot.';s.version=D.version;return s;}
  function drawBase(){
    bg.clearLayers();buildings.clearLayers();roadLayers=[];
    var hiddenIndices=new Set(D.layout&&D.layout.hiddenBaseIndices||[]),hiddenIds=new Set(D.layout&&D.layout.hiddenBuildingIds||[]);
    D.base.forEach(function(f,i){
      if(hiddenIndices.has(i))return;
      if(f.polygon)L.polygon(f.polygon,{stroke:!!f.building,color:f.color,weight:.8,fillColor:f.color,fillOpacity:f.building?0:1,interactive:false,renderer:api.canvas}).addTo(bg);
      else {var road=L.polyline(f.line,{color:f.color,weight:f.widthM?Math.max(.45,f.widthM*scale()):.6,opacity:1,interactive:false,renderer:api.canvas}).addTo(bg);if(f.widthM)roadLayers.push({layer:road,width:f.widthM});}
    });
    var targets=D.buildings.filter(function(b){return !hiddenIds.has(b.id);});
    Object.keys(D.layout&&D.layout.placements||{}).forEach(function(id){var r=api.record(id);if(!r)return;var s=shape(r);
      s.parts.forEach(function(part){L.polygon(part,{color:'#78909c',weight:.8,fill:false,interactive:false,renderer:api.canvas}).addTo(bg);
        targets.push({id:s.parentId||'layout-'+id,rings:part});});});
    targets.forEach(function(b){L.polygon(b.rings,{stroke:false,fillOpacity:0,renderer:api.canvas,bubblingMouseEvents:false}).on('click',function(e){
      if(mode==='building'&&selected){var r=api.record(selected),occupants=api.records().filter(function(other){return other.id!==r.id&&mapped(shape(other))&&shape(other).parentId===b.id;});
        if(occupants.length){hint('This outline already contains '+occupants.map(title).join(', ')+'. Use its existing card for another photo, or divide the outline into separate parts; do not assign the whole building twice.');return;}
        save([{id:r.id,value:edited(r,[b.rings],'building',b.id)}],'Building selected. Check its screenshot, then confirm its location.');}
      else if(mode)mapClick(e);
      else hint('Select an existing record in the list, then choose “Assign to building”.');
    }).addTo(buildings);});
    if(D.site)L.polygon(D.site,{color:'#A14B32',weight:2,fill:false,dashArray:'8 5',interactive:false,renderer:api.canvas}).addTo(bg);
    baseReady=true;
  }
  function scale(){return api.map.distance(api.map.containerPointToLatLng([0,0]),api.map.containerPointToLatLng([100,0]))>0?100/api.map.distance(api.map.containerPointToLatLng([0,0]),api.map.containerPointToLatLng([100,0])):1;}
  function matches(r){var s=shape(r),q=el('pa-search').value.toLowerCase(),f=el('pa-filter').value;
    var aliases=(r.autoEvidence&&r.autoEvidence.mergedFrom||[]).map(function(a){return a.label+' '+a.from;}).join(' ');
    return (!q||(title(r)+' '+r.id+' '+r.parcel+' '+aliases+' '+(r.autoCreated?'A'+r.autoNumber:'')).toLowerCase().includes(q))&&
      (f==='all'||f==='new'&&!!r.autoCreated||f==='baseline'&&!r.autoCreated||f==='enriched'&&!r.autoCreated&&!!r.autoEvidence||f==='batch30'&&r.autoEvidence&&r.autoEvidence.batch==='nearby-30-2026-09-13'||f==='auto'&&!!r.autoEvidence||f==='original'&&!r.autoEvidence||f==='pending'&&s.status!=='confirmed'||f==='confirmed'&&s.status==='confirmed'||
       f==='street'&&r.autoEvidence&&r.autoEvidence.streetReview==='ring-street-2026-09-13'||f==='unassigned'&&!mapped(s)||f==='placeholder'&&['placeholder','schematic','approximate-outline','schematic-rectangle'].includes(s.kind)||f==='site'&&s.kind==='site'||f==='split'&&['split','survey-part'].includes(s.kind)||f==='missing'&&!api.shots(r.id).length);}
  function draw(){
    if(!D)return;
    if(!baseReady)drawBase();
    if(!api.group.hasLayer(bg))bg.addTo(api.group);
    if(!api.group.hasLayer(buildings))buildings.addTo(api.group);
    if(!api.group.hasLayer(records))records.addTo(api.group);
    if(!api.group.hasLayer(guide))guide.addTo(api.group);
    records.clearLayers();markers={};display={};
    var rr=api.records(),checked=rr.filter(function(r){return shape(r).status==='confirmed';}).length;
    var filtered=rr.filter(matches),located=filtered.filter(function(r){return mapped(shape(r));}).length;
    var tagOnly=filtered.filter(function(r){return !mapped(shape(r))&&r.autoEvidence&&r.autoEvidence.tagAnchor;}).length;
    var approximate=filtered.filter(function(r){return mapped(shape(r))&&['schematic','approximate-outline','placeholder','schematic-rectangle'].includes(shape(r).kind);}).length;
    el('pa-count').textContent='Showing '+filtered.length+' of '+rr.length+' cards · '+located+' outlines ('+approximate+' approximate) · '+tagOnly+' approximate frontage tags · '+(filtered.length-located-tagOnly)+' without outline/frontage tag · '+checked+' checked overall';
    el('pa-list').innerHTML='';
    filtered.forEach(function(r){
      var s=shape(r),color=r.id===selected?'#C27429':s.status==='confirmed'?'#416D53':'#607D8B';
      if(mapped(s)){
      var layer=L.polygon(s.parts,{color:color,fillColor:color,fillOpacity:0,weight:r.id===selected?3:1.4,
        dashArray:s.status!=='confirmed'||s.kind!=='building'?'6 4':null,renderer:api.canvas,bubblingMouseEvents:false})
        .on('click',function(e){if(mode){mapClick(e);return;}open(r.id,false);}).addTo(records);
      display[r.id]=layer;
      var pos=s.anchor||layer.getBounds().getCenter(),text=(r.autoCreated?'A'+r.autoNumber:r.storeys?r.storeys+'F':'•')+(['schematic','approximate-outline','schematic-rectangle'].includes(s.kind)?'≈':'');
      markers[r.id]=L.marker(pos,{icon:L.divIcon({className:'pa-badge pa-building-tag',html:'<span data-record="'+esc(r.id)+'">'+esc(text)+'</span>',iconSize:[28,22],iconAnchor:[14,11]}),zIndexOffset:2000,bubblingMouseEvents:false})
        .on('click',function(e){if(mode){mapClick(e);return;}open(r.id,false);}).addTo(records);
      }else if(r.autoEvidence&&r.autoEvidence.tagAnchor){
        markers[r.id]=L.marker(r.autoEvidence.tagAnchor.at,{icon:L.divIcon({className:'pa-badge pa-building-tag pa-approximate',html:'<span data-record="'+esc(r.id)+'">A'+esc(r.autoNumber)+'≈</span>',iconSize:[40,22],iconAnchor:[20,11]}),zIndexOffset:2100,bubblingMouseEvents:false})
          .bindTooltip(title(r)+' — approximate frontage position; click for its screenshot')
          .on('click',function(e){if(mode){mapClick(e);return;}open(r.id,false);}).addTo(records);
      }else if(r.autoEvidence&&r.autoEvidence.location&&r.autoEvidence.location.type!=='camera-reference'){
        markers[r.id]=L.marker(r.autoEvidence.location.at,{icon:L.divIcon({className:'pa-frontage',html:'<span>F</span>',iconSize:[26,26],iconAnchor:[13,13]}),zIndexOffset:2100,bubblingMouseEvents:false})
          .bindTooltip('Frontage reference only — building boundary unresolved')
          .on('click',function(e){if(mode){mapClick(e);return;}open(r.id,false);}).addTo(records);
      }
      var button=document.createElement('button');button.className='pa-row'+(selected===r.id?' selected':'');button.dataset.record=r.id;
      button.innerHTML='<b>'+esc(title(r))+'</b><small>'+esc(placeName(r,s))+
        (mapped(s)?' · '+(s.status==='confirmed'?'Checked':'Needs checking'):'')+' · '+api.shots(r.id).length+' photo(s)'+(r.autoEvidence?' · NEW AUTO':'')+'</small>';
      button.onclick=function(){open(r.id,true);};el('pa-list').appendChild(button);
    });
    if(el('pa-old').checked){old.clearLayers();(D.alignedFaces||[]).forEach(function(g){L.polygon(g,{color:'#A64138',weight:1,fill:false,dashArray:'3 5',interactive:false,renderer:api.canvas}).addTo(old);});old.addTo(api.group);}
    else api.group.removeLayer(old);
    reference.clearLayers();
    if(el('pa-context').checked){var ids=new Set(D.layout&&D.layout.hiddenBuildingIds||[]);D.buildings.filter(function(b){return ids.has(b.id);}).forEach(function(b){L.polygon(b.rings,{color:'#a58eae',weight:1,fill:false,dashArray:'2 6',interactive:false,renderer:api.canvas}).addTo(reference);});reference.addTo(api.group);}
    else api.group.removeLayer(reference);
  }
  function open(id,zoom){
    var r=api.record(id);if(!r)return;selected=id;mode=null;clicks=[];guide.clearLayers();draw();
    panel.classList.add('pa-viewing');if(zoom)panel.scrollTop=0;
    var s=shape(r),shots=api.shots(id),detail=el('pa-detail');detail.hidden=false;
    detail.innerHTML='<button id="pa-back">← All cards</button><h3>'+esc(title(r))+'</h3>'+
      '<p class="pa-state">'+esc(placeName(r,s))+(mapped(s)?' · '+(s.status==='confirmed'?'Placement checked':'Needs checking'):'')+'</p><p class="pa-help">'+esc(r.autoEvidence?r.autoEvidence.summary:s.basis)+'</p>'+
      (s.kind==='schematic-rectangle'?'<p class="pa-banner">Simplified rectangular layout — approximate size and position, not a surveyed plot. Original shape retained in the source reference; photos and recorded facts unchanged.</p>':'')+
      '<div id="pa-gallery">'+(shots.length?'Loading linked pictures…':'No screenshot linked to this card.')+'</div>'+
      '<div class="pa-outline-size"><label>Width (m) <input id="pa-width" type="number" min="2" max="150" value="12"></label><label>Depth (m) <input id="pa-depth" type="number" min="2" max="150" value="18"></label><label>Rotation (° from east) <input id="pa-angle" type="number" value="0"></label><small>Estimates only. Match the street and neighbouring footprints.</small></div>'+
      '<div class="pa-actions"><button id="pa-confirm" '+(!mapped(s)?'disabled':'')+'>Confirm location</button><button id="pa-building">Assign to building</button><button id="pa-square">Place sized outline</button><button id="pa-move" '+(!mapped(s)?'disabled':'')+'>Move this shape</button><button id="pa-unassign" '+(!mapped(s)?'disabled':'')+'>Remove placement</button><button id="pa-reference">Show old plot reference</button><button id="pa-undo" '+(!undo.length?'disabled':'')+'>Undo shape edit</button></div>'+
      '<label>Second record for a dividing line<select id="pa-second"><option value="">Choose another existing card…</option>'+api.records().filter(function(x){return x.id!==id;}).map(function(x){return '<option value="'+esc(x.id)+'">'+esc(title(x))+'</option>';}).join('')+'</select></label>'+
      '<button id="pa-split" '+(!mapped(s)?'disabled':'')+'>Draw dividing line → make two parts</button><button id="pa-cancel" hidden>Cancel drawing</button>'+
      '<small class="pa-help">Split lines and squares are schematic. Each part keeps its own information and photo links.</small>'+
      api.card(r);
    el('pa-list').hidden=true;
    el('pa-back').onclick=function(){selected=null;mode=null;detail.hidden=true;el('pa-list').hidden=false;panel.classList.remove('pa-viewing');panel.scrollTop=0;draw();};
    el('pa-confirm').onclick=function(){var value=clone(shape(r));value.status='confirmed';value.checkedAt=new Date().toISOString();save([{id:id,value:value}],'Location confirmed. Approximate geometry remains labelled.');};
    el('pa-unassign').onclick=function(){save([{id:id,value:edited(r,[],'unassigned',null)}],'Placement removed. This card and every linked photo are still available under Unassigned.');};
    el('pa-reference').onclick=function(){
      var ring=D.alignedFaces&&D.alignedFaces[r.parcel];if(!ring){hint('No old survey outline is available for this card.');return;}
      guide.clearLayers();var ref=L.polygon(ring,{color:'#A64138',weight:2,fill:false,dashArray:'3 6',interactive:false}).addTo(guide);
      api.map.fitBounds(ref.getBounds().pad(.7),Object.assign({maxZoom:19},padding()));
      hint('REFERENCE ONLY: locally aligned old survey parcel, not an assigned building. Exact building remains to be checked.');
    };
    function start(m,text){mode=m;clicks=[];guide.clearLayers();hint(text);el('pa-cancel').hidden=false;api.map.closePopup();if(m==='building')records.clearLayers();}
    el('pa-building').onclick=function(){start('building','Click the correct building on the new map.');};
    el('pa-square').onclick=function(){start('square','Click the building centre. The outline uses your width, depth and rotation above; these are approximate, not surveyed dimensions.');};
    el('pa-move').onclick=function(){start('move','Click the new centre for this card’s shape.');};
    el('pa-split').onclick=function(){if(!el('pa-second').value){hint('Choose the other record first, then draw the line.');return;}start('split','Click two points across the shape. First card goes to the left side of your line; second card goes to the right.');};
    el('pa-cancel').onclick=function(){mode=null;clicks=[];guide.clearLayers();this.hidden=true;draw();hint('Drawing cancelled; nothing changed.');};
    el('pa-undo').onclick=function(){var prior=undo.pop();if(prior&&api.saveAssignments(prior)){baseReady=false;draw();open(id,false);hint('Previous shape restored.');}};
    if(shots.length)api.gallery('pa-gallery',shots);
    hint(mapped(s)?'Compare the linked photo with this '+kindName(s).toLowerCase()+'. Dashed outlines are still provisional.':'This card has no assigned shape. Its photo and original information are preserved.');
    if(zoom&&display[id])api.map.fitBounds(display[id].getBounds().pad(.6),Object.assign({maxZoom:20},padding()));
    else if(zoom&&r.autoEvidence&&r.autoEvidence.tagAnchor){var at=L.latLng(r.autoEvidence.tagAnchor.at);api.map.fitBounds(at.toBounds(70),Object.assign({maxZoom:20},padding()));}
    else if(zoom&&r.autoEvidence&&r.autoEvidence.location&&r.autoEvidence.location.type!=='camera-reference'){var at=L.latLng(r.autoEvidence.location.at);api.map.fitBounds(at.toBounds(100),Object.assign({maxZoom:19},padding()));hint(r.autoEvidence.location.basis);}
    if(!mapped(s)&&r.autoEvidence&&r.autoEvidence.tagAnchor){
      hint('This individual tag opens only this frontage’s screenshots. ≈ marks an approximate position, not a confirmed building boundary.');
    }
  }
  // Split a simple polygon at exactly two line crossings; reject ambiguous shapes
  // rather than invent connectors across concave lobes or courtyards.
  function cut(parts,a,b){
    if(parts.length!==1||parts[0].length!==1)throw Error('This shape has separate pieces or a courtyard. Assign one building or place a square before splitting.');
    var ring=parts[0][0].map(function(p){return [p[1],p[0]];}),A=[a.lng,a.lat],B=[b.lng,b.lat];
    if(ring.length>1&&ring[0][0]===ring[ring.length-1][0]&&ring[0][1]===ring[ring.length-1][1])ring.pop();
    function side(p){return (B[0]-A[0])*(p[1]-A[1])-(B[1]-A[1])*(p[0]-A[0]);}
    if(Math.hypot(B[0]-A[0],B[1]-A[1])<1e-7)throw Error('Choose two different points.');
    var crosses=0;ring.forEach(function(p,i){if(side(p)*side(ring[(i+1)%ring.length])<0)crosses++;});
    if(crosses!==2)throw Error('Draw a line through the shape, crossing its boundary twice. Avoid corners.');
    function half(sign){var out=[];ring.forEach(function(p,i){var q=ring[(i+1)%ring.length],s=side(p)*sign,t=side(q)*sign;if(s>=0)out.push(p);if((s>=0)!==(t>=0)){var k=s/(s-t);out.push([p[0]+k*(q[0]-p[0]),p[1]+k*(q[1]-p[1])]);}});if(out.length<3)throw Error('This line does not create two usable parts.');out.push(out[0]);return [[out.map(function(p){return [p[1],p[0]];})]];}
    return [half(1),half(-1)];
  }
  function mapClick(e){
    if(!active||!mode||mode==='building'||!selected)return;
    var r=api.record(selected),s=shape(r),at=[e.latlng.lat,e.latlng.lng];
    if(mode==='square'){try{save([{id:r.id,value:edited(r,rectangle(at),s.kind==='site'?'site':'placeholder',null)}],'Sized outline placed. Dimensions are approximate; original survey data is unchanged.');}catch(e){hint(e.message);}return;}
    if(mode==='move'){
      var center=L.polygon(s.parts).getBounds().getCenter(),dy=at[0]-center.lat,dx=at[1]-center.lng;
      var moved=s.parts.map(function(poly){return poly.map(function(ring){return ring.map(function(p){return [p[0]+dy,p[1]+dx];});});});
      save([{id:r.id,value:edited(r,moved,s.kind==='building'?'adjusted':s.kind,s.parentId)}],'Shape moved. Check its location before confirming.');return;
    }
    clicks.push(e.latlng);L.circleMarker(e.latlng,{radius:4,color:'#C27429',interactive:false}).addTo(guide);
    if(clicks.length===1){hint('Now click the other side of the shape to finish the dividing line.');return;}
    try{var other=api.record(el('pa-second').value);if(!other)throw Error('Choose the second card.');var halves=cut(s.parts,clicks[0],clicks[1]);
      save([{id:r.id,value:edited(r,halves[0],'split',s.parentId)},{id:other.id,value:edited(other,halves[1],'split',s.parentId)}],'Two separate parts saved, each with its original card and pictures. Check which side each card belongs to.');
    }catch(error){clicks=[];guide.clearLayers();hint(error.message);}
  }
  api.map.on('click',mapClick);
  api.map.on('zoomend',function(){if(!active||!baseReady)return;var k=scale();roadLayers.forEach(function(r){r.layer.setStyle({weight:Math.max(.45,r.width*k)});});});
  el('pa-search').oninput=function(){selected=null;mode=null;clicks=[];guide.clearLayers();el('pa-detail').hidden=true;el('pa-list').hidden=false;panel.classList.remove('pa-viewing');draw();hint('One tag opens one building/frontage card. ≈ = approximate position. Zoom closer if nearby tags overlap.');};
  el('pa-filter').onchange=function(){el('pa-search').oninput();var f=this.value;hint(f==='original'?'Only original cards with no assistant additions. Your original collection includes all 71 baseline cards, including enriched ones.':'One tag opens one building/frontage card. ≈ = approximate position. List, map and Fit records share this filter.');};
  el('pa-old').onchange=draw;
  el('pa-context').onchange=draw;
  el('pa-collapse').onclick=function(){var body=el('pa-body');body.hidden=!body.hidden;this.textContent=body.hidden?'+':'−';};
  el('pa-fit').onclick=function(){var points=[];api.records().filter(matches).forEach(function(r){shape(r).parts.forEach(function(p){points=points.concat(p[0]);});if(!mapped(shape(r))&&r.autoEvidence){if(r.autoEvidence.tagAnchor)points.push(r.autoEvidence.tagAnchor.at);else if(r.autoEvidence.location&&r.autoEvidence.location.type!=='camera-reference')points.push(r.autoEvidence.location.at);}});api.map.fitBounds(points.length?points:(D.site||D.bounds),padding());};
  el('pa-site').onclick=function(){mode=null;clicks=[];guide.clearLayers();api.map.fitBounds(L.latLngBounds(D.site).pad(1),Object.assign({maxZoom:19},padding()));hint('OUR PLOT: original survey outline, locally aligned to the new base using seven matching structures. Approximate display registration, not a certified boundary.');};
  return {draw:draw,show:function(on){active=on;panel.hidden=!on;document.body.classList.toggle('pictures-auto-on',on);if(on){window.scrollTo(0,0);api.map.invalidateSize();draw();}else{mode=null;clicks=[];guide.clearLayers();}},
    open:open,shape:shape,cut:cut,fit:function(){el('pa-fit').click();},stats:function(){return {records:api.records().length,visible:Object.keys(display).length,seedKinds:D.seeds,selected:selected,mode:mode};}};
};
