#!/bin/sh
set -u

lock="$(git rev-parse --git-common-dir)/check.lock"
announced=

stale() {
  pid=$(cat "$lock/pid" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    ! kill -0 "$pid" 2>/dev/null
  else
    [ -n "$(find "$lock" -maxdepth 0 -mmin +1 2>/dev/null)" ]
  fi
}

while ! mkdir "$lock" 2>/dev/null; do
  if stale; then
    rm -rf "$lock"
    continue
  fi
  if [ -z "$announced" ]; then
    echo "waiting for another check… (lock: $lock, pid $(cat "$lock/pid" 2>/dev/null || echo '?'))" >&2
    announced=1
  fi
  sleep 2
done

echo $$ >"$lock/pid"
trap 'rm -rf "$lock"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

"$@"
exit $?
