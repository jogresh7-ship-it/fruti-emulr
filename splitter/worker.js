// Compresses 2 KB blocks of a PSP ISO for the CSO format (raw deflate per block).
// Message in:  { id, buf (ArrayBuffer, a whole number of blocks except maybe the last), sizesOnly }
// Message out: { id, sizes: [...], data: ArrayBuffer | null }  (size -1 = stored uncompressed)
importScripts("fflate.js");
var BS = 2048;
onmessage = function (e) {
  var m = e.data, src = new Uint8Array(m.buf), sizes = [], out = [], total = 0;
  for (var i = 0; i < src.length; i += BS) {
    var block = src.subarray(i, Math.min(i + BS, src.length));
    var c = fflate.deflateSync(block, { level: 9 });
    if (c.length >= block.length) { sizes.push(-1); if (!m.sizesOnly) out.push(block); total += block.length; }
    else { sizes.push(c.length); if (!m.sizesOnly) out.push(c); total += c.length; }
  }
  var data = null;
  if (!m.sizesOnly) {
    var d = new Uint8Array(total), p = 0;
    out.forEach(function (b) { d.set(b, p); p += b.length; });
    data = d.buffer;
  }
  postMessage({ id: m.id, sizes: sizes, data: data }, data ? [data] : []);
};
