/**
 * Row → API resource converter. Each module exports one per aggregate and a
 * reverse transformer for DTO → jsonb writes.
 */
export class Transformer<Row, Resource> {
  constructor(private readonly fn: (row: Row) => Resource) {}

  transform(row: Row): Resource {
    return this.fn(row);
  }

  transformCollection(rows: Row[]): Resource[] {
    return rows.map((r) => this.fn(r));
  }
}

export function makeTransformer<Row, Resource>(
  fn: (row: Row) => Resource,
): Transformer<Row, Resource> {
  return new Transformer<Row, Resource>(fn);
}
