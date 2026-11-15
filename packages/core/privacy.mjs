import {seal, safeUrl} from './util.mjs';

export const DATA_INVENTORY = [
  {field: 'OS, architecture, CPU model/count, RAM total/free', storedIn: 'report files you choose to write', retention: 'until you delete the file', shared: 'never automatically'},
  {field: 'GPU name, VRAM, driver (only if nvidia-smi is present)', storedIn: 'report files you choose to write', retention: 'until you delete the file', shared: 'never automatically'},
  {field: 'Free disk space of the working-directory volume', storedIn: 'report files you choose to write', retention: 'until you delete the file', shared: 'never automatically'},
  {field: 'Model ids from your catalog or a local Ollama /api/tags listing', storedIn: 'report files you choose to write', retention: 'until you delete the file', shared: 'never automatically'},
  {field: 'Prompt hash (SHA-256) for opt-in inference', storedIn: 'inference report', retention: 'until you delete the file', shared: 'never automatically'},
  {field: 'Prompt and response text', storedIn: 'not stored', retention: 'none', shared: 'never'}
];

export function privacyAudit({endpoint} = {}) {
  let allowed = true, reason = 'No endpoint selected. No network request performed.';
  if (endpoint) {
    try { safeUrl(endpoint); reason = 'Only an explicit loopback endpoint is permitted; no network request was performed by this audit.'; }
    catch (e) { allowed = false; reason = e.message; }
  }
  return seal({
    schema: 'localsutra.privacy.v1', endpointAllowed: allowed, reason,
    claims: {coreHasNoMandatoryCloudApiKey: true, remoteEndpointBlockedByValidation: allowed, modelRuntimeEgress: 'not_tested', modelRuntimeTelemetry: 'not_tested'},
    dataInventory: DATA_INVENTORY,
    notes: [
      'External runtimes may use their own network features',
      'For air-gap claims, use external network monitoring and disconnect tests',
      'This audit does not establish compliance or end-to-end encryption',
      'Hardware profile, model list and file names can be sensitive: review reports before sharing'
    ]
  });
}
