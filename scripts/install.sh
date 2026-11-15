#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
printf '%s\n' 'LocalSutra AI project setup: no extra packages required.' 'Run: npm test && npm run demo' 'To install portable skills to your project: node packages/cli/index.mjs install-skills --project /path/to/project --ide claude'
