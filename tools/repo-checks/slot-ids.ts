import { parseSync } from 'oxc-parser';
import { lineAt } from './comments';
import type { SourceFile } from './files';

type Node = Readonly<Record<string, unknown>>;

const SLOT_ID_KEYS: readonly string[] = ['place', 'selection', 'index'];

function isNode(value: unknown): value is Node {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keyName(property: unknown): string | undefined {
  if (!isNode(property) || property.type !== 'Property' || !isNode(property.key)) return undefined;
  const key = property.key;
  if (key.type === 'Identifier' && typeof key.name === 'string') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return undefined;
}

export function writesSlotIds(file: SourceFile): boolean {
  return file.path.startsWith('src/') && !/\.test\.tsx?$/.test(file.path);
}

export function slotIdProblems(files: readonly SourceFile[]): string[] {
  const problems: string[] = [];
  for (const file of files.filter(writesSlotIds)) {
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
        return;
      }
      if (!isNode(value)) return;
      if (value.type === 'ObjectExpression' && Array.isArray(value.properties)) {
        const keys = new Set(value.properties.map(keyName));
        if (SLOT_ID_KEYS.every((k) => keys.has(k)))
          problems.push(
            `${file.path}:${lineAt(file.text, value.start as number)}: [slot-id] build a slot id with ~engine/build's childSlot, or take it from the walk; src/ never writes one`,
          );
      }
      for (const child of Object.values(value)) visit(child);
    };
    visit(parseSync(file.path, file.text).program);
  }
  return problems;
}
