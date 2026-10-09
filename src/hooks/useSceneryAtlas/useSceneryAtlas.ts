import { drawAsImage } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { createElement, useEffect, useState } from 'react';

import { ATLAS_SIZE, SceneryAtlas } from '@/render/SceneryAtlas';

import type { UseSceneryAtlasResult } from './useSceneryAtlas.types';

/** La textura se dibuja una vez por sesión y la comparten todas las carreras. */
let atlas: Promise<SkImage | null> | null = null;

function loadAtlas(): Promise<SkImage | null> {
  atlas ??= drawAsImage(createElement(SceneryAtlas), ATLAS_SIZE).catch(() => {
    // Si falló, la próxima carrera lo vuelve a intentar.
    atlas = null;
    return null;
  });
  return atlas;
}

/**
 * Textura (atlas) de la escenografía: rasteriza `SceneryAtlas` fuera de pantalla la
 * primera vez y la reutiliza después. Devuelve `null` hasta que está lista; mientras
 * tanto la escena se dibuja sin árboles.
 */
export function useSceneryAtlas(): UseSceneryAtlasResult {
  const [image, setImage] = useState<SkImage | null>(null);
  useEffect(() => {
    let active = true;
    loadAtlas().then((result) => {
      if (active) {
        setImage(result);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return image;
}
