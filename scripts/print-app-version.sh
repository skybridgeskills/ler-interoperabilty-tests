#!/usr/bin/env bash
set -euo pipefail
git_tag=$(git describe --tags --always --dirty 2>/dev/null || echo "untagged")
pkg_version=$(node -p "require('./package.json').version")
echo "${pkg_version} (git ${git_tag})"
