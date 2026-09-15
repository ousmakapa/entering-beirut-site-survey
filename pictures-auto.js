/* Independent research overlay. Never calls savePlots, syncNow, editPlot or deleteMedia. */
window.createPicturesAuto = function(api){
  'use strict';
  var clone=function(v){return JSON.parse(JSON.stringify(v));};
  var A=window.PICTURES_AUTO_ADDITIONS,B=window.PICTURES_NEW_DATA;
  var records=clone(A.records),media=clone(A.media),changes={},key='studio7PicturesAutoGeometryV1';
  try{changes=JSON.parse(localStorage.getItem(key)||'{}');if(!changes||Array.isArray(changes))changes={};}catch(e){changes={};}
  window.PICTURES_AUTO_DATA=Object.assign({},B,{version:A.version,seeds:clone(B.seeds),layout:clone(A.layout||{}),manualReview:clone(A.manualReview||{visits:[],checks:[]})});
  var D=window.PICTURES_AUTO_DATA;
  A.additions.forEach(function(add){
    var r=records.find(function(r){return r.id===add.recordId;});if(!r)return;
    r.autoEvidence=clone(add);
    if(add.placement)D.seeds[r.id]=clone(add.placement);
    // All inherited facts remain intact; observations are a separate evidence block.
  });
  records.forEach(function(r){
    if(changes[r.id]){if(changes[r.id].value)r.newMap=clone(changes[r.id].value);else delete r.newMap;}
    else if(r.autoEvidence&&r.autoEvidence.placement)delete r.newMap;
  });
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function shots(id){return (A.additions.find(function(a){return a.recordId===id;})||{screenshots:[]}).screenshots.concat(media.filter(function(m){return m.plot===id;}));}
  function field(label,value){return '<dt>'+esc(label)+'</dt><dd>'+esc(value||'Not recorded')+'</dd>';}
  function card(r){
    var a=r.autoEvidence;
    var reviewed=window.AutoAttributes?AutoAttributes.resolve(r,shots(r.id)):r;
    var reading=window.AutoAttributes?AutoAttributes.rows(reviewed):'';
    return reading+(reading?'<details class="pa-collection-notes"><summary>Original collection notes · preserved</summary>':'')+(a?'<section class="pa-evidence"><h4>Auto evidence · '+esc(A.collectedOn)+'</h4><p>'+esc(a.summary)+'</p>'+(a.tagAnchor?'<p><b>Individual frontage tag · approximate.</b> '+esc(a.tagAnchor.basis)+'</p>':'')+(a.location?'<p><b>'+(a.location.type==='camera-reference'?'Photo camera location — source metadata only.':'F · frontage reference only.')+'</b> '+esc(a.location.basis)+'</p>':'')+'<dl>'+a.observations.map(function(o){return '<dt>'+esc(o.field)+'</dt><dd>'+esc(o.value)+'<br><small>'+esc(o.certainty)+' · '+esc(o.basis)+'</small></dd>';}).join('')+'</dl><p><b>Unresolved when collected:</b> '+esc(a.unresolved)+'</p></section>':'<p class="pa-banner">Copied record — no new Auto evidence collected yet.</p>')+(reading?'</details>':'')+
      (r.autoCreated?'<section class="pa-original"><h4>New Auto frontage observation</h4><p>No original survey card has been overwritten. This is not yet a certified separate building or parcel. Unrecorded fields remain TBD.</p></section>':'<section class="pa-original"><h4>Original survey · unchanged copy</h4><dl>'+field('Record',r.id)+field('Old plot',r.parcel)+field('Storeys',r.storeys)+field('Use',r.use)+field('Ground floor',r.ground)+field('Apparent construction',r.era?r.era+' · visual estimate / VERIFY':'Not estimated')+field('Construction basis',r.eraBasis)+field('Greenery',r.green)+field('Green coverage',r.gcover)+field('Green access',r.gaccess)+field('Visible additions',r.added==='y'?'Yes':r.added==='n'?'No':'Not assessed')+field('Columns for another floor',r.ready==='y'?'Yes':r.ready==='n'?'No':'Not assessed')+'</dl></section>');
  }
  function gallery(dom,ss){
    var box=document.getElementById(dom);box.innerHTML='';
    ss.forEach(function(m){
      var figure=document.createElement('figure');figure.className='pa-figure';
      var link=document.createElement('a');link.target='_blank';link.rel='noopener';
      var img=document.createElement('img');img.loading='lazy';img.alt=m.caption||'Original survey screenshot';link.appendChild(img);figure.appendChild(link);
      var cap=document.createElement('figcaption');cap.textContent=m.caption?m.caption+' · '+m.attribution+' · imagery '+(m.imageryDate||'date not displayed')+' · captured '+(m.capturedOn||A.collectedOn):'Original linked screenshot — preserved, not newly collected';figure.appendChild(cap);
      if(m.sourceUrl){var source=document.createElement('a');source.href=m.sourceUrl;source.target='_blank';source.rel='noopener';source.textContent='Open exact source view';cap.appendChild(document.createElement('br'));cap.appendChild(source);}
      if(m.file&&m.auto){img.src=m.file;link.href=m.file;}
      else api.getPhoto(m.id,function(src){if(!figure.isConnected)return;if(!src&&m.file)src=m.file;if(!src){cap.appendChild(document.createTextNode(' · original image unavailable on this device'));return;}var url=typeof src==='string'?src:URL.createObjectURL(src);img.src=url;link.href=url;img.onerror=function(){cap.appendChild(document.createTextNode(' · original image could not load'));};});
      box.appendChild(figure);
    });
  }
  var view=window.createPicturesAutoView({map:api.map,group:api.group,canvas:api.canvas,faces:api.faces,
    records:function(){return records;},record:function(id){return records.find(function(r){return r.id===id;});},shots:shots,card:card,gallery:gallery,
    saveAssignments:function(updates){
      var next=clone(changes);
      try{
        updates.forEach(function(u){if(!records.some(function(r){return r.id===u.id;}))throw Error('Unknown Auto record');
          if(u.value){if(!Array.isArray(u.value.parts)||(!u.value.parts.length&&u.value.kind!=='unassigned'))throw Error('Invalid Auto shape');
            u.value.parts.forEach(function(p){if(!p.length)throw Error('Invalid polygon');p.forEach(function(ring){if(ring.length<4)throw Error('Invalid ring');ring.forEach(function(p){if(p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>90||Math.abs(p[1])>180)throw Error('Invalid coordinates');});});});}
          next[u.id]={value:u.value?clone(u.value):null,editedAt:new Date().toISOString()};});
        localStorage.setItem(key,JSON.stringify(next));changes=next;
        updates.forEach(function(u){var r=records.find(function(r){return r.id===u.id;});if(u.value)r.newMap=clone(u.value);else delete r.newMap;});return true;
      }catch(e){alert('Pictures Auto only: '+e.message);return false;}
    }
  });
  var tools=document.createElement('div');tools.className='pa-tools';
  var note=document.createElement('p');note.className='pa-banner';note.textContent='Independent copy · new observations do not overwrite your survey. Manual Auto shape edits stay on this device; export them for backup.';
  var body=document.getElementById('pa-body');body.prepend(note);body.prepend(tools);
  var exportButton=document.createElement('button');exportButton.textContent='Export Auto copy';exportButton.onclick=function(){
    var blob=new Blob([JSON.stringify({version:A.version,records:records,media:media,additions:A.additions,attributeReviews:window.AutoAttributes?AutoAttributes.exportData():null,layout:A.layout||{},manualReview:A.manualReview||{},aliases:A.aliases||[],retiredRecords:A.retiredRecords||[],geometryEdits:changes},null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pictures-auto-'+A.collectedOn+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},30000);
  };tools.appendChild(exportButton);
  var state=view.stats;view.stats=function(){return Object.assign(state(),{autoEvidence:A.additions.length,newScreenshots:A.additions.reduce(function(n,a){return n+a.screenshots.length;},0),baselineRecords:A.baselineCount||records.filter(function(r){return !r.autoCreated;}).length});};
  // Read-only bridge: analytical maps use the same displayed shapes, including local edits.
  // No analytical map is permitted to save assignments through this interface.
  view.readBuildings=function(){return records.map(function(r){return {record:clone(r),shape:clone(view.shape(r)),shots:clone(shots(r.id))};});};
  if(window.JuryStories)JuryStories.records('picturesauto',body);
  return view;
};
