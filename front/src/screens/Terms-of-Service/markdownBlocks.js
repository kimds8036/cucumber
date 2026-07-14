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

function isTableHeaderRow(row) {
  if (!row?.length) return false;
  const first = row[0].replace(/\*\*/g, '').trim();
  return ['구분', '항목', '수탁자'].includes(first);
}

/** 표 행을 "레이블: 내용" 형식의 글머리 줄글로 변환 */
export function tableRowsToBulletLines(rows) {
  const dataRows =
    rows.length > 1 && isTableHeaderRow(rows[0]) ? rows.slice(1) : rows;

  return dataRows.map((row) => {
    const cols = row.filter((cell) => cell !== undefined && cell !== '');
    if (cols.length >= 3) {
      return `${cols[0]}: ${cols[1]}. 보유 및 이용 기간: ${cols[2]}`;
    }
    if (cols.length === 2) {
      return `${cols[0]}: ${cols[1]}`;
    }
    return cols.join(', ');
  });
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
      tableRowsToBulletLines(rows).forEach((bulletLine) => {
        blocks.push({ type: 'bullet', trimmed: bulletLine });
      });
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
