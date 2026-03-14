#!/bin/bash
export PATH="/opt/homebrew/opt/node@20/bin:/usr/local/bin:/usr/bin:/bin"
export NODE_ENV=production
cd /Users/jason/Github/GreenerGardens
exec /Users/jason/Github/GreenerGardens/node_modules/.bin/tsx packages/backend/src/index.ts
