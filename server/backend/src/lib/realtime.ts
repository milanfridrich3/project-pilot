import type { Response } from "express";

// Jednoduchy in-memory registr pripojenych SSE klientu podle user id.
// Funguje v ramci jednoho Node procesu - pro tuto velikost appky
// dostatecne, u vodorovneho skalovani na vice instanci by bylo potreba
// presunout na sdileny pub/sub (napr. Redis).
const clients = new Map<number, Set<Response>>();

export function addClient(userId: number, res: Response) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(res);
}

export function removeClient(userId: number, res: Response) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    clients.delete(userId);
  }
}

// Posle udalost vsem aktivnim SSE spojenim daneho uzivatele (typicky vic
// oteverenych tabu/zarizeni najednou). Kdyz uzivatel zrovna neni pripojeny,
// tise se nic nestane - notifikace uz je ulozena v databazi a nacte se
// pri pristim GET /api/notifications.
export function pushToUser(userId: number, event: string, data: unknown) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    res.write(payload);
  }
}
