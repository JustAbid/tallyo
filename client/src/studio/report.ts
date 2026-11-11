// The report people see first, split into four pages by the job each one does.
// Each page lays its widgets out on a 24-column grid.
const sum = (id: string) => ({ id, aggregation: 'sum' });
const title = (text: string) => ({ title: { text, enabled: true, typography: { fontSize: 14, fontWeight: 'bold' } } });
const bigNumber = (text: string, size: number) => ({
  ...title(text),
  style: { typography: { fontSize: size, fontWeight: 'bold' } },
});
const cols = (...ids: string[]) => ids.map((id) => ({ id }));

export const defaultReport = {
  selectedPageId: 'overview',
  pages: [
    {
      id: 'overview',
      name: 'Overview',
      widgets: {
        overdue: {
          type: 'value',
          format: bigNumber('Overdue right now', 46),
          dataMapping: { value: [sum('customers.overdue')] },
        },
        outstanding: {
          type: 'value',
          format: bigNumber('Still to collect', 32),
          dataMapping: { value: [sum('customers.outstanding')] },
        },
        billed: {
          type: 'value',
          format: bigNumber('Billed in total', 32),
          dataMapping: { value: [sum('customers.totalBilled')] },
        },
        aging: {
          type: 'column-chart-grouped',
          format: title('How late is the money?'),
          dataMapping: { categoryKey: [{ id: 'aging.bucket' }], valueKey: [sum('aging.amount')] },
        },
        board: {
          type: 'owes-scoreboard',
          format: title('Who still owes you'),
          dataMapping: {
            who: [{ id: 'customers.name' }],
            outstanding: [sum('customers.outstanding')],
            overdue: [sum('customers.overdue')],
            lateDays: [{ id: 'customers.avgDaysOverdue', aggregation: 'max' }],
          },
        },
        checks: {
          type: 'donut-chart',
          format: title('How it was paid'),
          dataMapping: { categoryKey: [{ id: 'invoices.verification' }], valueKey: [sum('invoices.amount')] },
        },
        replies: {
          type: 'grid',
          format: title('Latest customer replies'),
          dataMapping: {
            cols: cols('replies.invoiceNumber', 'replies.customer', 'replies.body', 'replies.intent', 'replies.replyAction'),
          },
        },
      },
      widgetLayout: {
        overdue: { xTrack: 0, yTrack: 0, xSpan: 10, ySpan: 7 },
        outstanding: { xTrack: 10, yTrack: 0, xSpan: 7, ySpan: 7 },
        billed: { xTrack: 17, yTrack: 0, xSpan: 7, ySpan: 7 },
        aging: { xTrack: 0, yTrack: 7, xSpan: 12, ySpan: 22 },
        board: { xTrack: 12, yTrack: 7, xSpan: 7, ySpan: 22 },
        checks: { xTrack: 19, yTrack: 7, xSpan: 5, ySpan: 22 },
        replies: { xTrack: 0, yTrack: 29, xSpan: 24, ySpan: 14 },
      },
    },
    {
      id: 'invoices',
      name: 'Invoices',
      widgets: {
        invoices: {
          type: 'grid',
          format: title('All invoices'),
          dataMapping: {
            cols: cols(
              'invoices.number',
              'invoices.customer',
              'invoices.amount',
              'invoices.dueAt',
              'invoices.daysOverdue',
              'invoices.status',
              'invoices.verification',
              'invoices.nextAction',
            ),
          },
        },
      },
      widgetLayout: { invoices: { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 48 } },
    },
    {
      id: 'replies',
      name: 'Replies',
      widgets: {
        replies: {
          type: 'grid',
          format: title('Customer replies'),
          dataMapping: {
            cols: cols(
              'replies.invoiceNumber',
              'replies.customer',
              'replies.body',
              'replies.intent',
              'replies.replyAction',
              'replies.actionTaken',
            ),
          },
        },
      },
      widgetLayout: { replies: { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 42 } },
    },
    {
      id: 'customers',
      name: 'Customers',
      widgets: {
        late: {
          type: 'bar-chart-grouped',
          format: title('Overdue by customer'),
          dataMapping: { categoryKey: [{ id: 'customers.name' }], valueKey: [sum('customers.overdue')] },
        },
        customers: {
          type: 'grid',
          format: title('Customers'),
          dataMapping: {
            cols: cols(
              'customers.name',
              'customers.email',
              'customers.invoiceCount',
              'customers.totalBilled',
              'customers.outstanding',
              'customers.overdue',
              'customers.avgDaysOverdue',
            ),
          },
        },
      },
      widgetLayout: {
        late: { xTrack: 0, yTrack: 0, xSpan: 8, ySpan: 38 },
        customers: { xTrack: 8, yTrack: 0, xSpan: 16, ySpan: 38 },
      },
    },
  ],
};
