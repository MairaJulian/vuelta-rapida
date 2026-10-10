export interface CarPreviewProps {
  /** Color de la carrocería (hex). */
  bodyColor: string;
  /** Número sobre el disco; sin número, el disco queda vacío. */
  number?: number | null;
  /** Ancho del auto, en dp. */
  carWidth: number;
  /** Giro del auto en radianes; 0 mira hacia arriba y π/2, hacia la derecha. */
  rotation?: number;
  /** Tamaño del lienzo, en dp. El auto va centrado. */
  width: number;
  height: number;
  testID?: string;
}
