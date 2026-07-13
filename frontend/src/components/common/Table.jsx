// Komponen tabel generik dipakai di seluruh halaman kelola data (UC-01 s.d. UC-04, UC-06, UC-07)
export default function Table({ columns, data, renderActions, emptyMessage = 'Belum ada data.' }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', padding: 10, fontSize: 13 }}>
              {col.label}
            </th>
          ))}
          {renderActions && <th style={{ padding: 10, fontSize: 13 }}>Aksi</th>}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 && (
          <tr>
            <td colSpan={columns.length + (renderActions ? 1 : 0)} style={{ padding: 16, textAlign: 'center', color: '#666' }}>
              {emptyMessage}
            </td>
          </tr>
        )}
        {data.map((row, i) => (
          <tr key={row.id ?? i}>
            {columns.map((col) => (
              <td key={col.key} style={{ borderBottom: '1px solid #f1f1f1', padding: 10, fontSize: 13 }}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
            {renderActions && <td style={{ padding: 10 }}>{renderActions(row)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
