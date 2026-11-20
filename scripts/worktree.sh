#!/bin/sh
# Usage: scripts/worktree.sh <name>
#
# Gives a ticket its own checkout, so sessions running in parallel don't share uncommitted work
# or block each other's pre-commit hook. It:
#   - adds a git worktree at <main checkout>.worktrees/<name> on a new branch ticket/<name>, cut from main;
#   - symlinks the git-ignored game sources (blueprints/, decompiled/) and .env from the main checkout;
#   - runs `bun install --frozen-lockfile` there, whose `prepare` script points core.hooksPath at .githooks.
#     Bun clones the packages from its global cache (copy-on-write on APFS), so each install is fast and small;
#   - opens the worktree as its own WebStorm project (`open-webstorm-project`, when it's installed), so the IDE's
#     MCP tools serve it and its changes show in that window's Commit tab.
# It refuses a name whose branch or directory already exists.
#
# When the ticket is done, its session commits to ticket/<name>. The coordinating session, in the
# main checkout, merges it, then finishes the worktree, which closes its WebStorm project first:
#   git merge refs/heads/ticket/<name>
#   scripts/worktree-done.sh <name>
set -eu

die() {
  echo "worktree.sh: $*" >&2
  exit 1
}

[ $# -eq 1 ] || die "usage: scripts/worktree.sh <name>"
name=$1
case $name in
  '' | *[!A-Za-z0-9._-]* | [.-]*) die "name must be letters, digits, '.', '_' or '-': $name" ;;
esac

main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
dest="$main.worktrees/$name"
branch="ticket/$name"

git -C "$main" show-ref --verify --quiet "refs/heads/$branch" && die "branch $branch already exists"
[ -e "$dest" ] && die "$dest already exists"
for dir in blueprints decompiled; do
  [ -d "$main/$dir" ] || die "$main/$dir is missing"
done

mkdir -p "$main.worktrees"
git -C "$main" worktree add -b "$branch" "$dest" main

# Symlinks don't match the directory-only patterns in .gitignore; exclude them for every worktree.
exclude=$(git -C "$main" rev-parse --path-format=absolute --git-common-dir)/info/exclude
for dir in blueprints decompiled; do
  ln -s "$main/$dir" "$dest/$dir"
  grep -qxF "/$dir" "$exclude" 2>/dev/null || echo "/$dir" >>"$exclude"
done
[ -f "$main/.env" ] && ln -s "$main/.env" "$dest/.env"

(cd "$dest" && bun install --frozen-lockfile)
[ "$(git -C "$dest" config core.hooksPath)" = .githooks ] || die "core.hooksPath is not .githooks"
[ -x "$dest/.githooks/pre-commit" ] || die "$dest/.githooks/pre-commit is not executable"

ide="opened in WebStorm"
if command -v open-webstorm-project >/dev/null 2>&1; then
  open-webstorm-project "$dest" || ide="NOT opened in WebStorm (open-webstorm-project failed; use the built-in file tools)"
else
  ide="NOT opened in WebStorm (open-webstorm-project isn't installed; use the built-in file tools)"
fi

cat <<EOF

Worktree ready: $dest (branch $branch), $ide
Next:
  - start the ticket's session in $dest; pass projectPath "$dest" on every mcp__webstorm__* call;
  - run \`bun run format\` before committing; the pre-commit hook runs \`bun run check\`;
  - commit to $branch and report the hash to the coordinating session, which merges it.
EOF
