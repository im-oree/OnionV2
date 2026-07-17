/**
 * EventEmitter — a tiny typed event emitter.
 * Used by the Renderer to emit events (frame stats, resize, etc.)
 * without depending on React.
 */

type Handler<T = unknown> = (data: T) => void;

export class EventEmitter<EventMap extends Record<string, unknown>> {
  private handlers = new Map<keyof EventMap, Set<Handler<unknown>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.delete(handler as Handler<unknown>);
      if (set.size === 0) this.handlers.delete(event);
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const set = this.handlers.get(event);
    if (set) {
      for (const handler of set) {
        handler(data);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
