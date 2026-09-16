/* One stable explanation per analysis map. Read-only presentation; never writes survey data. */
window.JuryStories=(()=>{
 'use strict';
 const D=window.JURY_STORIES,prefixes={connections:'cn',people:'ppl',daily:'dr',accessibility:'ax',protection:'pr'};
 const datasets=()=>({connections:window.CONNECTIONS_DATA,people:window.PEOPLE_DATA,daily:window.DAILY_DATA,accessibility:window.ACCESSIBILITY_DATA,protection:window.PROTECTION_DATA});
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function story(parts){const el=document.createElement('section');el.className='jury-overview';el.innerHTML='<h3>'+escape(parts[0])+'</h3>'+parts.slice(1).map(p=>'<p>'+escape(p)+'</p>').join('');return el;}
 function fold(label,nodes,className='jury-sources'){const e=document.createElement('details');e.className=className;e.innerHTML='<summary>'+escape(label)+'</summary>';nodes.forEach(n=>e.append(n));return e;}
 function sourceLinks(sources){const e=document.createElement('div');Object.values(sources||{}).forEach(s=>{const p=document.createElement('p'),a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener';a.textContent=s.title;p.append(a);e.append(p);});return e;}
 function archive(nodes){const e=document.createElement('div');e.className='jury-preserved';e.hidden=true;e.inert=true;nodes.forEach(n=>e.append(n));e.querySelectorAll('input,select,button').forEach(n=>n.disabled=true);return e;}
 function mount(name,panel){
  if(!panel||panel.dataset.juryMounted)return;panel.dataset.juryMounted='single';panel.classList.add('jury-panel');
  const combined={connections:'Connections & Streets',accessibility:'Arrival & Accessibility'};
  if(combined[name]){panel.querySelector('header h2').textContent=combined[name];const sub=panel.querySelector('header small');if(sub)sub.textContent=name==='connections'?'Street hierarchy, crossings and destinations':'From street and crossing to our entrance';}
  const pre=prefixes[name],body=panel.querySelector('#'+pre+'-body');if(!body)return;
  let host=body.querySelector('#'+pre+'-summary');if(!host){host=document.createElement('div');host.id=pre+'-summary';}
  const actions=body.querySelector('.'+pre+'-actions'),detail=body.querySelector('#'+pre+'-detail'),list=body.querySelector('#'+pre+'-list');
  [host,actions,detail,list].filter(Boolean).forEach(n=>n.remove());
  // Keep old controller targets inert for safe redraws; no competing view or explanation is exposed.
  const old=archive(Array.from(body.childNodes));body.replaceChildren(host);if(actions)body.append(actions);
  if(actions)actions.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{panel.scrollTop=0;}));
  if(detail)body.append(detail);if(list)body.append(fold('Locate the evidence tags',[list],'jury-tag-list'));
  body.append(fold('Evidence sources',[sourceLinks(datasets()[name]?.sources)]),old);
  overview(name);
 }
 function overview(name){
  const host=document.getElementById(prefixes[name]+'-summary');if(!host||!D.maps[name])return;
  host.replaceChildren(story(D.maps[name]));host.dataset.explanation=name;
 }
 function detail(name,id,container){
  if(window.ArchitecturalMap)ArchitecturalMap.select(name,id);
  const data=datasets()[name],t=data?.tags.find(t=>t.id===id);if(!t||!container)return;
  const button=container.querySelector(':scope > button');if(button){button.textContent='Close selected evidence';button.addEventListener('click',()=>{if(window.ArchitecturalMap)ArchitecturalMap.select(name,null);container.closest('.jury-panel').scrollTop=0;});}
  const box=document.createElement('section');box.className='jury-tag-evidence';
  box.innerHTML='<h4>'+escape(t.id+' · '+t.title)+'</h4><p>'+escape(t.fact||t.text||'Mapped research location; interpretation remains provisional.')+'</p>';
  const check=t.check||t.test;if(check){const d=document.createElement('p');d.className='jury-evidence-limit';d.textContent='Still to check: '+check;box.append(d);}
  const photos=Array.from(container.querySelectorAll('figure'));photos.forEach(p=>box.append(p));
  const links=document.createElement('p');links.className='jury-evidence-links';
  (t.sources||[]).forEach(id=>{const s=data.sources[id];if(!s)return;const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener';a.textContent=s.title;links.append(a,document.createTextNode(' · '));});
  (t.ways||[]).forEach(id=>{const a=document.createElement('a');a.href='https://www.openstreetmap.org/way/'+id;a.target='_blank';a.rel='noopener';a.textContent='Mapped way '+id;links.append(a,document.createTextNode(' · '));});
  box.append(links);container.replaceChildren(...[button,box].filter(Boolean));
  // The main plot story stays in place. A tag adds evidence, never substitutes another explanation.
 }
 function legacy(key,panel){
  if(!panel||!D.maps[key]||prefixes[key]||key==='picturesnew'||key==='picturesauto')return;
  const prior=Array.from(panel.childNodes),links=new Map();
  panel.querySelectorAll('a[href]').forEach(a=>{if(/^https?:/.test(a.href))links.set(a.href,{url:a.href,title:a.textContent});});
  panel.replaceChildren(story(D.maps[key]));if(links.size)panel.append(fold('Evidence sources',[sourceLinks(Object.fromEntries(links))]));
  panel.append(archive(prior));
 }
 function records(name,body){if(!body||body.querySelector(':scope > .jury-record-intro'))return;body.prepend(fold('How this evidence supports our plot',[story(D.maps[name])],'jury-record-intro'));}
 return{mount,overview,detail,legacy,records};
})();
