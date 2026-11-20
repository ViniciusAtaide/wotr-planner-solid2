// The basic description (build ticket 05), until ticket 06's Summaries exist: what the data says of a blueprint in our
// own words. Its name, its prerequisites (worded by R), what it grants, where it can be picked, and its chain links.
// Never game text (ADR 0001, 0006).
import type { CheckedData } from './data/load';
import { isShown, kindOf, type Guid, type Kind } from './data/types';
import { buildGrantIndex, removes, type GrantIndex } from './grants';
import { linkIndex } from './links';
import { prerequisites } from './prerequisites';
import { nameOf, unmetText } from './refusals';

/** One blueprint, described. */
export interface Description {
  readonly guid: Guid;
  readonly name: string;
  readonly kind: Kind;
  /** The Summary, once ticket 06 writes it. */
  readonly summary: string;
  /** Each prerequisite, worded. */
  readonly prerequisites: readonly string[];
  /** The shown facts it grants, each with the level it grants it at when it says so. */
  readonly grants: readonly { readonly guid: Guid; readonly name: string; readonly level?: number }[];
  /** Where it can be picked: the shown selections that list it. */
  readonly pickedIn: readonly { readonly guid: Guid; readonly name: string }[];
  /** Its prerequisite-chain links (map 09). */
  readonly needs: readonly Guid[];
  readonly enables: readonly Guid[];
}

/** The placeholder until a Summary is written. */
export const NO_SUMMARY = 'No summary yet.';

/** A blueprint's basic description; undefined when the data doesn't hold it or the game never shows it (map 19). */
export function describe(
  data: CheckedData,
  guid: Guid,
  G: GrantIndex = buildGrantIndex(data),
): Description | undefined {
  const bp = data.blueprints.get(guid);
  if (bp === undefined || !isShown(bp)) return undefined;
  const shown = (g: Guid) => {
    const b = data.blueprints.get(g);
    return b !== undefined && isShown(b);
  };
  const w = { data, G };
  const links = linkIndex(data, G);
  return {
    guid,
    name: nameOf(data, guid),
    kind: kindOf[bp.$type],
    summary: NO_SUMMARY,
    prerequisites: prerequisites(bp, data.blueprints).map((leaf) =>
      unmetText(w, { leaf }).replace(/^Needs /, leaf.Group === 'All' ? 'Needs ' : 'Or: needs '),
    ),
    grants: G.grantsOf(guid)
      .filter((g) => !removes(g) && shown(g.granted) && g.kind !== 'selectionOption' && g.kind !== 'classArchetype')
      .map((g) => ({
        guid: g.granted,
        name: nameOf(data, g.granted),
        ...(g.level !== undefined && { level: g.level }),
      })),
    pickedIn: [
      ...new Map(
        G.grantorsOf(guid)
          .filter((g) => g.kind === 'selectionOption' && shown(g.grantor))
          .map((g) => [g.grantor, { guid: g.grantor, name: nameOf(data, g.grantor) }]),
      ).values(),
    ],
    needs: links.needs(guid),
    enables: links.enables(guid),
  };
}
