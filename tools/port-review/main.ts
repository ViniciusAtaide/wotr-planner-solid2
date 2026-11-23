import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRelationReport, scanRelations, type RelationReport } from 'jev-lint/relations';
import type { Cites } from '~engine/cite';
import { cites as prerequisites } from '~engine/prerequisites';
import { readSources } from '../decompiled';
import { FREE_DECIDER, openRouterClient } from './client';
import { portPairs, type FeatureFile, type PortPairs } from './pairs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
export const REPORTS = '.jev-lint/ports';

const REGISTRIES: Readonly<Record<string, Cites>> = { 'engine/prerequisites': prerequisites };

function featureFiles(feature: string): FeatureFile[] {
  return readdirSync(join(repo, feature), { recursive: true, encoding: 'utf8' })
    .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('cites.ts'))
    .sort()
    .map((name) => ({ path: `${feature}/${name}`, text: readFileSync(join(repo, feature, name), 'utf8') }));
}

function summary(pairs: PortPairs, report: RelationReport): string[] {
  const rank = { contradicts: 0, insufficient_context: 1, unrelated: 2, supports: 3 } as const;
  const rows = report.candidates.map((c) => {
    const label = pairs.labels.get(c.relationId);
    const choice = c.judgment?.choice ?? 'no answer';
    const p = c.judgment === null ? '' : c.judgment.probabilities[c.judgment.choice].toFixed(3);
    return {
      order: c.judgment === null ? -1 : rank[c.judgment.choice],
      line: `${choice.padEnd(21)}${p.padEnd(7)}claim ${(c.claimJudgment?.choice ?? '-').padEnd(21)}${label?.target ?? c.relationId}  ${label?.key ?? ''} <- ${label?.cite ?? ''}`,
    };
  });
  return rows.sort((a, b) => a.order - b.order).map((r) => r.line);
}

async function main(args: readonly string[]): Promise<number> {
  const dryRun = args.includes('--dry-run');
  const names = args.filter((a) => !a.startsWith('--'));
  const features =
    names.length === 0 ? Object.keys(REGISTRIES) : names.map((n) => (n.includes('/') ? n : `engine/${n}`));
  const sources = readSources(join(repo, 'decompiled'));
  if (sources === undefined) {
    console.error('no decompiled/ sources here: nothing to pair a port with');
    return 2;
  }
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  let status = 0;
  for (const feature of features) {
    const cites = REGISTRIES[feature];
    if (cites === undefined) {
      console.error(`no registry for ${feature}; the features are ${Object.keys(REGISTRIES).join(', ')}`);
      return 2;
    }
    const slug = feature.replace(/\//g, '-');
    const pairs = portPairs(
      {
        feature,
        cites,
        files: featureFiles(feature),
        readme: { path: `${feature}/README.md`, text: readFileSync(join(repo, feature, 'README.md'), 'utf8') },
      },
      sources,
      sha,
      `ports-${slug}-${Date.now()}`,
    );
    const chars = pairs.input.sources.reduce((n, s) => n + s.content.length, 0);
    console.log(
      `${feature}: ${pairs.input.claims.length} claims, ${pairs.input.relations.length} relations, ${pairs.input.sources.length} sources (${chars.toLocaleString('en-US')} characters)`,
    );
    for (const u of pairs.unpaired) console.log(`  unpaired: ${u.key} <- ${u.cite}: ${u.reason}`);
    if (pairs.unpaired.length > 0) status = 3;
    if (dryRun) continue;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY is not set');
      return 2;
    }
    const report = await scanRelations(pairs.input, { client: openRouterClient(apiKey) });
    parseRelationReport(report, pairs.input);
    mkdirSync(join(repo, REPORTS), { recursive: true });
    const out = `${REPORTS}/${slug}.json`;
    writeFileSync(join(repo, out), `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      `  ${report.status} on ${report.engine.model ?? FREE_DECIDER}: ${report.coverage.answered} answered, ${report.coverage.missing} missing, ${report.coverage.insufficientContext} insufficient context, ${report.coverage.unplannedClaims} unplanned; ${report.usage.requests} requests`,
    );
    for (const line of summary(pairs, report)) console.log(`  ${line}`);
    console.log(`  report: ${out}`);
    if (report.status !== 'complete') status = 3;
  }
  return status;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
