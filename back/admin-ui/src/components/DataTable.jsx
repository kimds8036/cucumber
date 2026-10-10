export default function DataTable({ columns, rows, onRow, empty = '결과 없음' }) {
  return (
    <div className="console-table-wrap">
      <table className="console-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="console-table-empty">{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} onClick={onRow ? () => onRow(row) : undefined}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
