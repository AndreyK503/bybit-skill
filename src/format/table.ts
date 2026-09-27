/** Monospace table: columns padded to the widest cell, a dash separator under the header. From the t-invest reference. */
export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, col) => Math.max(header.length, ...rows.map((row) => (row[col] ?? '').length)));
  const renderRow = (cells: string[]): string => widths.map((width, col) => (cells[col] ?? '').padEnd(width)).join('  ');
  const lines = [renderRow(headers), widths.map((w) => '-'.repeat(w)).join('  ')];
  for (const row of rows) lines.push(renderRow(row));
  return lines.join('\n');
}
