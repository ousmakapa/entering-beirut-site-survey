/* Read-only wind-direction study. Authored ribbons are not CFD streamlines.
   Uses the same corrected building geometry as the Sun axon and field maps. */
window.WindDiagram=(()=>{
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 let host,svg,drawing,model,state={scale:1,x:0,y:0},drag;
 const el=(n,a={},text)=>{const e=document.createElementNS(NS,n);for(const[k,v]of Object.entries(a))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
 const path=(p,close=false)=>p.map((v,i)=>(i?'L':'M')+v.map(n=>n.toFixed(3)).join(',')).join(' ')+(close?' Z':'');
 function build(){
  const {solar,view,...base}=SunAxon.build();
  const cases=[['WSW',257,'#348ca0'],['SW',225,'#397e81'],['NNW',337,'#678bad']].map(([name,from,color])=>{
   const a=from*Math.PI/180,d=[Math.sin(a),Math.cos(a)],start=d.map((v,i)=>base.center[i]+v*150),end=d.map((v,i)=>base.center[i]+v*41);
   return{name,fromDegrees:from,color,start,end,meaning:'Separate direction-to-test; not frequency, speed, season or computed local flow'};
  });
  return{...base,version:'2026-09-16-wind-diagram-1',scope:'Existing corrected building plan with illustrative wind-direction cases. No sun, landscaping, proposed mass, CFD or measured wind rose.',cases};
 }
 function draw(m){
  const s=el('svg',{xmlns:NS,viewBox:'-177 -180 354 364',role:'img','aria-label':'Wind direction study on our actual plot and building plan','data-wind-diagram':'drawing'});
  s.appendChild(el('title',{},'Let air in. Keep the arrival sheltered.'));
  s.appendChild(el('desc',{},m.scope));
  s.appendChild(el('style',{},'text{font-family:Arial,sans-serif;paint-order:stroke;stroke:#faf9f5;stroke-width:1.1;stroke-linejoin:round}path,text,circle{pointer-events:none}'));
  const defs=el('defs');s.appendChild(defs);const clip=el('clipPath',{id:'wd-crop'});clip.appendChild(el('rect',{x:-166,y:-164,width:332,height:327}));defs.appendChild(clip);
  const g=el('g',{'data-wind-drawing':'fixed'});s.appendChild(g);
  const p=q=>[q[0]-m.center[0],-(q[1]-m.center[1])];
  const line=(parent,points,color,width=.5,dash)=>{const n=el('path',{d:path(points),fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round'});if(dash)n.setAttribute('stroke-dasharray',dash);parent.appendChild(n);return n;};
  const txt=(x,y,text,size=4.2,color='#405652',attrs={})=>g.appendChild(el('text',{x,y,fill:color,'font-size':size*1.3,...attrs},text));
  const base=el('g',{'clip-path':'url(#wd-crop)','data-layer':'context'});g.appendChild(base);
  for(const r of m.roads){const h=/^(motorway|trunk)/.test(r.type),street=r.id===275315121,bridge=[701135687,701135688,270786366].includes(r.id);line(base,r.points.map(p),h?'#dad7cf':street?'#92aaa2':bridge?'#a8798a':'#e0e0d7',h?5:street?2:bridge?1.6:.7,bridge?'2 1':null);}
  for(const b of m.buildings)base.appendChild(el('path',{d:b.rings.map(r=>path(r.map(p),true)).join(' '),'fill-rule':'evenodd',fill:'#e5e3dc',stroke:'#b8bcb4','stroke-width':.45,'data-building':b.id}));
  base.appendChild(el('path',{d:path(m.site.map(p),true),fill:'#e7d9a1',stroke:'#59674f','stroke-width':1.2,'data-layer':'site'}));
  // Ribbons stop before the plot: they encode incoming direction, not a route through buildings.
  const ribbons=el('g',{'data-layer':'wind-cases'});g.appendChild(ribbons);
  for(const c of m.cases){const a=p(c.start),b=p(c.end),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),u=[dx/len,dy/len],v=[-u[1],u[0]],left=[],right=[];
   const local=(distance,offset)=>[a[0]+u[0]*distance+v[0]*offset,a[1]+u[1]*distance+v[1]*offset];
   for(let i=0;i<=24;i++){const t=i/24,curve=Math.sin(t*Math.PI)*3,width=6-2*t;left.push(local(t*(len-12),curve+width));right.push(local(t*(len-12),curve-width));}
   const outline=[...left,local(len-12,10),b,local(len-12,-10),...right.reverse()];
   ribbons.appendChild(el('path',{d:path(outline,true),fill:c.color,'fill-opacity':.23,stroke:c.color,'stroke-width':.55,'data-case':c.name,'data-from':c.fromDegrees}));
   line(ribbons,[a,local(len-14,0)],c.color,.7);
  }
  txt(-146,47,'FROM WSW',5.5,'#348ca0',{'font-weight':'bold'});txt(-146,54,'West-side approach · test case',3.5);
  txt(-132,122,'FROM SW',5.5,'#397e81',{'font-weight':'bold'});txt(-132,129,'Highway-side approach · test case',3.5);
  txt(-42,-151,'FROM NNW',5.5,'#678bad',{'font-weight':'bold'});txt(-42,-144,'Northern approach · test case',3.5);
  txt(0,-2,'OUR PLOT',5,'#566046',{'text-anchor':'middle','font-weight':'bold'});txt(0,5,'unbuilt',3.4,'#68715e',{'text-anchor':'middle'});
  const call=(anchor,to,title,detail,color='#50695e')=>{line(g,[anchor,to],color,.45);txt(to[0]+2,to[1]-2,title,4.5,color,{'font-weight':'bold'});txt(to[0]+2,to[1]+4,detail,3.5);};
  call([-8,-34],[25,-86],'NORTHERN NEIGHBOURS','Check wind at street and roof levels');
  call([16,0],[53,-21],'STREET 80 / ARRIVAL','Test a recessed, sheltered threshold');
  call([-12,32],[36,71],'HIGHWAY EDGE','Moving air is not necessarily clean air','#8f6f58');
  call([3,41],[45,96],'FOOTBRIDGE','Mapped plan trace; levels TBD','#997587');
  const bank=m.buildings.find(b=>b.recordIds.includes('wmttqjojmmgt'));if(bank){const q=p(bank.at);txt(q[0],q[1]+2,'Credit Libanais',3.3,'#7a8278',{'text-anchor':'middle'});}
  line(g,[[147,-117],[147,-142]],'#405f58',.7);line(g,[[144,-136],[147,-142],[150,-136]],'#405f58',.7);txt(147,-146,'N',5,'#405f58',{'text-anchor':'middle'});
  txt(-158,160,'ONE DRAWING / THREE SEPARATE DIRECTION TESTS',4,'#526a66',{'font-weight':'bold'});
  txt(-158,168,'Ribbon width is graphic only. Calm conditions also need a ventilation strategy.',3.4);
  txt(-158,176,'No measured speed, wind frequency, shelter zone or pollutant plume.',3.4);
  return s;
 }
 function transform(){drawing?.setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.scale})`);}
 function fit(){state={scale:1,x:0,y:0};transform();}
 function zoom(f,at=[0,0]){const next=Math.min(5,Math.max(.55,state.scale*f)),r=next/state.scale;state.x=at[0]-(at[0]-state.x)*r;state.y=at[1]-(at[1]-state.y)*r;state.scale=next;transform();}
 function save(name,content,type){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000);}
 function exportSVG(){const clone=svg.cloneNode(true);clone.querySelector('[data-wind-drawing]').removeAttribute('transform');return new XMLSerializer().serializeToString(clone);}
 function show(on){document.body.classList.toggle('winddiagram-on',on);document.getElementById('workspace').classList.toggle('winddiagram-mode',on);if(!on){if(host)host.hidden=true;return;}
  if(!host){host=document.createElement('section');host.id='wind-diagram-view';host.className='sunaxon-view winddiagram-view';document.querySelector('.map-shell').appendChild(host);}
  model=build();host.hidden=false;
  host.innerHTML='<div class="sa-sheet"><header><span>SITE STUDY / WIND & THRESHOLD</span><h1>Let air in. Shelter the arrival.</h1><p>Wind directions to test against our actual building plan.</p></header><div class="sa-canvas"></div><div class="sa-toolbar"><button data-wd="in" aria-label="Zoom in">+</button><button data-wd="out" aria-label="Zoom out">−</button><button data-wd="fit">Fit drawing</button><span>Scroll to zoom · drag to pan</span></div><footer><span>Blue ribbons · incoming direction cases</span><span>Grey · existing building outlines</span><span>Ochre · our unbuilt plot</span></footer></div><aside class="sa-story"><span class="sa-kicker">WIND / SITE DIAGRAM</span><h2>Open to air does not mean exposed everywhere.</h2><p>Our plot sits north of the highway, with Street 80 beside its eastern edge and neighbouring buildings to the north and west. A southwest wind approaches across the highway-side context; a west-southwest wind approaches the western neighbours. A north-northwest case tests the opposite, northern approach.</p><p>The blue ribbons show those directions, not the route air will actually take between buildings. Their effect at the entrance may differ from their effect above the roofs. On Street 80, I would test a recessed entrance with a sheltered waiting place, while keeping a separate opportunity for ventilation inside the project.</p><p>The highway-side case also matters for incoming traffic emissions: a breeze cannot automatically be called clean air. I would compare openings at different edges and heights, and test calm conditions too, before fixing the ventilation strategy.</p><div class="sa-caution"><b>Directions to test—not a wind forecast</b><p>These are the SW, WSW and NNW cases in our Protection research, not measured seasonal prevailing winds. The ribbons are separate alternatives shown together; they do not occur simultaneously. Their width, curvature and length do not represent speed, frequency or calculated airflow.</p><p>No sun arc, new trees, proposed building, measured shelter zone or CFD result has been added. A site wind rose, actual building heights and occupied-level observations remain TBD.</p></div><details><summary>Evidence & drawing method</summary><p>The grey outlines are the same effective Pictures Auto / BuildingMap geometry, not the reference image’s buildings. Approximate footprints stay approximate. Roads and footbridge are plan traces; bridge heights are unknown.</p><p>Wind is named for the direction it comes FROM. The arrowheads point towards our plot. Direction tests are 225° SW, 257° WSW and 337° NNW, clockwise from north.</p><p><a href="https://forecast.weather.gov/glossary.php?word=WIND+DIRECTION" target="_blank" rel="noopener">National Weather Service: wind direction</a> · <a href="https://power.larc.nasa.gov/docs/faqs/data/" target="_blank" rel="noopener">NASA POWER: limits of gridded weather data</a></p><p>Student-supplied visual reference: download (1).jpg, preserved unchanged in the project sources. Original author/URL TBD. We borrow its translucent wind ribbons, not its site facts.</p></details><div class="sa-exports"><button data-wd="svg">Vector drawing · SVG</button><button data-wd="json">Geometry & evidence · JSON</button></div><p class="sa-small">The original Wind plan and both Sun sections remain separate. Drawing labels are fixed and not clickable. This section never writes survey data.</p></aside>';
  svg=draw(model);drawing=svg.querySelector('[data-wind-drawing]');host.querySelector('.sa-canvas').appendChild(svg);fit();
  host.querySelectorAll('[data-wd]').forEach(b=>b.onclick=()=>{const k=b.dataset.wd;if(k==='in')zoom(1.2);if(k==='out')zoom(1/1.2);if(k==='fit')fit();if(k==='svg')save('studio7-wind-diagram.svg',exportSVG(),'image/svg+xml');if(k==='json')save('studio7-wind-geometry.json',JSON.stringify(model,null,2),'application/json');});
  const loc=e=>{const q=svg.createSVGPoint();q.x=e.clientX;q.y=e.clientY;const p=q.matrixTransform(svg.getScreenCTM().inverse());return[p.x,p.y];};
  svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),loc(e));},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={p:loc(e),x:state.x,y:state.y,id:e.pointerId};svg.setPointerCapture(e.pointerId);});
  svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=loc(e);state.x=drag.x+p[0]-drag.p[0];state.y=drag.y+p[1]-drag.p[1];transform();});
  svg.addEventListener('pointerup',()=>drag=null);svg.addEventListener('pointercancel',()=>drag=null);
 }
 return{show,fit,build,draw,get model(){return model;}};
})();
