#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Running prettier..."
npx prettier --write .

echo "Running n8n node lint..."
npx n8n-node lint --fix

echo "Typechecking..."
npx tsc --noEmit

if git diff --quiet && git diff --cached --quiet; then
	echo "No changes to commit."
else
	git add -A
	git commit -m "style: format and lint"
fi

echo "Pushing to origin..."
git push origin "$(git rev-parse --abbrev-ref HEAD)"
