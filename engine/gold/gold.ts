import { childSlot, type Build, type Pick, type Place } from '../build';
import type { Attribute, Guid, StatType } from '../data';
import type { GrantParam } from '../grants';

export type Expect = { readonly fact: Guid; readonly param?: GrantParam } | { readonly increase: Attribute };

export interface GoldLine {
  readonly line: string;
  readonly expect: readonly Expect[];
  readonly secondBloodline?: true;
}

export interface GoldPlace {
  readonly place: Place;
  readonly class: string;
  readonly lines: readonly GoldLine[];
}

export interface Gold {
  readonly name: string;
  readonly build: Build;
  readonly start: {
    readonly race: string;
    readonly background: string;
    readonly attributes: Readonly<Record<Attribute, number>>;
    readonly skills: readonly StatType[];
    readonly alignments: NonNullable<Build['alignment']>[];
  };
  readonly places: readonly GoldPlace[];
}

export function pick(place: Place, selection: Guid, index: number, feature: Guid, param?: GrantParam): Pick {
  return { slot: { place, selection, index }, feature, ...(param && { param }) };
}

export function racePick(place: Place, selection: Guid, race: Guid, index: number, feature: Guid): Pick {
  return { slot: { place, selection, index, from: race }, feature };
}

export function chain(first: Pick, ...features: Guid[]): Pick[] {
  const out = [first];
  for (const feature of features) {
    const parent = out.at(-1) as Pick;
    out.push({ slot: childSlot(parent.slot, parent.feature), feature });
  }
  return out;
}

export function facts(line: string, ...guids: Guid[]): GoldLine {
  return { line, expect: guids.map((fact) => ({ fact })) };
}

export function withParam(line: string, fact: Guid, param: GrantParam): GoldLine {
  return { line, expect: [{ fact, param }] };
}

export function increase(line: string, attribute: Attribute): GoldLine {
  return { line, expect: [{ increase: attribute }] };
}

export function second(line: string, ...guids: Guid[]): GoldLine {
  return { ...facts(line, ...guids), secondBloodline: true };
}
