import { Title } from '@solidjs/meta';
import type { JSX } from '@solidjs/web';
import { createSignal } from 'solid-js';

import Badge from './Badge';
import Button from './Button';
import CascadePreview from './CascadePreview';
import CompareToggle from './CompareToggle';
import Kbd from './Kbd';
import LevelRow, { Timeline } from './LevelRow';
import PickerOption, { ClosedCount, OptionList, PickerHead } from './PickerOption';
import PickerSheet from './PickerSheet';
import RankMarker from './RankMarker';
import ShareLink from './ShareLink';
import StatBlock from './StatBlock';

interface CardProps {
  readonly name: string;
  readonly about: string;
  readonly children: JSX.Element;
}

function Card(props: CardProps) {
  return (
    <section class="gallery__card" aria-label={props.name}>
      <h2>{props.name}</h2>
      <p>{props.about}</p>
      {props.children}
    </section>
  );
}

export function Gallery() {
  const [compare, setCompare] = createSignal('Build A');
  return (
    <main class="app-page">
      <Title>Design · Worldwound Planner</Title>
      <div class="gallery">
        <h1 class="title">Design</h1>

        <Card name="LevelRow" about="A level in the Timeline, with its class and picks.">
          <Timeline>
            <LevelRow
              level={3}
              characterClass="Fighter"
              detail="3rd level"
              picks={[{ slot: 'Feat', text: 'Power Attack' }]}
            />
            <LevelRow
              level={4}
              characterClass="Fighter"
              detail="4th level · Strength +1"
              active
              picks={[
                { slot: 'Bonus feat', text: 'Weapon Focus (Longsword)' },
                { slot: 'Feat', text: 'Two-Weapon Fighting', gear: true },
                { slot: 'Skills', text: '4 ranks to spend', empty: true },
              ]}
            />
          </Timeline>
        </Card>

        <Card name="RankMarker" about="A Mythic rank at its Rank level.">
          <Timeline>
            <LevelRow
              level={6}
              characterClass="Fighter"
              detail="6th level"
              picks={[{ slot: 'Bonus feat', text: 'Cleave' }]}
            />
            <RankMarker rank={1} path="Azata" expected={6} />
            <LevelRow level={7} characterClass="Fighter" detail="7th level" />
          </Timeline>
        </Card>

        <Card name="PickerOption" about="An option in the picker, open or closed.">
          <div>
            <PickerHead title="Bonus feat · Level 4" counts="212 open · 1,034 closed" />
            <OptionList>
              <PickerOption
                name="Weapon Focus (Longsword)"
                status="open"
                selected
                links="Enables Weapon Specialization (Longsword) → and 3 more"
              />
              <PickerOption
                name="Two-Weapon Fighting"
                status="open"
                gear="Counts Belt of Physical Might +4 toward Dexterity 15"
              />
              <PickerOption name="Cleave" status="closed" refusal={['Needs Power Attack. Opens at level 5.']} />
              <ClosedCount text="1,031 more closed: 812 need a feat, 140 need an ability score, 79 need a class" />
            </OptionList>
          </div>
        </Card>

        <Card name="Refusal" about="Why an option is closed, worded for this Build.">
          <OptionList>
            <PickerOption
              name="Greater Two-Weapon Fighting"
              status="closed"
              refusal={[
                'Needs Dexterity 19 (yours: 16)',
                'Needs Improved Two-Weapon Fighting.',
                'Needs base attack bonus +11 (yours: +4)',
              ]}
            />
            <PickerOption
              name="Dodge"
              status="closed"
              refusal={['Taking it breaks a later pick: Mobility at level 8 needs Dexterity 13 without your belt.']}
            />
          </OptionList>
        </Card>

        <Card name="Badge" about="Status and link chips.">
          <div class="gallery__row">
            <Badge kind="open" />
            <Badge kind="closed" />
            <Badge kind="gear" />
            <Badge kind="mythic" />
            <Badge kind="link">→ enables 3</Badge>
            <Badge kind="link">← needs Power Attack</Badge>
          </div>
        </Card>

        <Card name="PickerSheet" about="The picker as a full-screen sheet on a phone.">
          <div class="gallery__sheet">
            <PickerSheet title="Bonus feat · L4">
              <OptionList>
                <PickerOption name="Weapon Focus (Longsword)" status="open" selected />
                <PickerOption name="Power Attack" status="open" />
                <PickerOption name="Cleave" status="closed" refusal={['Needs Power Attack.']} />
              </OptionList>
            </PickerSheet>
          </div>
        </Card>

        <Card name="CascadePreview" about="What a Cascade edit will clear, before it applies.">
          <CascadePreview
            title="Swap Spell Focus"
            summary="Changing Spell Focus (Evocation) to Spell Focus (Conjuration) breaks 3 later picks. They'll be cleared, not moved."
            clears={[
              { name: 'Greater Spell Focus (Evocation)', place: 'Level 8' },
              { name: 'Spell Specialization (Fireball)', place: 'Level 9' },
              { name: 'Elemental Focus (Fire)', place: 'Level 11' },
            ]}
            onCancel={() => {}}
            onConfirm={() => {}}
            autofocus={false}
          />
        </Card>

        <Card name="Button" about="Actions.">
          <div class="gallery__row">
            <Button variant="primary">Apply</Button>
            <Button>Fork Build</Button>
            <Button variant="ghost" kbd="⌘Z">
              Undo
            </Button>
            <Button variant="danger">Clear level 4</Button>
            <Button disabled>Level up</Button>
          </div>
        </Card>

        <Card name="ShareLink" about="The Build's Share link.">
          <ShareLink state="ready" url="https://planner.example/#b=AQx3kLm9vQ2TzP8rY4cHf1W0aJd7sN" />
          <ShareLink state="making" />
        </Card>

        <Card name="CompareToggle" about="Switch between compared Builds.">
          <div>
            <CompareToggle segments={['Build A', 'Build B', 'Side by side']} value={compare()} onChange={setCompare} />
          </div>
        </Card>

        <Card name="StatBlock" about="Ability scores from the walk.">
          <StatBlock
            stats={[
              { name: 'STR', value: 18 },
              { name: 'DEX', value: 16, diff: true },
              { name: 'CON', value: 14 },
              { name: 'INT', value: 10 },
              { name: 'WIS', value: 12 },
              { name: 'CHA', value: 8 },
            ]}
          />
        </Card>

        <Card name="Kbd" about="Keyboard hints.">
          <div class="gallery__hints">
            <span>
              <Kbd>J</Kbd> <Kbd>K</Kbd> next and previous option
            </span>
            <span>
              <Kbd>↵</Kbd> pick
            </span>
            <span>
              <Kbd>/</Kbd> search
            </span>
            <span>
              <Kbd>⌘Z</Kbd> undo
            </span>
          </div>
        </Card>
      </div>
    </main>
  );
}
