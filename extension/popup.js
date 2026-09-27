const consent = document.querySelector('#consent');
const button = document.querySelector('#toggle');
let active = false;
async function render() {
  const state = await chrome.storage.local.get(['enabled', 'status']);
  active = state.enabled === true;
  document.querySelector('#consent-row').hidden = active;
  button.textContent = active ? 'Disable automatic uploads' : 'Enable automatic uploads';
  button.disabled = !active && !consent.checked;
  document.querySelector('#status').textContent = state.status?.message || 'Uploads are disabled until you agree.';
}
consent.addEventListener('change', render);
button.addEventListener('click', async () => {
  button.disabled = true;
  try { await chrome.runtime.sendMessage({ type: 'set-enabled', enabled: !active }); }
  catch { document.querySelector('#status').textContent = 'Could not change settings. Reopen this window and try again.'; }
  await render();
});
chrome.storage.onChanged.addListener(render);
await render();
