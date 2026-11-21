export const PLAN = '.scratch/wotr-planner-build/plan.md';
export const ISSUES = '.scratch/wotr-planner-build/issues/';

const ROW_LINK = /^\|[^|]*\|\s*\[[^\]]*\]\(issues\/([^)]+)\)/;

export function planRowProblems(plan: string, issueFiles: readonly string[]): string[] {
  const problems: string[] = [];
  const rows = new Map<string, number>();
  for (const line of plan.split('\n')) {
    const file = ROW_LINK.exec(line)?.[1];
    if (file !== undefined) rows.set(file, (rows.get(file) ?? 0) + 1);
  }
  const files = new Set(issueFiles.filter((f) => f.endsWith('.md')));
  for (const [file, count] of rows) {
    if (!files.has(file)) problems.push(`${PLAN}: row links issues/${file}: [plan-row] no such ticket file`);
    if (count > 1) problems.push(`${PLAN}: issues/${file}: [plan-row] has ${count} rows`);
  }
  for (const file of [...files].sort()) {
    if (!rows.has(file)) problems.push(`${ISSUES}${file}: [plan-row] has no row in ${PLAN}`);
  }
  return problems;
}
