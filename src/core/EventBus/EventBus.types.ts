/** Todo evento lleva un `type` que lo distingue (unión discriminada). */
export interface BusEvent {
  type: string;
}

/** El evento de la unión `E` cuyo `type` es `T`. */
export type EventOfType<E extends BusEvent, T extends E['type']> = Extract<E, { type: T }>;

/** Función que se llama con cada evento escuchado. */
export type EventListener<E> = (event: E) => void;

/** Deja de escuchar. Llamarla dos veces no hace nada. */
export type Unsubscribe = () => void;

/** Bus de eventos tipado. Corre en un solo hilo (el de JS en la app). */
export interface EventBus<E extends BusEvent> {
  /** Escucha un tipo de evento. */
  on<T extends E['type']>(type: T, listener: EventListener<EventOfType<E, T>>): Unsubscribe;
  /** Escucha todos los eventos. */
  onAny(listener: EventListener<E>): Unsubscribe;
  /** Avisa un evento a quienes lo escuchan, en el orden en que se suscribieron. */
  emit(event: E): void;
  /** Avisa varios eventos, en orden. */
  emitAll(events: readonly E[]): void;
  /** Cantidad de suscripciones activas (para tests y diagnóstico). */
  listenerCount(): number;
}
