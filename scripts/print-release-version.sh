#!/usr/bin/env bash
set -euo pipefail

#
# Prints the release version derived from the vYYYY.MM.DD-N tag pointing at the
# current commit (with the leading 'v' stripped). Used by the release workflow
# after tag-next-version.sh has created the tag.
#
# This is distinct from print-app-version.sh, which reports a human-readable
# "<pkg version> (git <describe>)" string for local/diagnostic use.
#

COMMIT=$(git rev-parse HEAD)

# Find the version tag on the current commit; prefer the highest if several
TAG=$(git tag --points-at "$COMMIT" | grep -E '^v[0-9]{4}\.[0-9]{2}\.[0-9]{2}-[0-9]+$' | sort -V | tail -n 1 || true)

if [ -z "$TAG" ]; then
    echo "Error: The current commit is not tagged with a release version." >&2
    exit 1
fi

# Strip the leading 'v'
echo "${TAG#v}"
