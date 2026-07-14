const TABLE_SEPARATOR = /^\|(\s*:?-+:?\s*\|)+$/;

export function isTableSeparator(line) {
  return TABLE_SEPARATOR.test(line.trim());
}

export function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function collectTableRows(lines, startIndex) {
  const rows = [];
  let i = startIndex;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('|')) break;
    if (isTableSeparator(trimmed)) {
      i += 1;
      continue;
    }
    rows.push(parseTableRow(lines[i]));
    i += 1;
  }
  return { rows, nextIndex: i };
}

/** @deprecated 표는 table 블록으로 렌더 — 호환용 유지 */
export function tableRowsToBulletLines(rows) {
  return rows.map((row) => row.filter(Boolean).join(': '));
}

export function groupMarkdownBlocks(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (isTableSeparator(trimmed)) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith('|')) {
      const { rows, nextIndex } = collectTableRows(lines, i);
      if (rows.length > 0) {
        blocks.push({ type: 'table', rows });
      }
      i = nextIndex;
      continue;
    }
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length) {
        const q = lines[i].trim();
        if (!q.startsWith('>')) break;
        const inner = q.replace(/^>\s?/, '').trim();
        if (inner) quoteLines.push(inner);
        i += 1;
      }
      if (quoteLines.length > 0) {
        blocks.push({ type: 'blockquote', trimmed: quoteLines.join('\n') });
      }
      continue;
    }
    if (/^-\s+/.test(line)) {
      const indent = line.match(/^\s*/)[0].length;
      const isNested = indent >= 4;
      blocks.push({
        type: isNested ? 'bulletNested' : 'bullet',
        trimmed: trimmed.replace(/^-\s+/, ''),
      });
      i += 1;
      continue;
    }
    blocks.push({ type: 'line', trimmed });
    i += 1;
  }
  return blocks;
}
