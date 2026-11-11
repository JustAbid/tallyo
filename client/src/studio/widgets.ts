import { createWidgets } from 'ag-studio-react';
import { ActionsCell, VerificationCell } from './cells';
import OwesScoreboard from './OwesScoreboard';

const numeric = (per = 'dataMapping.who') => ({
  type: 'field',
  supportedRoles: ['numeric'],
  requires: { per, cardinality: 'one' },
  required: true,
});

const scoreboardWidget = {
  id: 'owes-scoreboard',
  label: 'Who owes what',
  comp: OwesScoreboard,
  dataMapping: {
    who: { type: 'field', supportedRoles: ['category'], requires: { cardinality: 'many' }, required: true },
    outstanding: numeric(),
    overdue: numeric(),
    lateDays: numeric(),
  },
  form: (params: any) =>
    params.createDefaults({
      dataMappingItems: [
        { key: 'who', label: 'Customer' },
        { key: 'outstanding', label: 'Outstanding' },
        { key: 'overdue', label: 'Overdue' },
        { key: 'lateDays', label: 'Days late' },
      ],
    }),
  defaultSize: { xSpan: 8, ySpan: 12 },
  minSize: { xSpan: 6, ySpan: 8 },
};

const renderers: Record<string, any> = {
  verification: VerificationCell,
  actions: ActionsCell,
};

const cellOptions = {
  createCellRenderer: (field: any) => renderers[field.context?.cellRenderer],
  getLinkedFields: (field: any) => field.context?.linkedFields,
};

export const widgets = (config: any) =>
  (createWidgets as any)({
    additionalTypes: [scoreboardWidget],
    overrides: [{ id: 'grid', options: cellOptions }],
    menu: [...config.menu, { label: 'Tallyo', widgetIds: ['owes-scoreboard'] }],
  });
