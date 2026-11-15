import {assert, number, seal, summary} from './util.mjs';

// Deterministic integer workload. It is NOT AI inference and says nothing about tokens per second.
export function work(n) { let sum = 0; for (let i = 1; i <= n; i++) sum += (i % 97) * (i % 31); return sum; }

export function benchmark({runs = 5, iterations = 100000} = {}) {
  number(runs, 'runs', 2, 30);
  number(iterations, 'iterations', 1000, 2000000);
  work(Math.min(iterations, 20000)); // warm-up, discarded
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const start = process.hrtime.bigint(), cpu = process.cpuUsage(), rss = process.memoryUsage().rss;
    const checksum = work(iterations);
    const wallMs = Number(process.hrtime.bigint() - start) / 1e6;
    const delta = process.cpuUsage(cpu);
    samples.push({wallMs, cpuUserMs: delta.user / 1000, cpuSystemMs: delta.system / 1000, processRssBytes: Math.max(rss, process.memoryUsage().rss), checksum});
  }
  assert(samples.every(s => s.checksum === samples[0].checksum), 'Benchmark validation failed');
  return seal({
    schema: 'localsutra.benchmark.v1', type: 'synthetic_cpu_workload_not_ai_inference', runs, iterations, warmupDiscarded: true,
    environment: {node: process.version, platform: process.platform, arch: process.arch},
    statistics: {wallMs: summary(samples.map(s => s.wallMs)), cpuUserMs: summary(samples.map(s => s.cpuUserMs)), rssBytes: summary(samples.map(s => s.processRssBytes))},
    samples,
    limits: ['Not an LLM or runtime benchmark', 'Process RSS is not GPU VRAM', 'Host load and thermal state affect results', 'No power, energy or model quality measured', 'Small sample counts give wide uncertainty; see stdev']
  });
}

export function compare(a, b) {
  assert(a?.schema === 'localsutra.benchmark.v1' && b?.schema === 'localsutra.benchmark.v1', 'Comparable benchmark reports required');
  assert(a.type === b.type && a.iterations === b.iterations, 'Workloads are not comparable');
  assert(a.environment.platform === b.environment.platform && a.environment.arch === b.environment.arch, 'Hardware platform mismatch');
  const am = a.statistics.wallMs.median, bm = b.statistics.wallMs.median;
  return seal({
    schema: 'localsutra.compare.v1', aMedianMs: am, bMedianMs: bm, ratio: am / Math.max(bm, 1e-10),
    classification: 'same_host_and_workload_only',
    warning: 'Same hardware family is not proof of identical physical machine or conditions'
  });
}
