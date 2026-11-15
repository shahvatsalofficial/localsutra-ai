#!/usr/bin/env node
// Builds html/ from md/ with zero dependencies. Run: node build.mjs   (after `npm run proof` and `npm run proof` in ../../LocalSutra-AI)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const PROJECT=path.resolve(HERE,'..');
const MD=path.join(HERE,'md'),OUT=path.join(HERE,'html');
const REPO='https://github.com/shahvatsalofficial/localsutra-ai';
fs.mkdirSync(OUT,{recursive:true});
const rd=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const env=rd(path.join(PROJECT,'docs/proof/environment.json')),fuzz=rd(path.join(PROJECT,'docs/proof/fuzz-results.json'));
const vars={VERSION:env.version,NODE:env.node,PLATFORM:env.platform,RECORDED:env.recordedAt,TESTS:env.tests,PASS:env.pass,FAIL:env.fail,SKIPPED:env.skipped,FUZZ:fuzz.fitCases+fuzz.gpuCases+fuzz.runtimeCases+fuzz.sealCases,CRASHED:fuzz.fitUnexpected+fuzz.gpuUnexpected+fuzz.runtimeUnexpected+fuzz.sealUnexpected};
const fill=s=>s.replace(/\{\{(\w+)\}\}/g,(m,k)=>{if(!(k in vars))throw new Error('Unknown placeholder '+k);return String(vars[k]);});

// copy proof + samples so docs link to real files
const cp=(from,to)=>{fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);};
for(const dir of ['test-results','samples']){fs.rmSync(path.join(HERE,dir),{recursive:true,force:true});}
for(const f of fs.readdirSync(path.join(PROJECT,'docs/proof')))if(!f.startsWith('cli-')&&f!=='README.md'&&f!=='audit-sample')cp(path.join(PROJECT,'docs/proof',f),path.join(HERE,'test-results',f));
for(const f of fs.readdirSync(path.join(PROJECT,'docs/proof')))if(f.startsWith('cli-'))cp(path.join(PROJECT,'docs/proof',f),path.join(HERE,'samples',f));
fs.cpSync(path.join(PROJECT,'docs/proof/audit-sample'),path.join(HERE,'samples/audit'),{recursive:true});
for(const d of [OUT])for(const sub of ['test-results','samples']){fs.rmSync(path.join(d,sub),{recursive:true,force:true});}
fs.cpSync(path.join(HERE,'test-results'),path.join(OUT,'test-results'),{recursive:true});fs.cpSync(path.join(HERE,'samples'),path.join(OUT,'samples'),{recursive:true});

const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline=t=>{const codes=[];t=t.replace(/`([^`]+)`/g,(m,c)=>{codes.push(c);return `\u0000${codes.length-1}\u0000`;});t=esc(t);
 t=t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>').replace(/&lt;(https?:\/\/[^&]+)&gt;/g,'<a href="$1">$1</a>');
 return t.replace(/\u0000(\d+)\u0000/g,(m,i)=>`<code>${esc(codes[i])}</code>`);};
function md2html(src){const L=src.split(/\r?\n/);let o=[],i=0;const heads=[];
 while(i<L.length){const l=L[i];
  if(l.startsWith('```')){const buf=[];i++;while(i<L.length&&!L[i].startsWith('```'))buf.push(L[i++]);i++;o.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);continue;}
  let m;if((m=l.match(/^(#{1,4})\s+(.*)/))){const n=m[1].length,id=m[2].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(n>1)heads.push({n,id,t:m[2]});o.push(`<h${n} id="${id}">${inline(m[2])}</h${n}>`);i++;continue;}
  if(l.startsWith('|')&&L[i+1]&&/^\|[\s:|-]+\|?$/.test(L[i+1])){const row=s=>s.replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(c=>c.trim().replaceAll('\\|','|'));const h=row(l);i+=2;const rows=[];while(i<L.length&&L[i].startsWith('|'))rows.push(row(L[i++]));
   o.push(`<div class="scroll"><table><thead><tr>${h.map(c=>`<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;}
  if(/^\s*[-*]\s+/.test(l)){const items=[];while(i<L.length&&/^\s*[-*]\s+/.test(L[i]))items.push(L[i++].replace(/^\s*[-*]\s+/,''));o.push(`<ul>${items.map(x=>`<li>${inline(x)}</li>`).join('')}</ul>`);continue;}
  if(/^\d+\.\s+/.test(l)){const items=[];while(i<L.length&&/^\d+\.\s+/.test(L[i]))items.push(L[i++].replace(/^\d+\.\s+/,''));o.push(`<ol>${items.map(x=>`<li>${inline(x)}</li>`).join('')}</ol>`);continue;}
  if(l.startsWith('>')){o.push(`<blockquote>${inline(l.replace(/^>\s?/,''))}</blockquote>`);i++;continue;}
  if(!l.trim()){i++;continue;}
  const buf=[l];i++;while(i<L.length&&L[i].trim()&&!/^(#|```|\||>|\s*[-*]\s|\d+\.\s)/.test(L[i]))buf.push(L[i++]);o.push(`<p>${inline(buf.join(' '))}</p>`);}
 return {html:o.join('\n'),heads};}

const CSS=`:root{--bg:#f5f7fa;--card:#fff;--ink:#14202b;--mute:#53636f;--line:#d9e1e8;--brand:#0b6a7a;--brand2:#e8f4f6;--code:#eef2f6;--ok:#13795b;--warn:#a15c00}
@media(prefers-color-scheme:dark){:root{--bg:#0d1319;--card:#151e27;--ink:#e6edf3;--mute:#9db0be;--line:#27343f;--brand:#53c6d8;--brand2:#12303a;--code:#1b2733;--ok:#4cd6a3;--warn:#f0b254}}
*{box-sizing:border-box}html{scroll-behavior:smooth}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--brand)}a:focus-visible,button:focus-visible{outline:3px solid var(--brand);outline-offset:2px}
.skip{position:absolute;left:-999px}.skip:focus{left:8px;top:8px;background:var(--card);padding:.5rem 1rem;z-index:9}
.layout{display:grid;grid-template-columns:270px minmax(0,1fr);min-height:100vh}
nav.side{position:sticky;top:0;align-self:start;height:100vh;overflow:auto;padding:1.25rem 1rem;border-right:1px solid var(--line);background:var(--card)}
nav.side .brand{font-weight:700;font-size:1.1rem;color:var(--brand);text-decoration:none;display:block;margin-bottom:.2rem}
nav.side small{color:var(--mute);display:block;margin-bottom:1rem}
nav.side a.item{display:block;padding:.35rem .6rem;border-radius:8px;text-decoration:none;color:var(--ink);font-size:.93rem}
nav.side a.item:hover{background:var(--brand2)}nav.side a.item[aria-current=page]{background:var(--brand2);color:var(--brand);font-weight:600}
main{max-width:920px;padding:2.5rem 2rem 5rem;width:100%}
h1{font-size:2rem;line-height:1.2;margin:.2rem 0 1rem}h2{margin-top:2.2rem;padding-bottom:.3rem;border-bottom:1px solid var(--line)}h3{margin-top:1.6rem}
.scroll{overflow-x:auto;margin:1rem 0;border:1px solid var(--line);border-radius:10px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:.93rem}th,td{padding:.55rem .75rem;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--brand2);font-weight:600}tr:last-child td{border-bottom:0}
pre{background:var(--code);padding:1rem;border-radius:10px;overflow:auto;border:1px solid var(--line);font-size:.88rem}code{background:var(--code);padding:.08rem .35rem;border-radius:5px;font:.9em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}pre code{background:none;padding:0}
blockquote{margin:1rem 0;padding:.5rem 1rem;border-left:4px solid var(--brand);background:var(--brand2);border-radius:0 8px 8px 0}
.pager{display:flex;justify-content:space-between;gap:1rem;margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line)}
footer{color:var(--mute);font-size:.85rem;margin-top:2rem}
.hero{background:linear-gradient(135deg,var(--brand2),var(--card));border:1px solid var(--line);border-radius:16px;padding:2rem;margin-bottom:1.5rem}
.hero p{font-size:1.1rem;color:var(--mute);max-width:60ch}.chips{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0}.chip{border:1px solid var(--line);background:var(--card);border-radius:99px;padding:.15rem .8rem;font-size:.85rem}.chip.ok{color:var(--ok);border-color:var(--ok)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1rem}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem 1.2rem;text-decoration:none;color:var(--ink);display:block}.card:hover{border-color:var(--brand)}.card b{display:block;color:var(--brand)}.card span{color:var(--mute);font-size:.9rem}
@media(max-width:860px){.layout{grid-template-columns:1fr}nav.side{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}main{padding:1.5rem 1rem 4rem}}
@media print{nav.side,.pager,.skip{display:none}.layout{display:block}main{max-width:none}body{background:#fff;color:#000}}`;

const files=fs.readdirSync(MD).filter(f=>f.endsWith('.md')).sort();
const pages=files.map(f=>{const raw=fill(fs.readFileSync(path.join(MD,f),'utf8'));const {html,heads}=md2html(raw);const title=(raw.match(/^#\s+(.*)/m)||[,f])[1];const blurb=(raw.split(/\r?\n/).find(l=>l.trim()&&!l.startsWith('#')&&!l.startsWith('|')&&!l.startsWith('`'))||'').replace(/[*`_]/g,'').slice(0,140);return {slug:f.replace(/\.md$/,''),title,html,heads,blurb};});
const nav=cur=>`<nav class="side" aria-label="Documentation"><a class="brand" href="index.html">LocalSutra AI</a><small>v${vars.VERSION} · documentation</small>${pages.map(p=>`<a class="item" href="${p.slug}.html"${p.slug===cur?' aria-current="page"':''}>${esc(p.title)}</a>`).join('')}<a class="item" href="${REPO}">GitHub ↗</a></nav>`;
const shell=(title,cur,body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(title)} · LocalSutra AI</title><meta name="description" content="LocalSutra AI documentation: offline-first local AI readiness, evidence-backed."><style>${CSS}</style></head><body><a class="skip" href="#main">Skip to content</a><div class="layout">${nav(cur)}<main id="main">${body}<footer>LocalSutra AI ${vars.VERSION} · created by Vatsal Shah · Apache-2.0 · generated ${new Date().toISOString().slice(0,10)} · figures from the recorded test run of ${esc(vars.RECORDED)}</footer></main></div></body></html>`;
pages.forEach((p,i)=>{const prev=pages[i-1],next=pages[i+1];fs.writeFileSync(path.join(OUT,p.slug+'.html'),shell(p.title,p.slug,`${p.html}<div class="pager">${prev?`<a href="${prev.slug}.html">← ${esc(prev.title)}</a>`:'<span></span>'}${next?`<a href="${next.slug}.html">${esc(next.title)} →</a>`:'<span></span>'}</div>`));});
const hero=`<section class="hero"><h1>LocalSutra AI documentation</h1><p>Know your hardware. Choose your model. Keep AI local. An offline, evidence-first local-AI readiness toolkit.</p><div class="chips"><span class="chip">v${vars.VERSION}</span><span class="chip ok">${vars.PASS} passed · ${vars.SKIPPED} skipped · ${vars.FAIL} failed</span><span class="chip">0 runtime dependencies</span><span class="chip">Apache-2.0</span><span class="chip">Honest: loopback only, never installs or downloads</span></div></section>`;
fs.writeFileSync(path.join(OUT,'index.html'),shell('Documentation','index',`${hero}<div class="cards">${pages.map(p=>`<a class="card" href="${p.slug}.html"><b>${esc(p.title)}</b><span>${esc(p.blurb)}</span></a>`).join('')}<a class="card" href="samples/audit/audit-report.html"><b>Sample audit report</b><span>Real HTML output of <code>localsutra audit</code> (37 adversarial checks)</span></a><a class="card" href="test-results/test-run.tap"><b>Raw test log (TAP)</b><span>Unedited machine output</span></a></div>`));
// md copies with placeholders resolved, plus a README index
fs.mkdirSync(path.join(HERE,'md-rendered'),{recursive:true});
for(const f of files)fs.writeFileSync(path.join(HERE,'md-rendered',f),fill(fs.readFileSync(path.join(MD,f),'utf8')));
fs.writeFileSync(path.join(HERE,'README.md'),`# LocalSutra AI — documents

Complete documentation set for **LocalSutra AI ${vars.VERSION}** (technical, functional, architecture, executive, user guide, security, evidence, test report, legal, roadmap, glossary, assurance).

- Start: \`html/index.html\` (open in a browser; self-contained, responsive, light/dark, printable)
- Markdown sources: \`md/\` (with placeholders) and \`md-rendered/\` (numbers filled from the recorded run)
- Proof: \`test-results/\` (TAP log, fuzz, environment) · Samples: \`samples/\` (real audit report in MD/HTML/JSON, CLI transcripts)
- Rebuild: \`node build.mjs\` after \`npm run proof\` and \`npm run audit\` in \`../../LocalSutra-AI\`

Project: ${REPO}
`);
console.log(`built ${pages.length} pages + index`);
