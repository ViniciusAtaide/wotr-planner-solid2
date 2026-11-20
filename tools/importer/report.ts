// The importer's report (ticket 02, "The report lists"), written to data/report.md. It is deterministic like the
// data, so a rerun on the same dump leaves it unchanged. It holds asset names, counts and display names only.
import type { CheckedData } from '~engine/data/load';
import type { KeepSummary, Tally } from './import';
import type { GrantorCheck } from './grantors';
import { RESEARCH_COUNT, type ItemSource } from './items';
import { notNeeded, notNeededFamilies } from './not-needed';
import { gearSources, type GearNames, type GearSource } from './gear-names';
import { nameSources, type NameSource, type Qualified } from './qualify';
import { sharedNameExceptions } from './shared-names';

export interface ReportInput {
  readonly reached: number;
  readonly tally: Tally;
  /** The checked data, when the import passed its checks. */
  readonly data: CheckedData | undefined;
  readonly grantors: GrantorCheck | undefined;
  /** What the keep rule did, when the import got that far. */
  readonly keep: KeepSummary | undefined;
  /** The shared names and how each was qualified, when the data loaded. */
  readonly names?: Qualified | undefined;
  /** The Gear items' shared names, twins and how each was qualified, when the data loaded. */
  readonly gearNames?: GearNames | undefined;
}

const byKey = <T>(entries: Iterable<[string, T]>): [string, T][] =>
  [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

export function buildReport({ reached, tally, data, grantors, keep, names, gearNames }: ReportInput): string {
  const label = (guid: string) => {
    const bp = data?.blueprints.get(guid);
    return `${bp?.assetName ?? '?'} ${guid}${bp?.name === undefined ? '' : ` "${bp.name}"`}`;
  };
  const lines: string[] = ['# Importer report', '', 'Written by `bun run import`; do not edit.', ''];

  lines.push('## Blueprints', '', `${reached} blueprints are reachable from ProgressionRoot. Written, by kind:`, '');
  for (const [kind, n] of byKey(tally.written)) lines.push(`- ${kind}: ${n}`);

  if (keep !== undefined) {
    lines.push('', '## Items and the keep rule', '');
    lines.push(
      `The dump traces ${keep.sourced.size} equipment items to a source in play; the research counted ${RESEARCH_COUNT}`,
      '(map ticket 12, `obtainable-items.md`). By source, an item counted under each of its sources:',
      '',
    );
    const bySource = new Map<ItemSource, number>();
    for (const sources of keep.sourced.values()) for (const s of sources) bySource.set(s, (bySource.get(s) ?? 0) + 1);
    for (const [source, n] of byKey(bySource)) lines.push(`- ${source}: ${n}`);
    lines.push('', 'Added and removed by hand (`data/overrides/`, each with its reason):', '');
    for (const o of (data?.overrides ?? []).filter((o) => o.change === 'add' || o.change === 'remove')) {
      lines.push(`- ${o.change} ${o.change === 'remove' ? `${o.target} (not in data/)` : label(o.target)}`);
    }
    lines.push(
      '',
      `The keep rule kept ${keep.kept} of the ${keep.held} blueprints held before trimming and trimmed ${keep.held - keep.kept}:`,
      'what G reaches from the root and from the sourced items, plus what their kept fields name.',
    );
  }

  const unreviewed = byKey(tally.unlisted).filter(([type]) => !notNeeded.has(type));
  lines.push('', '## Component types the allowlist lacks', '');
  lines.push(
    'On written blueprints, by how many carry them. Each must be allowlisted or noted in `tools/importer/not-needed.ts`.',
    '',
  );
  if (unreviewed.length === 0) lines.push('None left to review.');
  for (const [type, owners] of unreviewed.sort((a, b) => b[1].size - a[1].size || (a[0] < b[0] ? -1 : 1))) {
    lines.push(`- ${type}: ${owners.size}`);
  }
  lines.push('', '### Reviewed as not needed', '');
  lines.push('By family, with the reason in `tools/importer/not-needed.ts`; each type with how many carry it.');
  for (const family of notNeededFamilies) {
    const counts = [...family.types].sort().map((type) => `${type} (${tally.unlisted.get(type)?.size ?? 0})`);
    lines.push('', `- **${family.title}** (${family.types.length}): ${counts.join(', ')}.`);
  }

  lines.push('', '## References dropped', '');
  lines.push(
    'References to blueprints the planner does not hold (abilities, buffs…). In a kept list the reference is dropped',
    '(counted by field); where it is what a grant gives or checks, the whole component is (counted by type).',
    '',
  );
  if (tally.dropped.size === 0) lines.push('None.');
  for (const [field, n] of byKey(tally.dropped)) lines.push(`- ${field}: ${n}`);

  lines.push('', '## Template names', '');
  lines.push('Names the game fills in at runtime, written in a neutral form (ADR 0006).', '');
  if (tally.templates.length === 0) lines.push('None.');
  for (const t of [...tally.templates].sort()) lines.push(`- ${t}`);

  if (names !== undefined && data !== undefined) lines.push(...sharedNames(names, data));
  if (gearNames !== undefined && data !== undefined) lines.push(...gearShared(gearNames, data));

  lines.push('', '## Defaults filled', '');
  lines.push(
    'Fields some blueprints omit, given their C# initializer (`orDefault` in the allowlist), by type and field.',
    '',
  );
  const defaulted = byKey(tally.fields).filter(([, c]) => c.defaulted > 0 && c.present > 0);
  if (defaulted.length === 0) lines.push('None.');
  for (const [key, c] of defaulted) lines.push(`- ${key}: ${c.defaulted} of ${c.defaulted + c.present}`);

  if (grantors !== undefined) {
    lines.push('', '## Prerequisites with no grantor', '');
    lines.push(
      'Facts that a requiring leaf on a reachable blueprint names, which no grant G holds gives, with the reason.',
      '',
    );
    if (grantors.findings.length === 0) lines.push('None.');
    for (const f of grantors.findings) {
      lines.push(`- ${label(f.fact)}, needed by ${f.neededBy.map(label).join('; ')}: ${f.reason ?? 'NO REASON'}`);
    }
    lines.push('', '## Prerequisites naming a fact no Build can reach', '');
    lines.push(
      'Facts that a leaf on a reachable blueprint names, which G reaches neither from the root nor from the sourced',
      'items, with the reason. A leaf forbidding one is always met.',
      '',
    );
    if (grantors.unreachable.length === 0) lines.push('None.');
    for (const f of grantors.unreachable) {
      lines.push(`- ${label(f.fact)}, named by ${f.neededBy.map(label).join('; ')}: ${f.reason ?? 'NO REASON'}`);
    }
    lines.push('', '## Nameless prerequisites with no named grantor', '');
    lines.push('A Refusal words these by a readable asset name, marked as internal (map ticket 19).', '');
    if (grantors.namelessWithoutNamedGrantor.length === 0) lines.push('None.');
    for (const n of grantors.namelessWithoutNamedGrantor) {
      lines.push(`- ${label(n.fact)}, named by ${n.neededBy.map(label).join('; ')}`);
    }
  }

  if (data !== undefined) {
    lines.push('', '## Feats whose parameter is a spell', '');
    lines.push('Out of v1 until phase 2 brings spells (map ticket 22): held, but offered with no parameter.', '');
    const spellFeats = [...data.blueprints.values()]
      .filter((b) => b.$type === 'BlueprintParametrizedFeature')
      .filter((b) => b.ParameterType === 'SpellSpecialization' || b.ParameterType === 'LearnSpell')
      .sort((a, b) => (a.assetName < b.assetName ? -1 : a.assetName > b.assetName ? 1 : 0));
    for (const b of spellFeats)
      lines.push(`- ${label(b.guid)} (${b.$type === 'BlueprintParametrizedFeature' ? b.ParameterType : ''})`);
  }

  return `${lines.join('\n')}\n`;
}

/** The shared-names section (build ticket 02c): counts by source, the exceptions, and every group. */
function sharedNames(names: Qualified, data: CheckedData): string[] {
  const asset = (guid: string) => data.blueprints.get(guid)?.assetName ?? '?';
  const members = names.groups.flatMap((g) => g.members);
  const count = (source: NameSource | undefined) => members.filter((m) => m.source === source).length;
  const lines = ['', '## Shared names', ''];
  lines.push(
    `${names.groups.length} display names are shared by ${members.length} blueprints a Build can reach and a player`,
    'sees, features only Gear gives among them. Each is qualified from the first source that tells it apart (map',
    'tickets 27, 29 and 30); one in a group may stay bare. A grantor or level qualifies only when every route to the',
    'blueprint passes through it, and no label names one grantor among several. Blueprints settled, by source:',
    '',
  );
  for (const source of nameSources) lines.push(`- ${source}: ${count(source)}`);
  lines.push(`- open: ${count(undefined)}`);

  lines.push('', '### Names still shared', '');
  lines.push('Each with why both stay (`tools/importer/shared-names.ts`).', '');
  if (names.collisions.size === 0) lines.push('None.');
  for (const [name, guids] of names.collisions) {
    const by = guids.map((g) => `${asset(g)} ${g}`).join(', ');
    lines.push(`- "${name}": ${by}: ${sharedNameExceptions.get(name) ?? 'NO REASON'}`);
  }

  lines.push('', '### Groups whose blueprints share an asset name too', '');
  const sameAsset = names.groups.filter((g) => new Set(g.members.map((m) => asset(m.guid))).size < g.members.length);
  if (sameAsset.length === 0) lines.push('None.');
  for (const g of sameAsset) lines.push(`- "${g.name}"`);

  lines.push('', '### Every group', '');
  lines.push('Each blueprint with the source that settled it and its written name.', '');
  for (const g of names.groups) {
    lines.push(`- "${g.name}" (${g.members.length})`);
    for (const m of g.members) {
      const written = names.names.get(m.guid) ?? g.name;
      lines.push(`  - ${asset(m.guid)} ${m.guid}: ${m.source ?? 'OPEN'}, "${written}"`);
    }
  }
  return lines;
}

/** The Gear section (map ticket 29, build ticket 02f): counts by rule, the twins, and every group of items. */
function gearShared(gear: GearNames, data: CheckedData): string[] {
  const asset = (guid: string) => data.blueprints.get(guid)?.assetName ?? '?';
  const members = gear.groups.flatMap((g) => g.members);
  const count = (source: GearSource | undefined) => members.filter((m) => m.source === source).length;
  const lines = ['', '## Shared Gear names', ''];
  lines.push(
    `${gear.groups.length} display names are shared by ${members.length} items a Build can equip. Twins collapse into`,
    'one choice (the loader derives them: `CheckedData.twins`); each other item is qualified by the first rule that',
    'tells it apart (map ticket 29); one in a group may stay bare. Items settled, by rule:',
    '',
  );
  for (const source of gearSources) lines.push(`- ${source}: ${count(source)}`);
  lines.push(`- open: ${count(undefined)}`);
  lines.push('', '### Every group', '');
  lines.push('Each item with the rule that settled it and its written name; a twin names the item offered for it.', '');
  for (const g of gear.groups) {
    lines.push(`- "${g.name}" (${g.members.length})`);
    for (const m of g.members) {
      const written = gear.names.get(m.guid) ?? g.name;
      const twin = m.twinOf === undefined ? '' : `, offered as ${asset(m.twinOf)} ${m.twinOf}`;
      lines.push(`  - ${asset(m.guid)} ${m.guid}: ${m.source ?? 'OPEN'}, "${written}"${twin}`);
    }
  }
  return lines;
}
