#!/usr/bin/env bash
set -euo pipefail

#
# Tags the current commit with the next release version.
#
# Version scheme: vYYYY.MM.DD-N, where the date is Pacific Time and N is the
# next build number for that date. Only runs on the main branch.
#

# Ensure we're on the main branch
CURRENT_BRANCH=${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Error: This script can only be run on the main branch"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Fail if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: There are uncommitted changes"
    exit 1
fi

# Pull latest changes
git pull origin main

# Ensure there isn't already a version tag for this commit
CURRENT_COMMIT=$(git rev-parse HEAD)
if git tag --points-at "$CURRENT_COMMIT" | grep -qE 'v[0-9]{4}\.[0-9]{2}\.[0-9]{2}-[0-9]+'; then
    echo "Error: A version tag already exists for this commit"
    exit 1
fi

# Compute today's date in Pacific Time (YYYY.MM.DD)
export TZ=America/Los_Angeles
DATE=$(date "+%Y.%m.%d")

# Find the latest build number for today across remote tags
LAST_BUILD=$(git ls-remote --tags origin | grep "${DATE}-" | sed 's/.*\///' | sort -V | tail -n1 | grep -oE '[0-9]+$' || echo "0")

# Force base-10 interpretation (avoid octal on leading zeros) and increment
LAST_BUILD=${LAST_BUILD:-0}
BUILD_NUM=$((10#${LAST_BUILD} + 1))

NEW_TAG="v${DATE}-$(printf "%d" ${BUILD_NUM})"

echo "Creating new tag: $NEW_TAG (Pacific Time)"

# Configure git identity when running in CI
if [ "${CI:-}" = "true" ]; then
    git config --local user.email "github-actions[bot]@users.noreply.github.com"
    git config --local user.name "github-actions[bot]"
fi

# Create and push the tag
git tag "$NEW_TAG"
git push origin "$NEW_TAG"

echo "Successfully created and pushed tag: $NEW_TAG"
