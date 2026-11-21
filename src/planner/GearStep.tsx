import { createMemo, createSignal, For, onSettled, Show, useContext } from 'solid-js';
import type { GearPlace } from '~engine/build';
import { isShown, type Guid } from '~engine/data';
import type { CheckedData } from '~engine/load';
import { nameOf } from '~engine/refusals';
import { PLACE_ITEM_TYPES } from '~engine/walk';

import { Button, OptionList, PickerOption } from '../design';
import { Filter, SCROLL_STYLE } from './ChoiceList';
import { OptionDetails, summaryFor, type OptionDetail } from './option-detail';
import type { TrailApi } from './steps';

export const PLACES = Object.keys(PLACE_ITEM_TYPES) as GearPlace[];
export const ITEMS_SHOWN = 60;

export function placeWords(p: GearPlace): string {
  return p.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
}

export function wornLine(data: CheckedData, gear: Readonly<Partial<Record<GearPlace, Guid>>> | undefined): string {
  const worn = PLACES.flatMap((p) => {
    const item = gear?.[p];
    return item === undefined ? [] : [nameOf(data, item)];
  });
  return worn.length === 0 ? 'Nothing worn' : worn.join(' · ');
}

export interface GearStepProps {
  readonly trail: TrailApi;
}

export function GearStep(props: GearStepProps) {
  const planner = () => props.trail.planner;
  const data = () => planner().engine.data;
  const [place, setPlace] = createSignal<GearPlace>('Armor');
  const [text, setText] = createSignal('');
  const gear = () => planner().build().gear ?? {};
  const items = createMemo(() => {
    const t = text().toLowerCase();
    return [...data().blueprints.values()]
      .filter(
        (bp) =>
          isShown(bp) &&
          PLACE_ITEM_TYPES[place()].includes(bp.$type) &&
          !data().twins.has(bp.guid) &&
          (t === '' || (bp.name ?? '').toLowerCase().includes(t)),
      )
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  });
  const summary = (item: Guid) => summaryFor(data(), planner().engine.G, item);
  const hub = useContext(OptionDetails);
  const findDetail = (key: string): OptionDetail | undefined =>
    data().blueprints.has(key)
      ? {
          name: nameOf(data(), key),
          closed: false,
          current: gear()[place()] === key,
          summary: summary(key),
          links: [],
          warnings: [],
          refusal: [],
        }
      : undefined;
  onSettled(() => hub?.resolve(findDetail));
  const wear = (item: Guid) => props.trail.edit({ kind: 'gear', place: place(), item }, `Wore ${nameOf(data(), item)}`);
  return (
    <div class="trail-step">
      <label class="trail-check">
        <input
          type="checkbox"
          checked={planner().build().countGear === true}
          onChange={(e) => {
            const el = e.currentTarget;
            props.trail.edit({ kind: 'countGear', on: el.checked }, 'Count Gear toward stat prerequisites');
            el.checked = planner().build().countGear === true;
          }}
        />
        <span>Count Gear toward stat prerequisites</span>
      </label>
      <div class="trail-places" role="group" aria-label="Gear places">
        <For each={PLACES}>
          {(p) => (
            <button
              type="button"
              class={[
                'trail-chip',
                { 'trail-chip--target': place() === p, 'trail-chip--empty': gear()[p] === undefined },
              ]}
              aria-pressed={place() === p ? 'true' : 'false'}
              onClick={() => {
                setPlace(p);
                setText('');
              }}
            >
              <small>{placeWords(p)}</small>
              {gear()[p] === undefined ? 'Nothing' : nameOf(data(), gear()[p] as Guid)}
            </button>
          )}
        </For>
      </div>
      <Show when={gear()[place()]}>
        {(item) => (
          <Button
            variant="danger"
            onClick={() => props.trail.edit({ kind: 'gear', place: place() }, `Took off ${nameOf(data(), item())}`)}
          >
            Take off {nameOf(data(), item())}
          </Button>
        )}
      </Show>
      <Show when={gear()[place()] && summary(gear()[place()] as Guid).text}>
        {(text) => <p class="trail-note trail-gear__worn">{text()}</p>}
      </Show>
      <Filter
        label={`Filter ${placeWords(place())} items by name`}
        value={text()}
        onInput={setText}
        onEnter={() => {
          const first = items()[0];
          if (first !== undefined) wear(first.guid);
        }}
      />
      <div class="trail-scroll trail-gear__items" style={SCROLL_STYLE}>
        <OptionList>
          <For each={items().slice(0, ITEMS_SHOWN)} keyed={(bp) => bp.guid}>
            {(item) => (
              <PickerOption
                name={item().name ?? item().assetName}
                status="open"
                selected={gear()[place()] === item().guid}
                summary={summary(item().guid).text}
                detailKey={item().guid}
                onPick={() => wear(item().guid)}
              />
            )}
          </For>
          <Show when={items().length > ITEMS_SHOWN}>
            <p class="trail-note">{items().length - ITEMS_SHOWN} more: type to narrow the list.</p>
          </Show>
        </OptionList>
      </div>
    </div>
  );
}
