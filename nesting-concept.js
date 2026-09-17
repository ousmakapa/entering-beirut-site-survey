/* Read-only conceptual drawing; no source/survey mutation. */
window.NestingConcept=(()=>{
  let host;
  function show(on){
    document.getElementById('workspace').classList.toggle('nestingconcept-mode',on);
    if(!on){if(host)host.hidden=true;return;}
    if(!host){
      host=document.createElement('section');host.id='nesting-concept-view';host.className='nestingconcept-view';
      const frame=document.createElement('iframe');frame.title='Nesting concept — first potential';
      frame.src='nesting-concept/index.html?review=nesting-concept1';host.appendChild(frame);
      document.querySelector('.map-shell').appendChild(host);
    }
    host.hidden=false;
  }
  return{show};
})();
