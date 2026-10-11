import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export async function exportPdf(bytes, items, geometries) {
  const doc = await PDFDocument.load(bytes);
  const fonts = {};
  for (const name of ['Helvetica', 'TimesRoman', 'Courier']) fonts[name] = await doc.embedFont(StandardFonts[name]);
  for (const item of items) {
    if (item.type === 'text' && !item.text.trim()) continue;
    const page = doc.getPage(item.page - 1);
    const g = geometries[item.page];
    const scale = g.width;
    const left = item.x * scale, top = item.y * g.height;
    const height = item.h * g.height;
    // Map display coordinates back into the original, possibly rotated PDF.
    const angle = ((page.getRotation().angle % 360) + 360) % 360;
    const box = page.getCropBox();
    const map = (x, y) => {
      if (angle === 90) return { x: box.x + y, y: box.y + x };
      if (angle === 180) return { x: box.x + box.width - x, y: box.y + y };
      if (angle === 270) return { x: box.x + box.width - y, y: box.y + box.height - x };
      return { x: box.x + x, y: box.y + box.height - y };
    };
    if (item.type === 'signature') {
      const image = await doc.embedPng(item.data);
      page.drawImage(image, { ...map(left, top + height), width: item.w * scale, height, rotate: degrees(angle) });
    } else {
      const size = item.size * scale;
      const font = fonts[item.font || 'Helvetica'];
      for (const [index, line] of item.text.split('\n').entries()) {
        page.drawText(line, { ...map(left, top + size * (0.92 + index * (item.lineHeight || 1.2))), size, font, color: rgb(0.08, 0.12, 0.18), rotate: degrees(angle) });
      }
    }
  }
  return doc.save();
}
