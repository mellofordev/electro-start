#!/usr/bin/env bash
# Publish electro-start 0.0.1-alpha.0 packages to npm (public, tag: alpha).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! npm whoami >/dev/null 2>&1; then
  echo "Not logged in to npm. Run: npm login"
  exit 1
fi

echo "npm user: $(npm whoami)"
echo "Running tests + typecheck..."
bun test
bun run typecheck

echo "Syncing templates + packing..."
bun run pack:check

publish_one() {
  local dir="$1"
  echo ""
  echo "── Publishing $dir ──"
  (
    cd "$dir"
    if [[ -n "${NPM_OTP:-}" ]]; then
      npm publish --access public --tag alpha --otp="$NPM_OTP"
    else
      npm publish --access public --tag alpha
    fi
  )
}

publish_one packages/electro-start
publish_one packages/vite-plugin
publish_one packages/create-electro-start

echo ""
echo "Published. Testers can run:"
echo "  bunx create-electro-start@alpha my-app --yes"
echo "  cd my-app && bun install && bun run dev"
