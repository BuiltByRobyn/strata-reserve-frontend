import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';
import type { Column, DataTableProps } from '../../types/component.types';

export type { Column };

export function DataTable<T>({
  title,
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  actions,
  actionsColumnHeader = 'Edit'
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (data.length === 0) {
    return (
      <div className="data-table-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const colCount = columns.length + (actions ? 1 : 0);

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          {title ? (
            <tr>
              <th colSpan={colCount} className="data-table-title">
                {title}
              </th>
            </tr>
          ) : (
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
              ))}
              {actions && <th className="actions-column">{actionsColumnHeader}</th>}
            </tr>
          )}
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
              {actions && (
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  {actions(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
