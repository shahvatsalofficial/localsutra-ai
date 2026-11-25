# LocalSutra AI documents

Online: https://shahvatsalofficial.github.io/localsutra-ai/

| Folder | Content |
|---|---|
| `md/` | Markdown sources. `{{NAME}}` placeholders are filled from the recorded proof run; `@@diagram:...@@` lines insert figures |
| `site/` | Theme, scripts and figure generators |
| `html/` | Built site (deployed to GitHub Pages). Do not edit by hand |
| `build.mjs` | Zero-dependency builder; runs the real CLI to produce scenario output |

Rebuild: `npm run proof`, `npm run audit`, `npm run demo`, then `npm run docs`.
