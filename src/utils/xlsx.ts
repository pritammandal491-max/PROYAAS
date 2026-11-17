export async function parseXlsxRows(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer);
  const dv = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Invalid ZIP/XLSX container');
  const total = dv.getUint16(eocd + 10, true);
  let cd = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const entries: Record<string, { method: number; comp: number; lh: number }> = {};

  for (let i = 0; i < total; i++) {
    if (dv.getUint32(cd, true) !== 0x02014b50) break;
    const m = dv.getUint16(cd + 10, true);
    const cs = dv.getUint32(cd + 20, true);
    const nl = dv.getUint16(cd + 28, true);
    const el = dv.getUint16(cd + 30, true);
    const cl = dv.getUint16(cd + 32, true);
    const lh = dv.getUint32(cd + 42, true);
    entries[dec.decode(bytes.subarray(cd + 46, cd + 46 + nl))] = { method: m, comp: cs, lh };
    cd += 46 + nl + el + cl;
  }

  async function readEntry(fn: string): Promise<string | null> {
    const e = entries[fn];
    if (!e) return null;
    const s = e.lh + 30 + dv.getUint16(e.lh + 26, true) + dv.getUint16(e.lh + 28, true);
    const sl = bytes.subarray(s, s + e.comp);
    if (e.method === 0) return dec.decode(sl);
    if (e.method === 8) {
      return await new Response(
        new Blob([sl]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
      ).text();
    }
    throw new Error('Unsupported ZIP compression method');
  }

  const ss = await readEntry('xl/sharedStrings.xml');
  const shared: string[] = [];
  if (ss) {
    new DOMParser()
      .parseFromString(ss, 'application/xml')
      .querySelectorAll('si')
      .forEach((si) =>
        shared.push(
          Array.from(si.querySelectorAll('t'))
            .map((t) => t.textContent || '')
            .join('')
        )
      );
  }

  const sn =
    Object.keys(entries).find((k) => /^xl\/worksheets\/sheet1\.xml$/i.test(k)) ||
    Object.keys(entries).find((k) => /^xl\/worksheets\/sheet.*\.xml$/i.test(k));
  if (!sn) throw new Error('Worksheet XML not found');

  const sheetXml = await readEntry(sn);
  if (!sheetXml) throw new Error('Empty worksheet XML');

  const sDoc = new DOMParser().parseFromString(sheetXml, 'application/xml');
  const colIdx = (ref: string | null) => {
    let n = 0;
    for (const ch of (ref || '').replace(/[0-9]/g, '')) {
      n = n * 26 + (ch.charCodeAt(0) - 64);
    }
    return Math.max(0, n - 1);
  };

  const rows: string[][] = [];
  sDoc.querySelectorAll('sheetData > row').forEach((r) => {
    const arr: string[] = [];
    r.querySelectorAll('c').forEach((c) => {
      const t = c.getAttribute('t');
      const idx = colIdx(c.getAttribute('r'));
      if (t === 's') {
        const sIdx = Number(c.querySelector('v')?.textContent);
        arr[idx] = shared[sIdx] ?? '';
      } else if (t === 'inlineStr') {
        arr[idx] = Array.from(c.querySelectorAll('is t'))
          .map((x) => x.textContent || '')
          .join('');
      } else {
        arr[idx] = c.querySelector('v')?.textContent ?? '';
      }
    });
    rows.push(arr);
  });
  return rows;
}

export function buildZipBlob(
  files: { name: string; data: string }[],
  mimeType: string
): Blob {
  const enc = new TextEncoder();
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c >>> 0;
  }
  const crc32 = (b: Uint8Array) => {
    let c = 0xffffffff;
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const locals: ArrayBuffer[] = [];
  const centrals: ArrayBuffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nb = enc.encode(f.name);
    const dbB = enc.encode(f.data);
    const crc = crc32(dbB);

    const lh = new Uint8Array(30 + nb.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dbB.length, true);
    lv.setUint32(22, dbB.length, true);
    lv.setUint16(26, nb.length, true);
    lh.set(nb, 30);

    const ch = new Uint8Array(46 + nb.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dbB.length, true);
    cv.setUint32(24, dbB.length, true);
    cv.setUint16(28, nb.length, true);
    cv.setUint32(42, offset, true);
    ch.set(nb, 46);

    locals.push(lh.buffer.slice(0), dbB.buffer.slice(0));
    centrals.push(ch.buffer.slice(0));
    offset += lh.length + dbB.length;
  }

  const cdSize = centrals.reduce((s, b) => s + b.byteLength, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...locals, ...centrals, eocd.buffer.slice(0)], { type: mimeType });
}

export function exportSheetXLSX(
  sheetName: string,
  fileName: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const xmlEsc = (v: string | number) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const col = (i: number) => {
    let s = '';
    let n = i + 1;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const sheetRows = [headers, ...rows]
    .map(
      (r, ri) =>
        `<row r="${ri + 1}">${r
          .map((v, ci) => `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t>${xmlEsc(v)}</t></is></c>`)
          .join('')}</row>`
    )
    .join('');

  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEsc(
        sheetName
      )}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ];

  const blob = buildZipBlob(
    files,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
