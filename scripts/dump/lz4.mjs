// LZ4 block format decoder (no frame): sequences of token, literals, offset, match.
// The dump stores each chunk as one raw LZ4 block (.scratch/wotr-planner/research/reading-the-dump.md).
export function lz4Block(src, out) {
  let s = 0,
    d = 0;
  const end = src.length;
  while (s < end) {
    const token = src[s++];
    let lit = token >>> 4;
    if (lit === 15) {
      let b;
      do {
        b = src[s++];
        lit += b;
      } while (b === 255);
    }
    out.set(src.subarray(s, s + lit), d);
    s += lit;
    d += lit;
    if (s >= end) break; // last sequence has literals only
    const off = src[s] | (src[s + 1] << 8);
    s += 2;
    let len = token & 15;
    if (len === 15) {
      let b;
      do {
        b = src[s++];
        len += b;
      } while (b === 255);
    }
    len += 4;
    let m = d - off;
    if (off >= len) {
      out.copyWithin(d, m, m + len);
      d += len;
    } else {
      for (let i = 0; i < len; i++) out[d++] = out[m++];
    }
  }
  return d;
}
