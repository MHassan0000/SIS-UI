(() => {
  'use strict';
  const app = globalThis.__sisStudioUI;
  const key = 'sisStudio.ui.v1';
  const defaults = Object.freeze({ enabled: true, theme: 'system', compact: false, companion: true });
  function normalize(value) {
    return {
      enabled: typeof value?.enabled === 'boolean' ? value.enabled : defaults.enabled,
      theme: ['light', 'dark', 'system'].includes(value?.theme) ? value.theme : defaults.theme,
      compact: typeof value?.compact === 'boolean' ? value.compact : defaults.compact,
      companion: typeof value?.companion === 'boolean' ? value.companion : defaults.companion,
    };
  }
  app.preferences = {
    key, defaults, normalize,
    async read() {
      try { return normalize((await chrome.storage.local.get(key))[key]); }
      catch { return { ...defaults }; }
    },
    async save(value) { await chrome.storage.local.set({ [key]: normalize(value) }); },
    subscribe(callback) {
      const listener = (changes, area) => {
        if (area === 'local' && changes[key]) callback(normalize(changes[key].newValue));
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    },
  };
})();
