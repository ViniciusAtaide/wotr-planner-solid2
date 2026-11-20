// Streaming .binz reader: one blueprint at a time, one decoded chunk in memory.
// Format: .scratch/wotr-planner/research/reading-the-dump.md. Blueprints live in chunks with id 33, sub id 0;
// each record is four varint-prefixed UTF-8 strings: GUID, name, full type name, JSON.
// The localised text lives in chunk 34 as one JSON object. Only the importer reads it, and only for display names
// (ADR 0006): no other string may leave the importer.
import { open } from 'node:fs/promises';
import { lz4Block } from './lz4.mjs';
const td = new TextDecoder('utf-8', { fatal: true });

function* records(buf, chunkIndex) {
  let p = 0;
  const str = () => {
    let len = 0,
      shift = 0,
      b;
    do {
      b = buf[p++];
      len |= (b & 0x7f) << shift;
      shift += 7;
    } while (b & 0x80);
    const s = p;
    p += len;
    return [s, len];
  };
  while (p < buf.length) {
    const g = str(),
      n = str(),
      t = str(),
      j = str();
    yield {
      chunk: chunkIndex,
      guid: td.decode(buf.subarray(g[0], g[0] + g[1])),
      name: td.decode(buf.subarray(n[0], n[0] + n[1])),
      type: td.decode(buf.subarray(t[0], t[0] + t[1])),
      jsonOffset: j[0],
      jsonLength: j[1],
      json: buf.subarray(j[0], j[0] + j[1]), // valid until the next chunk
    };
  }
}

/** Each wanted chunk's id, sub id and decoded payload. The payload is valid until the next chunk. */
async function* chunks(path, wanted) {
  const fh = await open(path);
  try {
    const size = (await fh.stat()).size;
    const hdr = Buffer.alloc(16);
    let pos = 0,
      out = Buffer.alloc(0),
      stored = Buffer.alloc(0);
    while (pos < size) {
      await fh.read(hdr, 0, 16, pos);
      const id = hdr.readUInt16LE(0),
        sub = hdr.readUInt16LE(2),
        len = hdr.readUInt32LE(4),
        comp = hdr.readUInt32LE(8);
      const onDisk = comp || len,
        start = pos + 16;
      pos = start + onDisk;
      if (!wanted(id, sub)) continue;
      if (stored.length < onDisk) stored = Buffer.alloc(onDisk);
      await fh.read(stored, 0, onDisk, start);
      let data;
      if (comp) {
        if (out.length < len) out = Buffer.allocUnsafe(len);
        const n = lz4Block(stored.subarray(0, comp), out);
        if (n !== len) throw new Error(`chunk at ${start - 16} decodes to ${n}, not ${len}`);
        data = out.subarray(0, len);
      } else data = stored.subarray(0, len);
      yield { id, sub, data };
    }
  } finally {
    await fh.close();
  }
}

export async function* blueprints(path, { want = () => true } = {}) {
  let chunkIndex = -1;
  for await (const { data } of chunks(path, (id, sub) => id === 33 && sub === 0)) {
    chunkIndex++;
    for (const r of records(data, chunkIndex)) if (want(r)) yield r;
  }
}

/** A .NET Guid.ToByteArray() as the dump's 32-hex text: the first three groups are little-endian. */
function dotnetGuid(b, at) {
  const hex = (i) => b[at + i].toString(16).padStart(2, '0');
  return [3, 2, 1, 0, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13, 14, 15].map(hex).join('');
}

/**
 * Every blueprint with the GUIDs of the blueprints that reference it, from the dump's own back-reference table
 * (chunk 33/1: per record, in the order of its 33/0 chunk, an i32 count and that many 16-byte .NET GUIDs).
 */
export async function* backReferences(path) {
  let guids = [];
  for await (const { sub, data } of chunks(path, (id, s) => id === 33 && (s === 0 || s === 1))) {
    if (sub === 0) {
      guids = [];
      for (const r of records(data, 0)) guids.push(r.guid);
      continue;
    }
    let p = 0;
    for (const guid of guids) {
      const n = data.readInt32LE(p);
      p += 4;
      const referrers = [];
      for (let i = 0; i < n; i++, p += 16) referrers.push(dotnetGuid(data, p));
      yield { guid, referrers };
    }
  }
}

/** The localised strings, keyed by localisation key (chunk 34/0, `{"$id", "strings": {...}}`). */
export async function strings(path) {
  for await (const { data } of chunks(path, (id, sub) => id === 34 && sub === 0)) {
    return new Map(Object.entries(JSON.parse(td.decode(data)).strings));
  }
  throw new Error(`${path} has no strings chunk`);
}
