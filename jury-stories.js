/* Presentation adapter. Moves existing DOM nodes (and their listeners), never survey data. */
window.JuryStories = (() => {
  'use strict';
  const D = window.JURY_STORIES;
  const prefixes = {connections:'cn', people:'ppl', daily:'dr', accessibility:'ax', protection:'pr'};
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function story(parts, className='jury-overview') {
    const el = document.createElement('section'); el.className = className;
    el.innerHTML = '<h3>'+escape(parts[0])+'</h3>'+parts.slice(1).map(p=>'<p>'+escape(p)+'</p>').join('');
    return el;
  }
  function fold(label, nodes, className='jury-more') {
    const el = document.createElement('details'); el.className = className;
    const summary = document.createElement('summary'); summary.textContent = label; el.append(summary);
    nodes.forEach(n=>el.append(n)); return el;
  }
  function mount(name, panel) {
    if (!panel || panel.dataset.juryMounted) return;
    panel.dataset.juryMounted = 'true'; panel.classList.add('jury-panel');
    const pre=prefixes[name], body=panel.querySelector('#'+pre+'-body');
    if (!body) return;
    // The map remains interactive; the alternative list is available on demand.
    const list=body.querySelector('#'+pre+'-list');
    if (list) { const holder=fold('Explore the map tags',[],'jury-tag-list'); list.before(holder); holder.append(list); }
    // Retain the full original explanation and source sections without a wall of text.
    const notes=Array.from(body.children).filter(n=>n.matches('p, details')&&!n.matches('.jury-tag-list'));
    notes.forEach(n=>{if(n.tagName==='DETAILS')n.open=false;});
    if(notes.length)body.append(fold('More detail & research',notes));
    if(name==='connections'||name==='people'){
      const host=document.createElement('div');host.id=pre+'-summary';body.prepend(host);
    }else{
      const host=body.querySelector('#'+pre+'-summary');if(host)body.prepend(host);
    }
    panel.querySelectorAll('[data-preset],[data-origin]').forEach(b=>b.addEventListener('click',()=>{panel.scrollTop=0;}));
    overview(name);
  }
  function overview(name, variant='all', sourceOnly=false) {
    const host=document.getElementById(prefixes[name]+'-summary'); if(!host)return;
    const parts=sourceOnly ? [name==='daily'?'What the evidence establishes':'Read the source map separately', name==='daily'?'Published district schedules can be compared below, but they do not measure activity on our streets. Local time-of-day scenarios are hidden in this view.':'This view keeps the mapped physical features visible and hides the authored analysis. A road, building or bridge outline tells us where something is; it does not prove comfort, accessibility or environmental performance.'] : D.views[name]?.[variant]||D.maps[name];
    const previous=host.querySelector(':scope > .jury-overview');
    // Static leads are already retained by mount. Dynamic original summaries are retained here.
    if(!previous&&host.childNodes.length){const nodes=Array.from(host.childNodes);host.append(fold('More detail on this view',nodes,'jury-view-detail'));}
    if(previous)previous.remove();host.prepend(story(parts));
  }
  function detail(name,id,container) {
    const text=D.tags[name]?.[id];if(!container||!text)return;
    const button=container.querySelector(':scope > button'),title=container.querySelector(':scope > h3');
    if(button)button.addEventListener('click',()=>{container.closest('.jury-panel').scrollTop=0;});
    const nodes=Array.from(container.childNodes).filter(n=>n!==button&&n!==title);
    container.append(fold('More detail & sources',nodes));
    const short=document.createElement('div');short.className='jury-tag-story';
    const p=document.createElement('p');p.textContent=text;short.append(p);
    if(title)title.after(short);else container.prepend(short);
    // A selected place is the story now; overview returns when the original back control clears it.
  }
  function legacy(key,panel,empty) {
    if(!panel||!D.maps[key]||prefixes[key]||key==='picturesnew'||key==='picturesauto')return;
    const prior=Array.from(panel.childNodes);
    const intro=story(empty?[D.maps[key][0],'This layer is currently switched off, so the drawing shows the survey base only. The interpretation is kept in More detail; it should not be presented as an active coloured analysis.']:D.maps[key]);
    const detail=fold('More detail, evidence & original calculations',prior);
    if(['access','sun','wind','noise'].includes(key)){
      const warning=document.createElement('p');warning.className='jury-legacy-note';
      warning.textContent='Earlier survey-model notes are preserved below. Their route, shade and exposure claims are not current measured findings. Read Accessibility and Protection for the later qualifications on the corrected context map.';
      detail.querySelector('summary').after(warning);
    }
    panel.prepend(intro);panel.append(detail);
  }
  function records(name,body) {
    if(!body||body.querySelector(':scope > .jury-record-intro'))return;
    body.prepend(fold('The story of this map',[story(D.maps[name])],'jury-record-intro'));
    // Record notes, photos, backup warnings, counts and editing controls are intentionally untouched.
  }
  return {mount,overview,detail,legacy,records};
})();
