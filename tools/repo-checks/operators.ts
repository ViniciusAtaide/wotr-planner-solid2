import { parseSync } from 'oxc-parser';
import { lineAt } from './comments';
import type { SourceFile } from './files';

export const DELIBERATE_DEFECTS: readonly string[] = ['.jev-lint/'];

type Node = Readonly<Record<string, unknown>>;

function isNode(value: unknown): value is Node {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function namesItsKey(left: unknown): boolean {
  if (!isNode(left)) return false;
  if (left.type === 'PrivateIdentifier') return true;
  return left.type === 'Literal' && (typeof left.value === 'string' || typeof left.value === 'number');
}

export function operatorProblems(files: readonly SourceFile[]): string[] {
  const problems: string[] = [];
  for (const file of files) {
    if (DELIBERATE_DEFECTS.some((dir) => file.path.startsWith(dir))) continue;
    const at = (node: Node) => `${file.path}:${lineAt(file.text, node.start as number)}`;
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
        return;
      }
      if (!isNode(value)) return;
      if (value.type === 'BinaryExpression' && value.operator === 'in' && !namesItsKey(value.left)) {
        problems.push(
          `${at(value)}: [computed-in] use Object.hasOwn(object, key), or a Map and .has(key): \`in\` also finds inherited keys such as constructor`,
        );
      }
      if (value.type === 'ForInStatement') {
        problems.push(
          `${at(value)}: [for-in] iterate Object.keys, Object.entries or a Map: for...in also visits inherited keys`,
        );
      }
      for (const child of Object.values(value)) visit(child);
    };
    visit(parseSync(file.path, file.text).program);
  }
  return problems;
}
