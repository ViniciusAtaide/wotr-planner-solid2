#!/bin/sh
# Usage: scripts/merge-ticket.sh <branch-or-commit> [merge message]
#
# The coordinator's merge of a ticket into main, checked before main moves. It:
#   - refuses unless main is checked out in the main checkout;
#   - builds the merge of <ref> onto the current main in a scratch worktree (a fast-forward when
#     <ref> already contains main, else a merge commit with the given message);
#   - runs `bun run check` there, behind the check lock like any other check;
#   - refuses if main moved while the check ran, so a stale merge never lands;
#   - fast-forwards main to the checked merge and pushes it.
# It never closes the ticket's worktree: scripts/worktree-done.sh does that, once the ticket is over.
set -eu

die() {
  echo "merge-ticket.sh: $*" >&2
  exit 1
}

[ $# -ge 1 ] || die "usage: scripts/merge-ticket.sh <branch-or-commit> [merge message]"
ref=$1
message=${2:-"Merge $1"}

main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
cd "$main"
[ "$(git symbolic-ref --quiet --short HEAD)" = main ] || die "the main checkout isn't on main"
git rev-parse --verify --quiet "$ref^{commit}" >/dev/null || die "no such branch or commit: $ref"

base=$(git rev-parse main)
if git merge-base --is-ancestor "$ref" "$base"; then
  echo "$ref is already in main ($base)"
  exit 0
fi

scratch=$(mktemp -d "${TMPDIR:-/tmp}/merge-ticket.XXXXXX")
cleanup() {
  git -C "$main" worktree remove --force "$scratch/wt" 2>/dev/null || true
  rm -rf "$scratch"
}
trap cleanup EXIT

git worktree add -q --detach "$scratch/wt" "$base"
for dir in node_modules blueprints decompiled; do
  [ -e "$main/$dir" ] && ln -s "$main/$dir" "$scratch/wt/$dir"
done
[ -f "$main/.env" ] && ln -s "$main/.env" "$scratch/wt/.env"

cd "$scratch/wt"
if git merge-base --is-ancestor "$base" "$ref"; then
  git merge -q --ff-only "$ref"
else
  git merge -q --no-ff -m "$message" "$ref" || die "$ref doesn't merge cleanly onto main; merge main into it first"
fi
merged=$(git rev-parse HEAD)

echo "Checking the merge $merged…"
bun run --silent check >"$scratch/check.log" 2>&1 || {
  tail -40 "$scratch/check.log" >&2
  die "the check failed on the merge; main is unchanged"
}

cd "$main"
[ "$(git rev-parse main)" = "$base" ] || die "main moved while the check ran; run it again"
git merge -q --ff-only "$merged" || die "main's working tree blocks the fast-forward; the merge $merged is checked but not applied"
git push -q origin main
echo "Merged $ref into main as $merged and pushed."
