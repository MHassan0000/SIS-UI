(() => {
  const listeners = new Set();
  let state = { enabled: true, theme: 'light', compact: false };
  globalThis.chrome ??= {};
  chrome.storage = {
    local: {
      get: async key => ({ [key]: state }),
      set: async value => {
        const next = value['sisStudio.ui.v1'];
        const oldValue = state;
        state = next;
        for (const callback of listeners) callback({ 'sisStudio.ui.v1': { oldValue, newValue: next } }, 'local');
      },
    },
    onChanged: { addListener: callback => listeners.add(callback), removeListener: callback => listeners.delete(callback) },
  };
  // Keep original node references and event handlers to test restoration, not a cloned page.
  const content = document.querySelector('.content_area');
  const originalHTML = content.innerHTML;
  const rows = [...document.querySelectorAll('.is-course-row')];
  let clicks = 0, submits = 0;
  rows[0].addEventListener('click', () => clicks++);
  document.querySelector('#test-form').addEventListener('submit', event => { event.preventDefault(); submits++; });
  globalThis.studioTest = { content, originalHTML, rows, clicks: () => clicks, submits: () => submits };
})();
