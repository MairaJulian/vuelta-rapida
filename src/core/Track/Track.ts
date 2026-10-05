import type { FinishLine, OvalTrack, Pose, TrackCurve, TrackRect } from './Track.types';

/** Óvalo de prueba del hito 2: unos 714 m por vuelta. */
export const DEFAULT_TRACK: OvalTrack = {
  centerX: 0,
  centerZ: 0,
  straightLength: 200,
  radius: 50,
  width: 8,
};

/** Distancia de la largada a la línea de meta, en metros. */
const START_GAP = 15;
const FINISH_LINE_THICKNESS = 1;

/** Línea central del óvalo como rectángulo redondeado. */
export function getCenterlineRect(track: OvalTrack): TrackRect {
  return {
    x: track.centerX - track.straightLength / 2 - track.radius,
    z: track.centerZ - track.radius,
    width: track.straightLength + track.radius * 2,
    height: track.radius * 2,
    radius: track.radius,
  };
}

/** Las dos curvas del óvalo, izquierda y derecha. */
export function getCurves(track: OvalTrack): [TrackCurve, TrackCurve] {
  const halfStraight = track.straightLength / 2;
  return [
    {
      side: 'left',
      centerX: track.centerX - halfStraight,
      centerZ: track.centerZ,
      radius: track.radius,
    },
    {
      side: 'right',
      centerX: track.centerX + halfStraight,
      centerZ: track.centerZ,
      radius: track.radius,
    },
  ];
}

/** Línea de meta en el centro de la recta superior. */
export function getFinishLine(track: OvalTrack): FinishLine {
  return {
    x: track.centerX,
    z: track.centerZ - track.radius,
    length: track.width,
    thickness: FINISH_LINE_THICKNESS,
  };
}

/**
 * Posición de largada: en la recta superior, poco antes de la meta, mirando
 * hacia la derecha (+x). La carrera gira en sentido horario.
 */
export function getStartPose(track: OvalTrack): Pose {
  const finish = getFinishLine(track);
  return { x: finish.x - START_GAP, z: finish.z, heading: Math.PI / 2 };
}
