import type { Guid } from '~engine/data';
import type { CheckedData } from '~engine/load';
import type { OptionStatus } from '~engine/pickers';

import { matches } from './ChoiceList';

export type PickRow =
  | { readonly kind: 'option'; readonly key: string; readonly name: string; readonly option: OptionStatus }
  | {
      readonly kind: 'params';
      readonly key: string;
      readonly name: string;
      readonly feature: Guid;
      readonly options: readonly OptionStatus[];
    }
  | { readonly kind: 'nested'; readonly key: string; readonly name: string; readonly option: OptionStatus };

export function optionKey(o: OptionStatus): string {
  return `${o.feature} ${JSON.stringify(o.param ?? null)}`;
}

export function opensSelection(data: CheckedData, o: OptionStatus): boolean {
  return o.param === undefined && data.blueprints.get(o.feature)?.$type === 'BlueprintFeatureSelection';
}

export interface RowNames {
  readonly option: (o: OptionStatus) => string;
  readonly group: (o: OptionStatus) => string;
}

export function pickRows(
  data: CheckedData,
  options: readonly OptionStatus[],
  names: RowNames,
  text: string,
): PickRow[] {
  const shown = options.filter((o) => o.shown);
  const byFeature = new Map<Guid, OptionStatus[]>();
  for (const o of shown) {
    if (o.param !== undefined) byFeature.set(o.feature, [...(byFeature.get(o.feature) ?? []), o]);
  }
  const rows: PickRow[] = [];
  const grouped = new Set<Guid>();
  for (const o of shown) {
    if (o.param !== undefined) {
      if (grouped.has(o.feature)) continue;
      grouped.add(o.feature);
      const members = byFeature.get(o.feature) ?? [];
      const name = names.group(o);
      const kept = matches(name, text) ? members : members.filter((m) => matches(names.option(m), text));
      if (kept.length > 0)
        rows.push({ kind: 'params', key: `params ${o.feature}`, name, feature: o.feature, options: kept });
      continue;
    }
    const name = names.option(o);
    if (!matches(name, text)) continue;
    rows.push(
      opensSelection(data, o)
        ? { kind: 'nested', key: `nested ${o.feature}`, name, option: o }
        : { kind: 'option', key: optionKey(o), name, option: o },
    );
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function rowOpen(row: PickRow): boolean {
  return row.kind === 'params' ? row.options.some((o) => o.closed === undefined) : row.option.closed === undefined;
}

export function rowMembers(row: PickRow): readonly OptionStatus[] {
  return row.kind === 'params' ? row.options : [row.option];
}
