declare function apply(target: { style: Record<string, string> }, styles: Readonly<Record<string, string>>): void;

export function highlight(target: { style: Record<string, string> }, on: boolean): void {
  apply(target, on ? { outline: '2px solid currentColor' } : { outline: 'none' });
}

export const dim = (target: { style: Record<string, string> }): void => {
  apply(target, { opacity: '0.5' });
};
