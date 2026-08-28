import type { Response } from "express";

// ---------------------------------------------------------------------------
// Realtime notifikace pres Server-Sent Events (SSE)
// ---------------------------------------------------------------------------
// Jednoduchy in-memory pub/sub: kazdy pripojeny prohlizec drzi otevrene
// HTTP spojeni (GET /api/notifications/stream) a server do nej pri udalosti
// zapise "data: ...\n\n". Zadna extra zavislost (na rozdil od WebSocket) -
// EventSource v prohlizeci navic sam automaticky obnovuje spojeni pri
// vypadku, takze "pri vypadku spojeni musi byt mozne spojeni znovu navazat"
// je vyresene uz na urovni prohlizeciho API.
//
// Bezi jen v ramci jednoho procesu/instance serveru. Pri skalovani na vic
// instanci by bylo potreba pub/sub presunout do sdileneho media (napr.
// Postgres LISTEN/NOTIFY nebo Redis) - pro rozsah teto appky staci tohle.
// ---------------------------------------------------------------------------

const clients = new Map<number, Set<Response>>();

export function subscribe(userId: number, res: Response) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
}

export function unsubscribe(userId: number, res: Response) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

export function publish(userId: number, event: unknown) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) {
    res.write(data);
  }
}
