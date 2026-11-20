#!/bin/sh
# Usage: scripts/commit-paths.sh <message-file> <path>...
#
# Commits exactly the given paths, through the pre-commit hook, and nothing else. Sessions share
# this checkout, so another session's changes may already be staged; a plain `git commit` would
# take them too. A path that no longer exists is committed as a deletion. Changes staged for other
# paths stay staged.
set -eu

if [ "$#" -lt 2 ]; then
  echo "usage: scripts/commit-paths.sh <message-file> <path>..." >&2
  exit 2
fi
message=$1
shift
if [ ! -f "$message" ]; then
  echo "no message file: $message" >&2
  exit 2
fi

for path in "$@"; do
  if [ -e "$path" ]; then
    git add -- "$path"
  elif git ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
    git rm --cached --quiet -- "$path"
  elif ! git diff --cached --name-only -- "$path" | grep -q .; then
    echo "not a path git knows: $path" >&2
    exit 1
  fi
done

git commit --file "$message" --only -- "$@"
