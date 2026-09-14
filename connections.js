/* Isolated research view: no survey storage, assignment, photo or sync writes. */
window.createConnections = function(api){
  'use strict';
  var D=window.CONNECTIONS_DATA,B=window.PICTURES_NEW_DATA,active=false,selected=null,preset='all';
  var base=L.layerGroup(),zones=L.layerGroup(),roads=L.layerGroup(),tags=L.layerGroup(),focus=L.layerGroup();
  var canvas=L.canvas({padding:.35}),ready=false,markers={},shown={regional:true,local:true,crossing:true,destination:true,question:true,zones:true};
  var colors={regional:'#a65035',local:'#14776e',crossing:'#a73765',destination:'#6750a0',question:'#8b631a',plot:'#20282c'};
  var shell=document.getElementById('map').parentElement;
  var panel=document.createElement('section');panel.id='connections-panel';panel.hidden=true;panel.setAttribute('aria-label','Urban connections analysis');
  panel.innerHTML='<header><div><h2>Urban Connections</h2><small>Existing links · local study · 14 research tags</small></div><button id="cn-collapse" aria-label="Collapse connections panel" aria-expanded="true">−</button></header>'+
    '<div id="cn-body"><p class="cn-intro">Connected at one scale. Interrupted at another.</p><p class="cn-sub">Read the highway, local approaches and destinations separately. Click a tag for its evidence and meaning.</p>'+
    '<div class="cn-presets" role="group" aria-label="Analysis views"><button data-preset="all" aria-pressed="true">All connections</button><button data-preset="journey" aria-pressed="false">Plot approach</button><button data-preset="crossings" aria-pressed="false">Crossings</button></div>'+
    '<div class="cn-actions"><button id="cn-fit">Fit analysis</button><button id="cn-plot">Our plot</button></div>'+
    '<details id="cn-controls"><summary>Colours & layers</summary><div id="cn-filters"></div><p class="cn-small">Solid lines = mapped roads/crossings, not verified walking routes. Dashed shading = interpretative study windows. ≈ = approximate destination pin. ? = unresolved question. No traffic-volume or sun-shadow model.</p></details>'+
    '<div id="cn-detail" aria-live="polite"></div><div id="cn-list"></div>'+
    '<details id="cn-sources"><summary>Research & sources</summary><p class="cn-small">OSM geometry snapshot: September 2026. Some studies and photographs are historical. Click sources for dates and scope.</p><div id="cn-source-list"></div><a href="connections-research.html" target="_blank" rel="noopener">Read the full connections study ↗</a></details>'+
    '<p class="cn-small cn-limit">Detailed base: approximately 1.2 km. Actual sea frontage is outside this extract. No completed waterfront route is claimed.</p></div>';
  shell.appendChild(panel);L.DomEvent.disableClickPropagation(panel);L.DomEvent.disableScrollPropagation(panel);
  var key=document.createElement('div');key.id='connections-key';key.hidden=true;
    key.innerHTML='<b>CONNECTIONS / 01</b><span><i style="background:#a65035"></i>Regional road</span><span><i style="background:#14776e"></i>Local network</span><span><i style="background:#a73765"></i>Mapped crossing</span><span><i style="background:#6750a0"></i>Destination ≈</span><small>Shaded areas are study windows—not land-use boundaries. Short tag pointers are label leaders, not routes.</small>';shell.appendChild(key);L.DomEvent.disableClickPropagation(key);
  var banner=document.createElement('div');banner.id='connections-caption';banner.hidden=true;banner.innerHTML='THE COASTAL-SIDE ROAD IS NOT THE SHORELINE · sea lies beyond the detailed base<br><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · interpretative study overlay';shell.appendChild(banner);L.DomEvent.disableClickPropagation(banner);
  function el(id){return document.getElementById(id);}
  function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function links(ids){return ids.map(function(id){var s=D.sources[id];return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a>';}).join(' · ');}
  function category(w){if(['footway','steps','pedestrian'].includes(w.tags.highway))return 'crossing';return /^(motorway|trunk)/.test(w.tags.highway)?'regional':'local';}
  function pad(){return window.innerWidth<700?{paddingTopLeft:[35,50],paddingBottomRight:[25,panel.offsetHeight+15]}:{paddingTopLeft:[65,65],paddingBottomRight:[panel.offsetWidth+38,85]};}
  function fit(){var bounds=preset==='journey'?[[33.8945,35.5398],[33.8983,35.5429]]:D.bounds;api.map.invalidateSize();api.map.fitBounds(bounds,Object.assign({animate:false},pad()));}
  function allowed(t){if(!shown[t.kind]&&t.kind!=='plot')return false;if(preset==='journey')return ['P','C1','L1','L2','D1','Q2'].includes(t.id);if(preset==='crossings')return ['P','C1','C2','C3','Q2'].includes(t.id);return true;}
  function buildBase(){
    if(ready)return;
    B.base.forEach(function(f){
      if(f.building)return;
      var water=f.color==='#2469b9';
      if(f.polygon)L.polygon(f.polygon,{stroke:false,fillColor:water?'#d0dfe4':'#e1e4e2',fillOpacity:1,interactive:false,renderer:canvas}).addTo(base);
      else L.polyline(f.line,{color:'#c6cecf',weight:.55,opacity:.65,interactive:false,renderer:canvas}).addTo(base);
    });
    B.buildings.forEach(function(b){L.polygon(b.rings,{color:'#7e8c91',weight:.65,fill:false,opacity:.7,interactive:false,renderer:canvas}).addTo(base);});
    ready=true;
  }
  function draw(){
    if(!active)return;buildBase();api.group.clearLayers();zones.clearLayers();roads.clearLayers();tags.clearLayers();focus.clearLayers();markers={};
    if(shown.zones&&preset==='all'){
      D.zones.forEach(function(z){L.polygon(z.ring,{color:z.color,weight:1,dashArray:'5 7',fillColor:z.color,fillOpacity:.11,renderer:canvas}).bindPopup('<b>'+esc(z.title)+'</b><p>'+esc(z.note)+'</p>',{maxWidth:270}).addTo(zones);});
      zones.addTo(api.group);
    }
    base.addTo(api.group);
    var journeyWays=[306996681,715531021,275315121,701135687,701135688,270786366];
    D.ways.forEach(function(w){var cat=category(w);if(!shown[cat])return;
      var emph=preset==='all'||preset==='journey'&&journeyWays.includes(w.id)||preset==='crossings'&&(cat==='crossing'||[452148075,452148076].includes(w.id));
      var weight=cat==='regional'?2.9:cat==='crossing'?3.1:1.15;
      L.polyline(w.lines,{color:colors[cat],weight:emph?weight:.75,opacity:emph?(cat==='local'?.65:.87):.17,renderer:canvas,bubblingMouseEvents:false}).on('click',function(){
        el('cn-detail').innerHTML='<h3>'+esc(w.name)+'</h3><p class="cn-status">OSM '+esc(w.tags.highway)+(w.tags.bridge?' · bridge='+esc(w.tags.bridge):'')+'</p><p>Source centreline, not a surveyed sidewalk. A visual road intersection does not prove pedestrian continuity.</p><a href="https://www.openstreetmap.org/way/'+w.id+'" target="_blank" rel="noopener">OSM way '+w.id+' ↗</a>';
        panel.classList.remove('cn-collapsed');el('cn-body').hidden=false;scrollDetail();
      }).addTo(roads);
    });roads.addTo(api.group);
    L.polygon(B.site,{color:colors.plot,weight:2.5,fillColor:'#fff8c7',fillOpacity:.9,renderer:canvas}).on('click',function(){open('P');}).addTo(tags);
    el('cn-list').innerHTML='';
    D.tags.filter(allowed).forEach(function(t){var col=colors[t.kind];
      var approx=['D1','D2'].includes(t.id)?'≈':t.kind==='question'?'?':'';
      var icon=L.divIcon({className:'cn-pin',html:'<button style="--cn-color:'+col+'" aria-label="'+esc(t.id+' '+t.title)+'">'+esc(t.id+approx)+'</button>',iconSize:[38,26],iconAnchor:[19,13]});
      markers[t.id]=L.marker(t.at,{icon:icon,zIndexOffset:t.id==='P'?4000:3000,bubblingMouseEvents:false,keyboard:true,title:t.title}).on('click',function(){open(t.id);}).addTo(tags);
      var btn=document.createElement('button');btn.className='cn-item';btn.dataset.tag=t.id;btn.innerHTML='<span style="color:'+col+'">'+esc(t.id+approx)+'</span><div>'+esc(t.title)+'<small>'+esc(t.status)+'</small></div>';btn.onclick=function(){open(t.id);};el('cn-list').appendChild(btn);
    });
    tags.addTo(api.group);focus.addTo(api.group);
    // Text labels identify interpretative windows without painting buildings as known uses.
    if(preset==='all'&&shown.zones){[
      [[33.9002,35.5432],'COASTAL-SIDE WORK + BUSINESS'],[[33.89745,35.5396],'MIXED FRONTAGES'],[[33.8929,35.5424],'LIVING + SHOPS + WORKSHOPS']
    ].forEach(function(p){L.marker(p[0],{interactive:false,keyboard:false,icon:L.divIcon({className:'cn-area-label',html:esc(p[1]),iconSize:[230,30],iconAnchor:[115,15]})}).addTo(tags);});}
    if(selected&&D.tags.some(t=>t.id===selected&&allowed(t)))highlight(selected);
    declutter();
  }
  var leaders=L.layerGroup();
  function declutter(){
    if(!active)return;leaders.clearLayers();if(!api.group.hasLayer(leaders))leaders.addTo(api.group);
    var placed=[];
    D.tags.filter(allowed).forEach(function(t){var marker=markers[t.id];if(!marker)return;var origin=api.map.latLngToContainerPoint(t.at),pos=origin;
      var offsets=[[0,0],[46,-22],[-46,-22],[46,22],[-46,22],[0,37],[0,-37],[80,0],[-80,0]];
      for(var i=0;i<offsets.length;i++){var p=origin.add(offsets[i]);if(!placed.some(q=>Math.abs(q.x-p.x)<44&&Math.abs(q.y-p.y)<31)){pos=p;break;}}
      placed.push(pos);var at=api.map.containerPointToLatLng(pos);marker.setLatLng(at);
      if(pos.distanceTo(origin)>1){L.polyline([t.at,at],{color:colors[t.kind],weight:1,opacity:.7,interactive:false,renderer:canvas}).addTo(leaders);L.circleMarker(t.at,{radius:2,color:colors[t.kind],weight:1,fillOpacity:1,interactive:false,renderer:canvas}).addTo(leaders);}
    });
  }
  function scrollDetail(){panel.scrollTop=Math.max(0,el('cn-detail').offsetTop-panel.querySelector('header').offsetHeight-12);}
  function highlight(id){focus.clearLayers();var t=D.tags.find(t=>t.id===id);if(!t)return;
    L.circleMarker(t.at,{radius:21,color:colors[t.kind],fill:false,weight:2,interactive:false,renderer:canvas}).addTo(focus);
    (t.ways||[]).forEach(function(id){var w=D.ways.find(w=>w.id===id);if(w)L.polyline(w.lines,{color:colors[t.kind],weight:5,opacity:1,interactive:false,renderer:canvas}).addTo(focus);});
    el('cn-list').querySelectorAll('[data-tag]').forEach(function(e){e.classList.toggle('selected',e.dataset.tag===id);});
  }
  function open(id){var t=D.tags.find(t=>t.id===id);if(!t)return;selected=id;highlight(id);el('cn-detail').innerHTML='<button id="cn-close-detail">← All analysis tags</button><h3>'+esc(t.id+' · '+t.title)+'</h3><p class="cn-status">'+esc(t.status)+'</p><p>'+esc(t.text)+'</p><h4>What to check / design implication</h4><p>'+esc(t.check)+'</p><p class="cn-cites">'+links(t.sources)+'</p>';
    el('cn-close-detail').onclick=function(){selected=null;focus.clearLayers();el('cn-detail').innerHTML='';highlight(null);};
    el('cn-body').hidden=false;el('cn-collapse').textContent='−';el('cn-collapse').setAttribute('aria-expanded','true');scrollDetail();
  }
  [['regional','Regional roads'],['local','Local streets'],['crossing','Mapped crossings / stairs'],['destination','Destination tags'],['question','Unresolved connections'],['zones','Study-area shading']].forEach(function(v){
    var label=document.createElement('label');label.innerHTML='<input type="checkbox" data-layer="'+v[0]+'" checked><i style="background:'+(colors[v[0]]||'#baaa93')+'"></i>'+v[1];label.querySelector('input').onchange=function(){shown[v[0]]=this.checked;if(selected&&!allowed(D.tags.find(t=>t.id===selected))){selected=null;el('cn-detail').innerHTML='';}draw();};el('cn-filters').appendChild(label);
  });
  Object.keys(D.sources).forEach(function(id){var s=D.sources[id],p=document.createElement('p');p.innerHTML='<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+'</a><small>'+esc(s.publisher+' · '+s.date)+'</small><small>'+esc(s.note)+'</small>';el('cn-source-list').appendChild(p);});
  panel.querySelectorAll('[data-preset]').forEach(function(btn){btn.onclick=function(){preset=btn.dataset.preset;selected=null;el('cn-detail').innerHTML='';panel.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));draw();fit();};});
  el('cn-fit').onclick=fit;el('cn-plot').onclick=function(){api.map.fitBounds(L.latLngBounds(B.site).pad(1.8),Object.assign({animate:false,maxZoom:19},pad()));open('P');};
  el('cn-collapse').onclick=function(){var body=el('cn-body');body.hidden=!body.hidden;this.textContent=body.hidden?'+':'−';this.setAttribute('aria-expanded',String(!body.hidden));};
  api.map.on('zoomend moveend',declutter);
  return {draw:draw,fit:fit,open:open,show:function(on){active=on;panel.hidden=!on;key.hidden=!on;banner.hidden=!on;document.body.classList.toggle('connections-on',on);if(on){api.map.invalidateSize();draw();}},stats:function(){return {active:active,preset:preset,tags:Object.keys(markers),ways:D.ways.length,selected:selected};}};
};
