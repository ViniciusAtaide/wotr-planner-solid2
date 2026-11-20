import { fireEvent, render } from '@solidjs/testing-library';
import { flush } from 'solid-js';
import { describe, expect, test, vi } from 'vitest';

import CascadePreview from './CascadePreview';
import PickerOption from './PickerOption';

describe('<PickerOption />', () => {
  test('an open option is a button with ✓ Open, and picks on click', () => {
    const onPick = vi.fn();
    const { getByRole } = render(() => <PickerOption name="Power Attack" status="open" onPick={onPick} />);
    const option = getByRole('button', { name: /Power Attack/ });
    expect(option.tagName).toBe('BUTTON');
    expect(option).toHaveClass('ww-option');
    expect(option).toHaveTextContent('✓ Open');
    fireEvent.click(option);
    expect(onPick).toHaveBeenCalledOnce();
  });

  test('a closed option stays focusable, with ✕ Closed and its Refusal lines unchanged', () => {
    const { getByRole, container } = render(() => (
      <PickerOption name="Power Attack" status="closed" refusal={['Needs Strength 13 (yours: 10).', 'Needs Cleave.']} />
    ));
    const option = getByRole('button', { name: /Power Attack/ });
    expect(option.tagName).toBe('DIV');
    expect(option).toHaveClass('ww-option--closed');
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(option).toHaveAttribute('tabindex', '0');
    expect(option).toHaveTextContent('✕ Closed');
    const lines = [...container.querySelectorAll('.ww-refusal li')].map((li) => li.textContent);
    expect(lines).toEqual(['Needs Strength 13 (yours: 10).', 'Needs Cleave.']);
    expect(container.querySelector('.ww-refusal__have')).toHaveTextContent('(yours: 10)');
  });

  test('a gear-dependent option shows ◈ Gear beside ✓ Open, with R’s note', () => {
    const { container } = render(() => (
      <PickerOption
        name="Greater Two-Weapon Fighting"
        status="open"
        gear="Allowed only with the Gear counted: needs Belt of Incredible Dexterity +2."
      />
    ));
    const badges = [...container.querySelectorAll('.ww-badge')].map((b) => b.textContent);
    expect(badges).toEqual(['◈ Gear', '✓ Open']);
    expect(container.querySelector('.ww-refusal--gear')).toHaveTextContent(
      'Allowed only with the Gear counted: needs Belt of Incredible Dexterity +2.',
    );
  });
});

describe('<CascadePreview />', () => {
  const clears = [
    { name: 'Greater Spell Focus (Evocation)', place: 'Level 15' },
    { name: 'Spell Focus (Mythic)', place: 'Rank 8' },
  ];

  test('lists what it clears and names the count on its primary action', () => {
    const onConfirm = vi.fn();
    const { getByRole, container } = render(() => (
      <CascadePreview
        title="Swap Spell Focus"
        summary="Breaks 2 later picks. They'll be cleared, not moved."
        clears={clears}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />
    ));
    expect(getByRole('dialog', { name: 'Swap Spell Focus' })).toBeInTheDocument();
    expect([...container.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'Greater Spell Focus (Evocation)Level 15',
      'Spell Focus (Mythic)Rank 8',
    ]);
    fireEvent.click(getByRole('button', { name: 'Clear 2 picks and apply' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  test('Esc cancels', () => {
    const onCancel = vi.fn();
    const { getByRole } = render(() => (
      <CascadePreview title="Swap" summary="Breaks 2." clears={clears} onCancel={onCancel} onConfirm={() => {}} />
    ));
    flush();
    fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
