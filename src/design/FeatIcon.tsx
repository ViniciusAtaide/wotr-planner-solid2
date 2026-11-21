import type { JSX } from '@solidjs/web';

export type FeatCategory =
  | 'Weapon'
  | 'Ranged'
  | 'UnarmedCombat'
  | 'ArmourAndShield'
  | 'CombatManoeuvres'
  | 'MountedCombat'
  | 'Magic'
  | 'Skill'
  | 'Teamwork'
  | 'Racial'
  | 'Class'
  | 'Miscellaneous';

export const FEAT_CATEGORY_NAMES: Readonly<Record<FeatCategory, string>> = {
  Weapon: 'Weapon',
  Ranged: 'Ranged',
  UnarmedCombat: 'Unarmed Combat',
  ArmourAndShield: 'Armour and Shield',
  CombatManoeuvres: 'Combat Manoeuvres',
  MountedCombat: 'Mounted Combat',
  Magic: 'Magic',
  Skill: 'Skill',
  Teamwork: 'Teamwork',
  Racial: 'Racial',
  Class: 'Class',
  Miscellaneous: 'Miscellaneous',
};

const DRAWINGS: Readonly<Record<FeatCategory, () => JSX.Element>> = {
  Weapon: () => (
    <>
      <path d="M20 4v3L10 17l-3-3L17 4z" />
      <path d="M5 12l7 7M8.5 15.5 4 20" />
    </>
  ),
  Ranged: () => (
    <>
      <path d="M8 3c8 3 8 15 0 18" />
      <path d="M8 3l-3 9 3 9" />
      <path d="M5 12h16M21 12l-3-3M21 12l-3 3" />
    </>
  ),
  UnarmedCombat: () => (
    <>
      <path d="M6 11V8a1.5 1.5 0 0 1 3 0v2M9 10V7a1.5 1.5 0 0 1 3 0v3M12 10V7.5a1.5 1.5 0 0 1 3 0V10M15 10.5V9a1.5 1.5 0 0 1 3 0v4" />
      <path d="M6 11v3a6 6 0 0 0 12 0v-1" />
      <path d="M6 13h4.5a1.5 1.5 0 0 0 0-3H9" />
    </>
  ),
  ArmourAndShield: () => (
    <>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
      <path d="M12 6.5v11" />
    </>
  ),
  CombatManoeuvres: () => (
    <>
      <path d="M20 11A8 8 0 0 0 5.7 6.1M5 3v4h4" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9M19 21v-4h-4" />
    </>
  ),
  MountedCombat: () => (
    <>
      <path d="M7 20C4 17 3.5 9 6 6s9-4 12 0 2 11-1 14" />
      <circle class="ww-feat-icon__dot" cx="6.2" cy="15" r="1" />
      <circle class="ww-feat-icon__dot" cx="5.8" cy="10.5" r="1" />
      <circle class="ww-feat-icon__dot" cx="17.8" cy="15" r="1" />
      <circle class="ww-feat-icon__dot" cx="18.2" cy="10.5" r="1" />
    </>
  ),
  Magic: () => (
    <>
      <path d="M11 4c.6 4.8 3.2 7.4 8 8-4.8.6-7.4 3.2-8 8-.6-4.8-3.2-7.4-8-8 4.8-.6 7.4-3.2 8-8z" />
      <path d="M19 2v4M17 4h4" />
    </>
  ),
  Skill: () => (
    <>
      <path d="M20 3C11 4 6 10 6 18c6-1 11-6 14-15z" />
      <path d="M6 18l-2.5 3.5M10 14l5-5" />
    </>
  ),
  Teamwork: () => (
    <>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </>
  ),
  Racial: () => (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
  Class: () => (
    <>
      <path d="M6 3v18" />
      <path d="M6 4h12l-3 4 3 4H6" />
    </>
  ),
  Miscellaneous: () => (
    <>
      <path d="M7 4h10l4 5-9 11L3 9z" />
      <path d="M3 9h18M10 4 8.5 9 12 20l3.5-11L14 4" />
    </>
  ),
};

export interface FeatIconProps {
  readonly category: FeatCategory;
}

export default function FeatIcon(props: FeatIconProps) {
  return (
    <span class="ww-feat-icon" data-category={props.category}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {DRAWINGS[props.category]()}
      </svg>
    </span>
  );
}
