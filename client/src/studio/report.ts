// The report people see first. Layout is a 24-column grid.
const sum = (id: string) => ({ id, aggregation: 'sum' });
const title = (text: string) => ({ title: { text, enabled: true } });

export const defaultReport = {
  selectedPageId: 'overview',
  pages: [
    {
      id: 'overview',
      widgets: {
        outstanding: {
          type: 'value',
          format: title('Still to collect'),
          dataMapping: { value: [sum('customers.outstanding')] },
        },
        overdue: {
          type: 'value',
          format: title('Overdue'),
          dataMapping: { value: [sum('customers.overdue')] },
        },
        billed: {
          type: 'value',
          format: title('Billed in total'),
          dataMapping: { value: [sum('customers.totalBilled')] },
        },
        aging: {
          type: 'column-chart-grouped',
          format: title('How late is the money?'),
          dataMapping: { categoryKey: [{ id: 'invoices.agingBucket' }], valueKey: [sum('invoices.amount')] },
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
        invoices: {
          type: 'grid',
          format: title('Invoices'),
          dataMapping: {
            cols: [
              { id: 'invoices.number' },
              { id: 'invoices.customer' },
              { id: 'invoices.amount' },
              { id: 'invoices.dueAt' },
              { id: 'invoices.daysOverdue' },
              { id: 'invoices.status' },
              { id: 'invoices.lastReplyIntent' },
              { id: 'invoices.verification' },
              { id: 'invoices.nextAction' },
            ],
          },
        },
        replies: {
          type: 'grid',
          format: title('Customer replies'),
          dataMapping: {
            cols: [
              { id: 'replies.invoiceNumber' },
              { id: 'replies.customer' },
              { id: 'replies.receivedAt' },
              { id: 'replies.body' },
              { id: 'replies.intent' },
            ],
          },
        },
      },
      widgetLayout: {
        outstanding: { xTrack: 0, yTrack: 0, xSpan: 8, ySpan: 5 },
        overdue: { xTrack: 8, yTrack: 0, xSpan: 8, ySpan: 5 },
        billed: { xTrack: 16, yTrack: 0, xSpan: 8, ySpan: 5 },
        aging: { xTrack: 0, yTrack: 5, xSpan: 10, ySpan: 13 },
        board: { xTrack: 10, yTrack: 5, xSpan: 8, ySpan: 13 },
        checks: { xTrack: 18, yTrack: 5, xSpan: 6, ySpan: 13 },
        invoices: { xTrack: 0, yTrack: 18, xSpan: 24, ySpan: 16 },
        replies: { xTrack: 0, yTrack: 34, xSpan: 24, ySpan: 10 },
      },
    },
  ],
};
