import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assert, number, seal, cleanText} from './util.mjs';

// Finds an executable on PATH without running it. "On PATH" is not "installed and working".
export function findCommand(name, {env = process.env, platform = process.platform} = {}) {
  const dirs = (env.PATH || env.Path || '').split(path.delimiter).filter(Boolean);
  const ext = platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const d of dirs) for (const x of ext) {
    const f = path.join(d, name + x);
    try { if (fs.statSync(f).isFile()) { fs.accessSync(f, fs.constants.X_OK); return true; } } catch { /* keep searching */ }
  }
  return false;
}

// Fixed argv, no shell, short timeout, bounded output. Returns stdout text or null.
function runNvidiaSmi() {
  try {
    return execFileSync('nvidia-smi', ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits'], {timeout: 4000, encoding: 'utf8', windowsHide: true, maxBuffer: 65536, stdio: ['ignore', 'pipe', 'ignore']});
  } catch { return null; }
}

// Parses nvidia-smi CSV strictly. Anything unexpected yields "unknown", never a guessed GPU.
export function parseNvidiaSmi(text) {
  if (typeof text !== 'string' || !text.trim()) return {status: 'unknown', reason: 'nvidia-smi produced no output'};
  const devices = [];
  for (const line of text.trim().split(/\r?\n/).slice(0, 16)) {
    const parts = line.split(',').map(s => s.trim());
    const [name, mib, driver] = parts;
    if (parts.length !== 3 || !name || name.length > 120 || !/^[A-Za-z0-9 ._()+\/-]+$/.test(name) || !/^\d{2,7}$/.test(mib) || !/^[\d.]{1,16}$/.test(driver)) {
      return {status: 'unknown', reason: 'nvidia-smi output did not match the expected format'};
    }
    devices.push({name: cleanText(name), vramBytes: Number(mib) * 1024 * 1024, driver});
  }
  return {status: 'detected', source: 'nvidia-smi', devices, vramBytes: Math.max(...devices.map(d => d.vramBytes))};
}

function detectGpu({commands, exec, system}) {
  if (commands('nvidia-smi')) return parseNvidiaSmi(exec());
  const apple = system.platform?.() === 'darwin' && system.arch?.() === 'arm64';
  const hint = apple ? ' Apple Silicon uses unified memory; this adapter does not measure it.' : '';
  return {status: 'unknown', reason: 'No supported GPU probe found (only nvidia-smi is implemented).' + hint};
}

function diskInfo(disk) {
  try { return {status: 'measured', freeBytes: disk().freeBytes, scope: 'working directory volume'}; }
  catch { return {status: 'unknown', reason: 'Free disk space could not be read'}; }
}
const defaultDisk = () => { const s = fs.statfsSync(process.cwd()); return {freeBytes: Number(s.bavail) * Number(s.bsize)}; };

export function profileHost({system = os, commands = findCommand, exec = runNvidiaSmi, disk = defaultDisk} = {}) {
  const cpu = system.cpus?.() || [];
  const total = system.totalmem?.() || 0, free = system.freemem?.() || 0;
  const release = String(system.release?.() || '');
  const wsl = system.platform?.() === 'linux' && /microsoft|wsl/i.test(release);
  return seal({
    schema: 'localsutra.hardware.v1', source: 'node:os + optional nvidia-smi',
    profile: {
      os: system.platform(), architecture: system.arch(), wsl, cpuLogical: cpu.length, cpuModel: cleanText(cpu[0]?.model || 'unknown'),
      ramBytes: total, freeRamBytes: free, systemMemoryBytesEstimate: total - free,
      gpu: detectGpu({commands, exec, system}),
      npu: {status: 'unknown', reason: 'No portable NPU probe is implemented'},
      storage: diskInfo(disk),
      tools: {ollama: commands('ollama'), llamaServer: commands('llama-server'), nvidiaSmi: commands('nvidia-smi'), node: true}
    },
    limitations: [
      'Node reports host properties, not the capability of a different target device',
      'GPU detection covers NVIDIA via nvidia-smi only; AMD, Intel, Apple and NPUs are reported unknown, not absent',
      wsl ? 'Running under WSL: GPU, memory and disk figures may differ from the Windows host' : 'No virtualisation restriction detected',
      'A tool found on PATH is not proof it is installed correctly or can run a model',
      'No model has been executed by this command'
    ]
  });
}

export function fitModel(model, hardware, {headroom = 1.35} = {}) {
  assert(model && typeof model === 'object', 'Model descriptor required');
  const p = number(model.parametersB, 'parametersB', 0.001, 1000);
  const bits = number(model.bitsPerWeight, 'bitsPerWeight', 1, 32);
  const context = number(model.contextTokens ?? 4096, 'contextTokens', 128, 262144);
  number(headroom, 'headroom', 1, 4);
  const ram = number(hardware?.profile?.ramBytes, 'ramBytes', 1, 1e18);
  const free = number(hardware.profile.freeRamBytes, 'freeRamBytes', 0, ram);
  const weightsGB = p * 1e9 * bits / 8 / 1e9;
  const kvGB = model.kvBytesPerToken == null ? null : number(model.kvBytesPerToken, 'kvBytesPerToken', 0, 1e9) * context / 1e9;
  const overheadGB = number(model.extraOverheadGB ?? 1.0, 'extraOverheadGB', 0, 1024);
  const requiredGB = weightsGB * headroom + overheadGB + (kvGB ?? 0);
  const availableGB = free / 1e9;
  const gpu = hardware.profile.gpu ?? {status: 'unknown'};
  const vram = gpu.status === 'detected' && gpu.vramBytes
    ? {status: 'evaluated', vramGB: gpu.vramBytes / 1e9, category: gpu.vramBytes / 1e9 >= requiredGB ? 'possibly_fits_vram' : 'exceeds_single_gpu_vram', note: 'Single-GPU, fully offloaded estimate; partial offload and multi-GPU are not modelled'}
    : {status: 'not_evaluated', reason: `GPU status is ${gpu.status ?? 'unknown'}`};
  return seal({
    schema: 'localsutra.fit.v1',
    model: {id: cleanText(model.id || 'unspecified'), parametersB: p, bitsPerWeight: bits, contextTokens: context, license: model.license ? cleanText(model.license) : 'unknown', source: model.source ? cleanText(model.source, 200) : 'unspecified'},
    hardware: {os: hardware.profile.os, architecture: hardware.profile.architecture, freeRamGB: availableGB, gpuStatus: gpu.status ?? 'unknown'},
    estimate: {
      weightsGB, kvCacheGB: kvGB, overheadGB, multiplier: headroom, estimatedRequiredGB: requiredGB,
      fitCategory: availableGB >= requiredGB ? 'possibly_fits' : 'likely_insufficient_ram', kind: 'heuristic_not_measured',
      vram, gpuOffloading: vram.status === 'evaluated' ? 'single_gpu_estimate_only' : 'not_evaluated', speed: 'unknown', modelQuality: 'unknown',
      assumptions: ['required = weights x headroom + overhead + KV cache (if supplied)', 'Headroom multiplier and fixed overhead are assumptions, not measurements', 'Download size is not runtime resident memory']
    },
    limitations: [
      'A static fit estimate is not a load, compatibility or performance guarantee',
      'KV cache is omitted unless kvBytesPerToken is supplied',
      'Fragmentation, runtime implementation, quantisation format and acceleration must be checked separately',
      'Model license and source are copied from the supplied descriptor and are not verified'
    ]
  });
}

export function fitCatalog(models, hw) {
  assert(Array.isArray(models) && models.length >= 1 && models.length <= 200, 'Bounded model catalog (1..200 entries) required');
  const ids = models.map(m => m?.id).filter(Boolean);
  assert(new Set(ids).size === ids.length, 'Model ids in a catalog must be unique');
  const results = models.map(model => fitModel(model, hw));
  const possibly = results.filter(r => r.estimate.fitCategory === 'possibly_fits').length;
  return seal({schema: 'localsutra.catalog.v1', summary: {total: results.length, possiblyFits: possibly, likelyInsufficient: results.length - possibly}, results});
}
