import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readdir, readFile, mkdir, writeFile, lstat, realpath} from 'node:fs/promises';
import {assert} from './util.mjs';

export const IDE_DIRS = {claude: '.claude/skills', cursor: '.cursor/skills', codex: '.agents/skills', gemini: '.gemini/skills', copilot: '.github/skills', opencode: '.opencode/skills'};
const DEFAULT_SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills');

// Creates each path segment one by one and refuses to traverse an existing symlink.
async function ensureRealDir(base, segments) {
  let cur = base;
  for (const seg of segments) {
    cur = path.join(cur, seg);
    let st = null;
    try { st = await lstat(cur); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (st) assert(st.isDirectory() && !st.isSymbolicLink(), `Refusing to traverse a symlink or non-directory: ${seg}`);
    else await mkdir(cur);
  }
  return cur;
}

export async function installSkills(project, ide, {source = DEFAULT_SOURCE, dryRun = false} = {}) {
  assert(Object.hasOwn(IDE_DIRS, ide), 'Supported IDE: ' + Object.keys(IDE_DIRS).join(', '));
  const target = path.resolve(project);
  const st = await lstat(target);
  assert(st.isDirectory() && !st.isSymbolicLink(), 'Project must be a real directory (not a symlink)');
  const real = await realpath(target); // canonical base (handles Windows 8.3 short names); every deeper segment is lstat-checked
  const names = (await readdir(source, {withFileTypes: true})).filter(x => x.isDirectory() && /^localsutra-[a-z0-9-]+$/.test(x.name)).map(x => x.name).sort();
  assert(names.length >= 20, 'Skills source folder incomplete');
  const plan = [];
  for (const name of names) {
    const content = await readFile(path.join(source, name, 'SKILL.md'), 'utf8');
    assert(content.startsWith('---\n') || content.startsWith('---\r\n'), `Invalid skill (no frontmatter): ${name}`);
    assert(new RegExp(`^name:\\s*${name}\\s*$`, 'm').test(content), `Skill frontmatter name must match folder: ${name}`);
    plan.push({name, content});
  }
  let written = 0, skipped = 0;
  const files = [];
  for (const {name, content} of plan) {
    const rel = [...IDE_DIRS[ide].split('/'), name];
    files.push(path.posix.join(...rel, 'SKILL.md'));
    if (dryRun) continue;
    const dir = await ensureRealDir(real, rel);
    try { await writeFile(path.join(dir, 'SKILL.md'), content, {flag: 'wx'}); written++; }
    catch (e) { if (e.code === 'EEXIST') skipped++; else throw e; }
  }
  return {ide, project: real, target: IDE_DIRS[ide], dryRun, planned: files.length, written, skipped, files: dryRun ? files : undefined, hostActivation: 'not_tested'};
}
