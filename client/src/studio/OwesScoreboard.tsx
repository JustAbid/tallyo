import { useEffect, useState } from 'react';
import type { AgWidgetParams } from 'ag-studio';

interface Row {
  name: string;
  overdue: number;
  outstanding: number;
  days: number;
}

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// A mapped field arrives as a one-item list of fields.
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value) as any;

// A friendly "who still owes you" board. It reads whatever fields the report maps to it,
// so page filters and cross filters apply to it like any other widget.
export default function OwesScoreboard({ widgetApi, dataMapping }: AgWidgetParams<any>) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const map = dataMapping as Record<string, unknown>;
    const who = first(map.who);
    const outstanding = first(map.outstanding);
    const overdue = first(map.overdue);
    const lateDays = first(map.lateDays);
    if (!who || !outstanding || !overdue || !lateDays) {
      widgetApi.setDisplayState('incompleteDataMapping');
      return;
    }

    (async () => {
      widgetApi.setDisplayState('loading');
      const res: any = await widgetApi.getData({ kind: 'flat', fields: [who, outstanding, overdue, lateDays] }, { queryId: 'scoreboard' });
      if (cancelled || res.replaced) return;

      const mapped: Row[] = (res.results?.rows ?? [])
        .map((r: any) => ({
          name: String(r[who.key] ?? ''),
          outstanding: Number(r[outstanding.key] ?? 0),
          overdue: Number(r[overdue.key] ?? 0),
          days: Number(r[lateDays.key] ?? 0),
        }))
        .filter((r: Row) => r.outstanding > 0)
        .sort((a: Row, b: Row) => b.overdue - a.overdue);

      setRows(mapped);
      widgetApi.setDisplayState(mapped.length ? 'displayed' : 'noData');
    })();
    return () => {
      cancelled = true;
    };
  }, [widgetApi, dataMapping]);

  if (!rows?.length) return null;
  const top = Math.max(...rows.map((r) => r.outstanding), 1);

  return (
    <div className="scoreboard">
      <ol>
        {rows.slice(0, 8).map((r, i) => (
          <li key={r.name}>
            <span className="rank">{i + 1}</span>
            <div className="who">
              <div className="row">
                <strong>{r.name}</strong>
                <span>{usd(r.outstanding)}</span>
              </div>
              <div className="bar">
                <div className="bar-overdue" style={{ width: `${(r.overdue / top) * 100}%` }} />
                <div className="bar-rest" style={{ width: `${((r.outstanding - r.overdue) / top) * 100}%` }} />
              </div>
              <div className="sub">
                {r.overdue > 0 ? `${usd(r.overdue)} overdue, about ${r.days} days late on average` : 'Nothing overdue'}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
