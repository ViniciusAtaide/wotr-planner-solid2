import { parseSync } from 'oxc-parser';
import {
  parseRelationInput,
  relationDigest,
  type RelationEvidence,
  type RelationInput,
  type RelationSubject,
  type SpecClaim,
  type SpecSource,
} from 'jev-lint/relations';
import { parseCite, type Cites } from '~engine/cite';
import { memberSpans, typeSpan, type Sources, type Span } from '../decompiled';

export const DECOMPILED_ROOT = 'decompiled/Assembly-CSharp/Kingmaker/';
export const REPOSITORY = 'local/wotr-planner';

const MAX_SOURCE_CHARS = 128_000;
const MAX_EVIDENCE = 20;
const MAX_HELPERS = 5;
const MAX_HELPER_CHARS = 16_000;

export interface FeatureFile {
  readonly path: string;
  readonly text: string;
}

export interface PortFeature {
  readonly feature: string;
  readonly cites: Cites;
  readonly files: readonly FeatureFile[];
  readonly readme: FeatureFile;
}

export interface Unpaired {
  readonly key: string;
  readonly cite: string;
  readonly reason: string;
}

export interface PairLabel {
  readonly key: string;
  readonly cite: string;
  readonly target: string;
}

export interface PortPairs {
  readonly input: RelationInput;
  readonly unpaired: readonly Unpaired[];
  readonly labels: ReadonlyMap<string, PairLabel>;
}

type Node = Readonly<Record<string, unknown>>;

function isNode(value: unknown): value is Node {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nameOf(node: unknown): string | undefined {
  if (!isNode(node)) return undefined;
  if (node.type === 'Identifier' && typeof node.name === 'string') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return undefined;
}

function spanOf(node: Node): Span {
  return { start: node.start as number, end: node.end as number };
}

function unwrap(node: unknown): unknown {
  let current = node;
  while (isNode(current) && (current.type === 'TSSatisfiesExpression' || current.type === 'TSAsExpression')) {
    current = current.expression;
  }
  return current;
}

interface Declared {
  readonly span: Span;
  readonly node: unknown;
}

function topLevel(program: Node): Map<string, Declared> {
  const declared = new Map<string, Declared>();
  for (const statement of (program.body as unknown[]) ?? []) {
    if (!isNode(statement)) continue;
    const decl = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (!isNode(decl)) continue;
    const span = spanOf(statement);
    if (decl.type === 'VariableDeclaration') {
      for (const d of (decl.declarations as unknown[]) ?? []) {
        if (!isNode(d)) continue;
        const name = nameOf(d.id);
        if (name !== undefined) declared.set(name, { span, node: unwrap(d.init) });
      }
      continue;
    }
    const name = nameOf(decl.id);
    if (name !== undefined) declared.set(name, { span, node: decl });
  }
  return declared;
}

function membersOf(node: unknown): Map<string, Declared> {
  const members = new Map<string, Declared>();
  if (!isNode(node)) return members;
  const add = (list: unknown, keyField: 'key' | 'id') => {
    for (const member of Array.isArray(list) ? list : []) {
      if (!isNode(member)) continue;
      const name = nameOf(member[keyField]);
      if (name !== undefined) members.set(name, { span: spanOf(member), node: unwrap(member.value ?? member) });
    }
  };
  if (node.type === 'ObjectExpression') add(node.properties, 'key');
  if (node.type === 'TSInterfaceDeclaration' && isNode(node.body)) add(node.body.body, 'key');
  if (node.type === 'TSTypeAliasDeclaration' && isNode(node.typeAnnotation)) add(node.typeAnnotation.members, 'key');
  if (node.type === 'ClassDeclaration' && isNode(node.body)) add(node.body.body, 'key');
  if (node.type === 'TSEnumDeclaration') add(isNode(node.body) ? node.body.members : node.members, 'id');
  return members;
}

function lineOf(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function excerpt(sourceId: string, text: string, span: Span): RelationEvidence {
  const startLine = lineOf(text, span.start);
  const endLine = lineOf(text, Math.max(span.start, span.end - 1));
  const quote = text
    .split('\n')
    .slice(startLine - 1, endLine)
    .join('\n');
  return { sourceId, startLine, endLine, quote };
}

function helperSpans(text: string, cited: readonly Span[], method: string): Span[] {
  const called = new Set<string>();
  for (const s of cited) {
    for (const m of text.slice(s.start, s.end).matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) {
      if (m[1] !== undefined && m[1] !== method) called.add(m[1]);
    }
  }
  const helpers: Span[] = [];
  let size = 0;
  for (const name of [...called].sort()) {
    for (const span of memberSpans(text, name)) {
      if (cited.some((c) => span.start >= c.start && span.end <= c.end)) continue;
      if (helpers.length >= MAX_HELPERS || size + (span.end - span.start) > MAX_HELPER_CHARS) return helpers;
      helpers.push(span);
      size += span.end - span.start;
    }
  }
  return helpers;
}

function portHelperSpans(text: string, target: Span, declared: ReadonlyMap<string, Declared>): Span[] {
  const called = new Set<string>();
  for (const m of text.slice(target.start, target.end).matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (m[1] !== undefined) called.add(m[1]);
  }
  const helpers: Span[] = [];
  let size = 0;
  for (const name of [...called].sort()) {
    const found = declared.get(name);
    if (found === undefined || (found.span.start <= target.start && found.span.end >= target.end)) continue;
    if (helpers.some((h) => h.start === found.span.start)) continue;
    if (helpers.length >= MAX_HELPERS || size + (found.span.end - found.span.start) > MAX_HELPER_CHARS) break;
    helpers.push(found.span);
    size += found.span.end - found.span.start;
  }
  return helpers.sort((a, b) => a.start - b.start);
}

function statementFor(
  feature: string,
  key: string,
  targetPath: string,
  file: string,
  method: string,
  fields: readonly string[],
  isType: boolean,
): string {
  if (isType) {
    return `${key} in ${feature} (${targetPath}) follows ${method}, declared in ${file}: the values, fields and meanings it takes from that type agree with the declaration.`;
  }
  const inputs = fields.length === 0 ? 'its inputs' : `the fields ${fields.join(', ')}`;
  return `${key} in ${feature} (${targetPath}) ports ${method} in ${file}: every condition, comparison, negation and default that ${method} applies to ${inputs} keeps the same meaning in the port, applied there or carried in its result for the step that applies it, as the feature's README describes.`;
}

function claimId(key: string, index: number): string {
  return `${key.replace(/[^\w.-]/g, '-')}.${index}`;
}

export function portPairs(feature: PortFeature, sources: Sources, sha: string, runId: string): PortPairs {
  const specSources = new Map<string, SpecSource>();
  const sourceId = (path: string, kind: SpecSource['kind'], authority: SpecSource['authority'], content: string) => {
    const known = specSources.get(path);
    if (known !== undefined) return known.id;
    const id = `s${specSources.size}`;
    specSources.set(path, {
      id,
      path,
      ref: sha,
      kind,
      authority,
      content,
      contentHash: relationDigest(content),
      scope: [],
      approval: null,
    });
    return id;
  };
  const readmeId = sourceId(feature.readme.path, 'documentation', 'reference', feature.readme.text);
  const readmeEvidence = excerpt(readmeId, feature.readme.text, { start: 0, end: feature.readme.text.length });
  const declarations = feature.files.map((file) => ({
    file,
    declared: topLevel(parseSync(file.path, file.text).program as unknown as Node),
  }));
  const resolve = (
    key: string,
  ): { file: FeatureFile; span: Span; declared: ReadonlyMap<string, Declared> } | undefined => {
    const [first, ...rest] = key.split('.');
    for (const { file, declared } of declarations) {
      let found = first === undefined ? undefined : declared.get(first);
      for (const segment of rest) found = found === undefined ? undefined : membersOf(found.node).get(segment);
      if (found !== undefined) return { file, span: found.span, declared };
    }
    return undefined;
  };

  const claims: SpecClaim[] = [];
  const expectedClaimIds: string[] = [];
  const relations: RelationSubject[] = [];
  const unpaired: Unpaired[] = [];
  const labels = new Map<string, PairLabel>();
  for (const [key, list] of Object.entries(feature.cites)) {
    const target = resolve(key);
    list.forEach((cite, index) => {
      const id = claimId(key, index);
      expectedClaimIds.push(id);
      const { file, method, fields } = parseCite(cite);
      const text = sources.file(file);
      if (text === undefined)
        return void unpaired.push({ key, cite, reason: `no file ${file} under ${DECOMPILED_ROOT}` });
      if (text.length > MAX_SOURCE_CHARS) {
        return void unpaired.push({ key, cite, reason: `${file} is over ${MAX_SOURCE_CHARS} characters` });
      }
      const type = typeSpan(text, method);
      const spans = type === undefined ? memberSpans(text, method).slice(0, MAX_EVIDENCE) : [type];
      if (spans.length === 0) return void unpaired.push({ key, cite, reason: `${file} declares no ${method}` });
      const csId = sourceId(DECOMPILED_ROOT + file, 'code', 'observed', text);
      const targetPath = target === undefined ? 'unresolved' : target.file.path;
      claims.push({
        id,
        statement: statementFor(feature.feature, key, targetPath, file, method, fields, type !== undefined),
        evidence: spans.map((s) => excerpt(csId, text, s)),
      });
      if (target === undefined) {
        return void unpaired.push({ key, cite, reason: `no declaration in ${feature.feature} for ${key}` });
      }
      const tsId = sourceId(target.file.path, 'code', 'observed', target.file.text);
      const targetEvidence = excerpt(tsId, target.file.text, target.span);
      const helpers = type === undefined ? helperSpans(text, spans, method) : [];
      const portHelpers = portHelperSpans(target.file.text, target.span, target.declared);
      const relationId = `${id}.port`;
      relations.push({
        id: relationId,
        subject: 'relation',
        claimId: id,
        targets: [targetEvidence],
        context: [
          readmeEvidence,
          ...helpers.map((s) => excerpt(csId, text, s)),
          ...portHelpers.map((s) => excerpt(tsId, target.file.text, s)),
        ],
      });
      labels.set(relationId, { key, cite, target: `${target.file.path}:${targetEvidence.startLine}` });
    });
  }

  const input = parseRelationInput({
    schema: 'jev-lint-relations-input-1',
    repository: REPOSITORY,
    sourceSha: sha,
    runId,
    sources: [...specSources.values()],
    claims,
    expectedClaimIds,
    relations,
  });
  return { input, unpaired, labels };
}
