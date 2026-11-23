interface Args {
  readonly slot: string;
  readonly param?: Readonly<Record<string, unknown>>;
}

export function describeRequest(args: Args): string {
  const keys = args.param === undefined ? [] : Object.keys(args.param);
  return keys.length === 0 ? `pick at ${args.slot}` : `pick at ${args.slot} with ${keys.join(', ')}`;
}

export const refuseUnknownSlot = (args: Args, known: ReadonlySet<string>): { refused: string } | undefined =>
  known.has(args.slot) ? undefined : { refused: `No slot ${args.slot}; param ${JSON.stringify(args.param ?? {})}.` };
