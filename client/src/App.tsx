import { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';

type Row = { invoice: string; customer: string; amount: number; status: string };

const rows: Row[] = [
  { invoice: 'INV-001', customer: 'Acme Studio', amount: 1200, status: 'Overdue' },
  { invoice: 'INV-002', customer: 'Northwind', amount: 450, status: 'Promised' },
  { invoice: 'INV-003', customer: 'Globex', amount: 980, status: 'Paid (PayPal verified)' },
];

const columns: ColDef<Row>[] = [
  { field: 'invoice' },
  { field: 'customer' },
  { field: 'amount', valueFormatter: (p) => `$${p.value}` },
  { field: 'status' },
];

export default function App() {
  const [server, setServer] = useState('checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(() => setServer('connected'))
      .catch(() => setServer('offline'));
  }, []);

  return (
    <main>
      <h1>Tallyo</h1>
      <p>Server: {server}</p>
      <div style={{ height: 240 }}>
        <AgGridReact<Row> rowData={rows} columnDefs={columns} />
      </div>
    </main>
  );
}
