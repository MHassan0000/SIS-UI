(() => {
  'use strict';
  const app = globalThis.__sisStudioUI;
  app.createControls = (initial, onChange) => {
    const host = document.createElement('aside');
    host.id = 'sis-studio-controls';
    host.dataset.sisStudioOwned = 'controls';
    const shadow = host.attachShadow({ mode: 'open' });
    // Static UI only. Portal text is never interpolated into HTML.
    shadow.innerHTML = `
      <style>
        :host{all:initial;position:fixed;right:20px;bottom:18px;z-index:2147483000;font:13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#23262e;color-scheme:light;--bg:#fff;--ink:#23262e;--muted:#606674;--border:#dfe3e9;--soft:#f5f6f8;--accent:#365bbb}
        :host([data-theme=dark]){color-scheme:dark;--bg:#161618;--ink:#ededf0;--muted:#aaaab4;--border:#36363c;--soft:#212124;--accent:#becdf9}
        *{box-sizing:border-box}button,select,input{font:inherit}button,select{cursor:pointer}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
        .launch{display:flex;align-items:center;gap:9px;padding:9px 13px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--ink);box-shadow:0 2px 8px #0001;font-weight:500}
        .launch svg{width:15px;height:15px;flex:none;color:var(--muted)}.launch:hover{background:var(--soft)}
        .panel{width:min(310px,calc(100vw - 32px));max-height:calc(100dvh - 86px);overflow:auto;margin-bottom:10px;background:var(--bg);color:var(--ink);border:1px solid var(--border);border-radius:10px;box-shadow:0 12px 40px #0003;padding:18px}.panel[hidden]{display:none}
        header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}h2{font-size:15px;margin:0;font-weight:650}.close{background:var(--soft);border:0;border-radius:5px;width:28px;height:28px;color:var(--ink);font-size:19px}
        .row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid var(--border)}label{cursor:pointer}input{accent-color:var(--accent);width:17px;height:17px}select{padding:7px 9px;border:1px solid var(--border);border-radius:6px;background:var(--soft);color:var(--ink)}
        p{color:var(--muted);font-size:12px;margin:12px 0 0}#feedback:empty{display:none}#feedback{color:var(--ink)}
        @media(max-width:600px){:host{right:12px;bottom:12px}}@media print{:host{display:none!important}}
      </style>
      <section class="panel" id="panel" hidden aria-labelledby="title">
        <header><h2 id="title">SIS Studio</h2><button class="close" type="button" aria-label="Close appearance settings">×</button></header>
        <label class="row" for="enabled"><span>Enhanced interface</span><input id="enabled" type="checkbox"></label>
        <label class="row" for="theme"><span>Appearance</span><select id="theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <label class="row" for="compact"><span>Compact tables</span><input id="compact" type="checkbox"></label>
        <p>Turn off the enhanced interface to restore the original SIS appearance instantly.</p>
        <p id="feedback" role="status"></p>
      </section>
      <button class="launch" type="button" aria-expanded="false" aria-controls="panel" aria-label="SIS Studio appearance settings"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 6h3m4 0h7M3 14h7m4 0h3"/><circle cx="8" cy="6" r="2"/><circle cx="12" cy="14" r="2"/></svg>SIS Studio</button>`;
    const $ = selector => shadow.querySelector(selector);
    let state = initial;
    const panel = $('#panel');
    const launch = $('.launch');
    function open(value) {
      panel.hidden = !value;
      launch.setAttribute('aria-expanded', String(value));
      if (value) $('#enabled').focus(); else launch.focus();
    }
    launch.addEventListener('click', () => open(panel.hidden));
    $('.close').addEventListener('click', () => open(false));
    shadow.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { event.stopPropagation(); open(false); } });
    shadow.addEventListener('change', () => {
      state = { enabled: $('#enabled').checked, theme: $('#theme').value, compact: $('#compact').checked };
      onChange(state);
    });
    document.body.append(host);
    return {
      host,
      update(value, resolvedTheme) {
        state = value;
        host.dataset.theme = resolvedTheme;
        $('#enabled').checked = value.enabled;
        $('#theme').value = value.theme;
        $('#compact').checked = value.compact;
        launch.title = value.enabled ? 'Appearance settings' : 'Appearance settings — enhanced interface is off';
      },
      feedback(message) { $('#feedback').textContent = message; },
      destroy() { host.remove(); },
    };
  };
})();
