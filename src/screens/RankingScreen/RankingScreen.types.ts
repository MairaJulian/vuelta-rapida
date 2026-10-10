/**
 * El ranking no recibe props: la ruta `/ranking` abre la primera pista y
 * `/ranking?circuito=…`, la pista pedida.
 */
export type RankingScreenProps = Record<string, never>;

/** Valor del selector de tabla: `lap`, o `race-N` para la carrera de N vueltas. */
export type TableOption = 'lap' | `race-${number}`;
