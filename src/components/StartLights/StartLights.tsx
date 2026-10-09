import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RaceEvent } from '@/core/RaceFlow';

import { COLORS, GO_VISIBLE_MS, LABELS, styles, TOP_OFFSET } from './StartLights.styles';
import type { StartLightsProps, StartLightsView } from './StartLights.types';

/** En la grilla: luces apagadas y "Preparate…". */
export const GRID_VIEW: StartLightsView = Object.freeze({ lightsOn: 0, label: 'ready' });

/**
 * Qué muestra el semáforo después de un evento de la carrera. Pura. "¡Largada!"
 * no se oculta sola: eso lo hace el componente pasado `GO_VISIBLE_MS`.
 */
export function nextStartLightsView(
  view: StartLightsView,
  event: RaceEvent,
  lightCount: number,
): StartLightsView {
  switch (event.type) {
    case 'lightOn':
      return { lightsOn: event.light, label: event.light >= lightCount ? 'wait' : 'ready' };
    case 'lightsOut':
      return { lightsOn: 0, label: 'go' };
    case 'phase':
      if (event.to === 'grid') {
        return GRID_VIEW;
      }
      return event.to === 'finished' ? { lightsOn: 0, label: null } : view;
    default:
      return view;
  }
}

/**
 * Semáforo de largada (pantalla 06 del handoff): cinco columnas que se encienden
 * de a una y la píldora "Preparate…", "Esperá…" o "¡Largada!". Sigue los eventos
 * de la carrera, así queda en sincronía con el sonido y la vibración. Deja pasar
 * los toques.
 */
export function StartLights({ bus, lightCount = 5 }: StartLightsProps) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<StartLightsView>(GRID_VIEW);

  useEffect(
    () =>
      bus.onAny((event) => setView((current) => nextStartLightsView(current, event, lightCount))),
    [bus, lightCount],
  );

  // "¡Largada!" queda un momento y después el semáforo se va.
  useEffect(() => {
    if (view.label !== 'go') {
      return undefined;
    }
    const timer = setTimeout(
      () => setView((current) => (current.label === 'go' ? { ...current, label: null } : current)),
      GO_VISIBLE_MS,
    );
    return () => clearTimeout(timer);
  }, [view.label]);

  if (view.label === null) {
    return null;
  }
  return (
    <View testID="start-lights" style={[styles.overlay, { top: TOP_OFFSET + insets.top }]}>
      <View style={styles.housing}>
        {Array.from({ length: lightCount }, (_, i) => (
          <View key={i} style={styles.column}>
            <View style={[styles.lamp, { backgroundColor: COLORS.lampOff }]} />
            <View
              testID={`start-light-${i + 1}`}
              style={[
                styles.lamp,
                { backgroundColor: i < view.lightsOn ? COLORS.lampOn : COLORS.lampOff },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.pill}>
        <Text style={styles.label} accessibilityLiveRegion="polite" testID="start-lights-label">
          {LABELS[view.label]}
        </Text>
      </View>
    </View>
  );
}
