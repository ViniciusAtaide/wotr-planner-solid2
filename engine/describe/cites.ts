import type { Cites } from '../cite';

export const cites = {
  RANK_SCALED: [
    'Designers/Mechanics/Facts/ACBonusAgainstFactOwner.cs OnEventAboutToTrigger (Bonus)',
    'Designers/Mechanics/Facts/SavingThrowBonusAgainstFact.cs OnEventAboutToTrigger (Value)',
    'Designers/Mechanics/Facts/SavingThrowBonusAgainstDescriptor.cs OnEventAboutToTrigger (Value)',
    'Designers/Mechanics/Facts/WeaponGroupAttackBonus.cs OnEventAboutToTrigger (AttackBonus)',
    'Designers/Mechanics/Facts/ManeuverDefenceBonus.cs OnEventAboutToTrigger (Bonus)',
    'Designers/Mechanics/Facts/Blindsense.cs OnTurnOn (Range)',
    'UnitLogic/FactLogic/AddDamageResistanceEnergy.cs CalculateValue',
  ],
  labelOf: [
    'Designers/Mechanics/Facts/DraconicBloodlineArcana.cs OnEventAboutToTrigger (SpellDescriptor, SpellsOnly, UseContextBonus, Value)',
    'Designers/Mechanics/Facts/SpellSpecializationParametrized.cs OnEventAboutToTrigger',
    'Designers/Mechanics/Facts/WeaponFocusParametrized.cs OnEventAboutToTrigger (m_MythicFocus)',
    'Designers/Mechanics/Facts/WeaponSpecializationParametrized.cs OnEventAboutToTrigger (Mythic)',
    'Designers/Mechanics/Facts/ImprovedCriticalParametrized.cs OnEventAboutToTrigger',
    'UnitLogic/FactLogic/AddEnergyVulnerability.cs OnEventAboutToTrigger (Type)',
    'Designers/Mechanics/Facts/ImprovedEvasion.cs OnEventAboutToTrigger (SavingThrow)',
    'Designers/Mechanics/Facts/WeaponTypeDamageStatReplacement.cs OnEventAboutToTrigger (Stat, Category, OnlyOneHanded)',
    'Designers/Mechanics/Facts/ArcaneSpellFailureIncrease.cs OnEventAboutToTrigger (Bonus, ToShield, Universal)',
    'Designers/Mechanics/Facts/ManeuverBonus.cs OnEventAboutToTrigger (Mythic)',
  ],
} satisfies Cites;
