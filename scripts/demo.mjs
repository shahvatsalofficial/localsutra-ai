import {spawnSync} from 'node:child_process';
const r = spawnSync(process.execPath, ['packages/cli/index.mjs', 'demo', '--out', 'examples/reports', '--force'], {stdio: 'inherit'});
process.exitCode = r.status ?? 1;
