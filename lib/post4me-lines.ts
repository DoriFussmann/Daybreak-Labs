export const MAX_CLIENT_NOTES = 5;

export type LineRow = { id: string; body: string; sort_order: number };

export function asLine(row: Record<string, unknown>): LineRow {
  const body = String(
    row.body ?? row.text ?? row.note ?? row.line ?? row.content ?? row.direction ?? "",
  );
  return {
    id: String(row.id),
    body,
    sort_order: Number(row.sort_order ?? row.position ?? row.sort ?? 0),
  };
}

export function lineInsert(clientId: string, body: string, _sortOrder = 0) {
  return { client_id: clientId, body };
}
