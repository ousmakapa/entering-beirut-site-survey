/* Read-only presentation of the canonical design studies. No survey persistence. */
window.PlotLayers = (() => {
  'use strict';
  let host;
  function show(on) {
    document.getElementById('workspace').classList.toggle('plotlayers-mode', on);
    if (!on) { if (host) host.hidden = true; return; }
    if (!host) {
      host = document.createElement('section');
      host.id = 'plot-layers-view';
      host.className = 'plotlayers-view';
      host.setAttribute('aria-label', 'Layers: from city analysis to plot studies');
      const frame = document.createElement('iframe');
      frame.title = 'Layers — common rule, three plan and section options, research and limits';
      frame.src = 'layers-study/index.html?review=layers-section1';
      host.appendChild(frame);
      document.querySelector('.map-shell').appendChild(host);
    }
    host.hidden = false;
  }
  return { show };
})();
