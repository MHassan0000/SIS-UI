(() => {
  'use strict';
  const app = globalThis.__sisStudioUI;
  if (!app || app.started || !app.adapter.authenticated()) return;
  app.started = true;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const features = app.createFeatures();
  let preferences, controls, observer, shellObserver, content, timer, unsubscribe, stopped = false;
  let revision = 0;
  const theme = () => preferences.theme === 'system' ? (media.matches ? 'dark' : 'light') : preferences.theme;
  const owned = node => (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest('[data-sis-studio-owned]');
  function watch() {
    content = document.querySelector(app.selectors.content);
    if (content) observer.observe(content, { childList: true, subtree: true, characterData: true });
  }
  function refresh() {
    if (stopped || !preferences.enabled) return;
    if (!app.adapter.authenticated()) { destroy(); return; }
    observer.disconnect();
    const search = document.querySelector('.studio-search');
    const query = search?.value || '';
    const focused = document.activeElement === search;
    features.clear();
    const root = document.querySelector(app.selectors.content);
    if (root) features.apply(root);
    const restored = root?.querySelector('.studio-search');
    if (restored && query) {
      restored.value = query;
      restored.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (restored && focused) restored.focus({ preventScroll: true });
    watch();
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(refresh, 140);
  }
  function apply(value) {
    preferences = app.preferences.normalize(value);
    observer.disconnect();
    clearTimeout(timer);
    if (!preferences.enabled) features.clear();
    document.body.classList.toggle('sis-studio-enabled', preferences.enabled);
    document.body.classList.toggle('sis-studio-compact', preferences.enabled && preferences.compact);
    if (preferences.enabled) document.body.dataset.sisStudioTheme = theme();
    else delete document.body.dataset.sisStudioTheme;
    controls.update(preferences, theme());
    if (preferences.enabled) refresh();
  }
  function systemChanged() {
    if (preferences.theme !== 'system') return;
    if (preferences.enabled) document.body.dataset.sisStudioTheme = theme();
    controls.update(preferences, theme());
  }
  function destroy() {
    stopped = true;
    clearTimeout(timer);
    observer?.disconnect();
    shellObserver?.disconnect();
    features.clear();
    controls?.destroy();
    unsubscribe?.();
    media.removeEventListener('change', systemChanged);
    window.removeEventListener('pagehide', onPageHide);
    document.body.classList.remove('sis-studio-enabled', 'sis-studio-compact');
    delete document.body.dataset.sisStudioTheme;
    app.started = false;
  }
  function onPageHide(event) { if (!event.persisted) destroy(); }
  async function start() {
    preferences = await app.preferences.read();
    if (!app.adapter.authenticated()) { app.started = false; return; }
    observer = new MutationObserver(records => {
      if (records.some(record => !owned(record.target))) schedule();
    });
    controls = app.createControls(preferences, async value => {
      const change = ++revision;
      apply(value);
      try {
        await app.preferences.save(value);
        if (change === revision) controls.feedback('Preferences saved.');
      } catch {
        if (change === revision) controls.feedback('Applied for this page. Reload the extension to save preferences.');
      }
    });
    unsubscribe = app.preferences.subscribe(apply);
    media.addEventListener('change', systemChanged);
    window.addEventListener('pagehide', onPageHide);
    // Observe only shell boundaries for content replacement, not the whole document subtree.
    shellObserver = new MutationObserver(() => {
      if (!app.adapter.authenticated()) { destroy(); return; }
      if (content !== document.querySelector(app.selectors.content)) {
        observeShell();
        if (preferences.enabled) schedule();
      }
    });
    function observeShell() {
      shellObserver.disconnect();
      const shell = document.querySelector(app.selectors.shell);
      if (shell) shellObserver.observe(shell, { childList: true });
      const parent = document.querySelector(app.selectors.content)?.parentElement;
      if (parent) shellObserver.observe(parent, { childList: true });
    }
    observeShell();
    apply(preferences);
    app.destroy = destroy;
  }
  start().catch(() => { destroy(); console.warn('[SIS Studio] Interface could not initialize; original portal preserved.'); });
})();
