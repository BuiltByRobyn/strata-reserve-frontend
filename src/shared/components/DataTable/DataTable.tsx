// DataTable Component - Reusable table for displaying data
import type { ReactNode } from 'react';
import './DataTable.scss';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  actions?: (item: T) => ReactNode;
}

export function DataTable<T>({
  title,
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  actions
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="data-table-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
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
              {actions && <th className="actions-column">Edit</th>}
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
