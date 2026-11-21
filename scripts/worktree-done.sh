#!/bin/sh
# Usage: scripts/worktree-done.sh <name>
#
# Finishes a ticket's worktree once its branch is merged into main. It:
#   - refuses unless ticket/<name> is merged into main and the worktree has no uncommitted changes;
#   - stops any process still running in the worktree (a dev server), which would otherwise keep
#     rewriting generated files into the removed folder;
#   - closes the worktree's WebStorm project (`close-webstorm-project`, when it's installed), which
#     must happen before the directory goes;
#   - removes the worktree and deletes the branch.
# Run it from the main checkout, as the coordinator, after `git merge refs/heads/ticket/<name>`.
set -eu

die() {
  echo "worktree-done.sh: $*" >&2
  exit 1
}

[ $# -eq 1 ] || die "usage: scripts/worktree-done.sh <name>"
name=$1
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
dest="$main.worktrees/$name"
branch="ticket/$name"

[ -d "$dest" ] || die "$dest doesn't exist"
git -C "$main" show-ref --verify --quiet "refs/heads/$branch" || die "branch $branch doesn't exist"
git -C "$main" merge-base --is-ancestor "refs/heads/$branch" main || die "$branch isn't merged into main yet"
[ -z "$(git -C "$dest" status --porcelain)" ] || die "$dest has uncommitted changes"

for pid in $(lsof -t +d "$dest" 2>/dev/null | sort -u); do
  cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
  case "$cwd" in
    "$dest" | "$dest"/*)
      echo "Stopping process $pid running in $dest"
      kill "$pid" 2>/dev/null || true
      ;;
  esac
done

if command -v close-webstorm-project >/dev/null 2>&1; then
  close-webstorm-project "$dest" || die "close-webstorm-project failed; nothing was removed (WebStorm may be showing a dialog)"
else
  echo "worktree-done.sh: close-webstorm-project isn't installed; close the WebStorm window by hand" >&2
fi

git -C "$main" worktree remove "$dest"
git -C "$main" branch -d "$branch"
echo "Done: $dest removed, $branch deleted"
