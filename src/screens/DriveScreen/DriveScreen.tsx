import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, BackHandler, useWindowDimensions, View } from 'react-native';

import { DEFAULT_RACE_AUDIO_MIX } from '@/audio/RaceAudio';
import type { DevPanel as DevPanelComponent } from '@/components/DevPanel';
import { LapHud } from '@/components/LapHud';
import { PauseMenu } from '@/components/PauseMenu';
import { RaceResults } from '@/components/RaceResults';
import { StartLights } from '@/components/StartLights';
import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { getCarColor } from '@/core/CarPalette';
import { getCircuit, withCircuitScenery } from '@/core/Circuits';
import { DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import { createEventBus } from '@/core/EventBus';
import { DEFAULT_FIXED_STEP_CONFIG } from '@/core/FixedStep';
import { formatLapTime, ticksToMs } from '@/core/LapTimer';
import { DEFAULT_RACE_HAPTICS } from '@/haptics/RaceHaptics';
import { withTiltPreferences } from '@/core/PlayerPreferences';
import type { PlayerPreferences } from '@/core/PlayerPreferences';
import { DEFAULT_RACE_CONFIG } from '@/core/RaceFlow';
import type { RaceEvent } from '@/core/RaceFlow';
import { withScenery } from '@/core/Scenery';
import { DEFAULT_SCENERY_DISPLAY } from '@/core/SceneryView';
import { calibrateTilt, DEFAULT_TILT_CONFIG, withTiltSteering } from '@/core/TiltSteering';
import type { TiltConfig } from '@/core/TiltSteering';
import type { Circuit } from '@/core/Track';
import { useBestLapRecord } from '@/hooks/useBestLapRecord';
import { useParticles } from '@/hooks/useParticles';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';
import { useProfiles } from '@/hooks/useProfiles';
import { useRaceAudio } from '@/hooks/useRaceAudio';
import { useRaceHaptics } from '@/hooks/useRaceHaptics';
import { useRaceLoop } from '@/hooks/useRaceLoop';
import { useRaceRanking } from '@/hooks/useRaceRanking';
import { useRaceStatus } from '@/hooks/useRaceStatus';
import { useSceneryAtlas } from '@/hooks/useSceneryAtlas';
import { useSceneryView } from '@/hooks/useSceneryView';
import { selectTrack } from '@/hooks/useSelectedTrack';
import { useTiltOutput } from '@/hooks/useTiltSteering';
import { ButtonControls } from '@/input/ButtonControls';
import { useDrivingInput } from '@/input/InputControls';
import { TiltControls } from '@/input/TiltControls';
import { DriveCanvas } from '@/render/DriveCanvas';

import { styles } from './DriveScreen.styles';
import type { DriveScreenProps } from './DriveScreen.types';

// Solo en desarrollo: en producción Metro reemplaza __DEV__ por false, pliega la
// condición y descarta el require, así que el panel no entra en el bundle.
const DevPanel: typeof DevPanelComponent | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/components/DevPanel').DevPanel
  : null;

const STEP_HZ = DEFAULT_FIXED_STEP_CONFIG.stepHz;

/**
 * Pantalla de carrera: el circuito, el auto del jugador activo (su color y su número),
 * la cámara, el modo de control (botones o inclinación), el semáforo, el HUD de
 * vueltas, la pausa, los resultados y el panel de ajuste en desarrollo. Compone
 * piezas; no calcula nada.
 */
export function DriveScreen(_props: DriveScreenProps) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const viewport = useMemo(() => ({ width, height }), [width, height]);
  const router = useRouter();
  const { preferences, updatePreferences } = usePlayerPreferences();
  // Sin perfil activo (una ruta directa de desarrollo): el auto azul, sin número.
  const { activeProfile } = useProfiles();
  const carColor = activeProfile ? getCarColor(activeProfile.colorId).hex : undefined;
  const carNumber = activeProfile?.number ?? null;
  const [drivingConfig, setDrivingConfig] = useState(DEFAULT_DRIVING_CONFIG);
  const [cameraConfig, setCameraConfig] = useState(DEFAULT_CAMERA_CONFIG);
  // La pista elegida (`/pista?circuito=…`); sin parámetro, la primera. El panel cambia el ancho.
  const { circuito } = useLocalSearchParams<{ circuito?: string }>();
  const [track, setTrack] = useState<Circuit>(() => getCircuit(circuito));
  // La pista que se corre queda como la elegida: el ranking abre en ella.
  useEffect(() => selectTrack(track.id), [track.id]);
  // La escenografía se genera recién montada la pantalla, no al dibujarla: tarda unos
  // cientos de milisegundos en el celular y así no demora el comienzo de la transición.
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setTrack((current) => (current.scenery ? current : withCircuitScenery(current)));
      }
    });
    return () => {
      active = false;
    };
  }, []);
  // Cómo se ve la escenografía: ajuste de desarrollo, solo para la sesión.
  const [sceneryDisplay, setSceneryDisplay] = useState(DEFAULT_SCENERY_DISPLAY);
  const atlas = useSceneryAtlas();
  const { recordMs, saveLap } = useBestLapRecord({ circuitId: track.id, stepHz: STEP_HZ });
  const recordTicks = recordMs === null ? null : Math.round((recordMs * STEP_HZ) / 1000);
  // Las vueltas se cambian en el panel y valen desde la próxima carrera.
  const [raceConfig, setRaceConfig] = useState(DEFAULT_RACE_CONFIG);
  // Los eventos de la carrera llegan acá; el sonido, la vibración y las pantallas los escuchan.
  const bus = useMemo(() => createEventBus<RaceEvent>(), []);
  // La mezcla es un ajuste de desarrollo: queda en la sesión.
  const [audioMix, setAudioMix] = useState(DEFAULT_RACE_AUDIO_MIX);
  const { onEngine } = useRaceAudio({ bus, enabled: preferences.soundEnabled, mix: audioMix });
  // Las intensidades de vibración también son un ajuste de desarrollo.
  const [hapticsConfig, setHapticsConfig] = useState(DEFAULT_RACE_HAPTICS);
  useRaceHaptics({ bus, enabled: preferences.vibrationEnabled, config: hapticsConfig });
  // Filtro y rampa son ajustes de desarrollo; calibración, sensibilidad y zona muerta, del jugador.
  const [tuning, setTuning] = useState(DEFAULT_TILT_CONFIG);
  const input = useDrivingInput();
  const tiltOutput = useTiltOutput();

  const controlMode = preferences.controlMode ?? 'buttons';
  const tiltConfig = useMemo(() => withTiltPreferences(tuning, preferences), [tuning, preferences]);

  // Con inclinación la señal ya llega continua y filtrada: la rampa del modelo se acorta.
  const activeDrivingConfig = useMemo(
    () => (controlMode === 'tilt' ? withTiltSteering(drivingConfig, tiltConfig) : drivingConfig),
    [controlMode, drivingConfig, tiltConfig],
  );

  const loop = useRaceLoop({
    input,
    track,
    viewport,
    drivingConfig: activeDrivingConfig,
    cameraConfig,
    raceConfig,
    recordTicks,
    onEvents: bus.emitAll,
    onEngine,
  });

  const sceneryView = useSceneryView({
    scenery: sceneryDisplay.visible ? track.scenery : undefined,
    cameraView: loop.cameraView,
    viewport,
    parallax: sceneryDisplay.parallax,
  });
  const particles = useParticles({
    race: loop.race,
    car: loop.car,
    input,
    enabled: sceneryDisplay.particles,
  });

  useEffect(() => bus.on('newRecord', (event) => saveLap(event.lapTicks)), [bus, saveLap]);

  const { phase, pausedLap, results } = useRaceStatus({ bus, lapView: loop.lapView });
  // Al llegar: el total de la carrera se guarda y se compara el ranking de la pista.
  const { ranking } = useRaceRanking({ bus, circuitId: track.id, stepHz: STEP_HZ });
  // Las celebraciones suenan y vibran junto con la tarjeta de resultados, no con la llegada.
  const celebration = results ? (ranking?.celebration ?? null) : null;
  useEffect(() => {
    if (celebration) {
      bus.emit({ type: 'celebration', kind: celebration });
    }
  }, [bus, celebration]);

  // El semáforo empieza apenas se monta la pantalla, y de nuevo en cada reinicio.
  const { startLights, restart, pause, resume } = loop;
  useEffect(() => startLights(), [startLights]);
  const restartRace = () => {
    restart();
    startLights();
  };

  // Inicio queda abajo en la pila: se vuelve a él (o se lo abre, si no estaba).
  const exit = useCallback(() => router.dismissTo('/inicio'), [router]);

  // Atrás de Android: pausa; en la pausa, continúa; tras la llegada, sale a Inicio.
  // Solo con la pantalla enfocada, para no tapar el atrás de la calibración.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (phase === 'finished') {
          exit();
        } else if (phase === 'paused') {
          resume();
        } else {
          pause();
        }
        return true;
      });
      return () => subscription.remove();
    }, [exit, pause, phase, resume]),
  );

  // Al pasar a segundo plano (llamada, notificación, botón de inicio), la carrera se pausa.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        pause();
      }
    });
    return () => subscription.remove();
  }, [pause]);

  // Desde el panel: la sensibilidad y la zona muerta son del jugador y se guardan; el resto
  // queda en la sesión. La calibración, la sensibilidad y la zona muerta de `tuning` no se
  // usan: las pisan las preferencias.
  const changeTiltConfig = (next: TiltConfig) => {
    setTuning(next);
    const changes: Partial<PlayerPreferences> = {};
    if (next.sensitivity !== preferences.tiltSensitivity) {
      changes.tiltSensitivity = next.sensitivity;
    }
    if (next.deadZone !== preferences.tiltDeadZone) {
      changes.tiltDeadZone = next.deadZone;
    }
    if (Object.keys(changes).length > 0) {
      updatePreferences(changes);
    }
  };

  const recalibrate = () => {
    const calibrated = calibrateTilt(tiltOutput.get().state, tiltConfig);
    updatePreferences({ tiltNeutralAngle: calibrated.neutralAngle });
  };

  // Con otro ancho, la escenografía se vuelve a generar (misma semilla) para no pisar la pista.
  const changeTrackWidth = (width: number) =>
    setTrack((current) => {
      const next = { ...current, width };
      return current.scenery ? withScenery(next, current.scenery.spec) : next;
    });

  const changeTreeDensity = (treeDensity: number) =>
    setTrack((current) =>
      current.scenery ? withScenery(current, { ...current.scenery.spec, treeDensity }) : current,
    );

  return (
    <View style={styles.container} testID="drive-screen">
      <DriveCanvas
        track={track}
        cameraTransform={loop.cameraTransform}
        carTransform={loop.carTransform}
        sceneryView={sceneryView}
        atlas={atlas}
        particles={particles}
        display={sceneryDisplay}
        carColor={carColor}
        carNumber={carNumber}
      />
      {controlMode === 'tilt' ? (
        <TiltControls
          input={input}
          config={tiltConfig}
          output={tiltOutput}
          brakeVibration={preferences.vibrationEnabled}
        />
      ) : (
        <ButtonControls input={input} brakeVibration={preferences.vibrationEnabled} />
      )}
      <LapHud lapView={loop.lapView} recordMs={recordMs} stepHz={STEP_HZ} onPause={pause} />
      <StartLights bus={bus} lightCount={raceConfig.lightCount} />
      {phase === 'paused' && pausedLap ? (
        <PauseMenu
          lap={pausedLap.lap}
          totalLaps={pausedLap.totalLaps}
          circuitName={track.name}
          lapTime={formatLapTime(ticksToMs(pausedLap.lapTicks, STEP_HZ))}
          soundEnabled={preferences.soundEnabled}
          vibrationEnabled={preferences.vibrationEnabled}
          onResume={resume}
          onRestart={restartRace}
          onToggleSound={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
          onToggleVibration={() =>
            updatePreferences({ vibrationEnabled: !preferences.vibrationEnabled })
          }
          onExit={exit}
        />
      ) : null}
      {results ? (
        <RaceResults
          results={results}
          stepHz={STEP_HZ}
          circuitName={track.name}
          driver={activeProfile}
          ranking={ranking}
          onRetry={restartRace}
          onExit={exit}
        />
      ) : null}
      {DevPanel ? (
        <DevPanel
          drivingConfig={drivingConfig}
          onDrivingConfigChange={setDrivingConfig}
          cameraConfig={cameraConfig}
          onCameraConfigChange={setCameraConfig}
          track={track}
          onTrackChange={(next) => changeTrackWidth(next.width)}
          sceneryDisplay={sceneryDisplay}
          onSceneryDisplayChange={setSceneryDisplay}
          treeDensity={track.scenery?.spec.treeDensity ?? 1}
          onTreeDensityChange={changeTreeDensity}
          controlMode={controlMode}
          onControlModeChange={(mode) => updatePreferences({ controlMode: mode })}
          tiltConfig={tiltConfig}
          onTiltConfigChange={changeTiltConfig}
          tiltOutput={tiltOutput}
          onRecalibrate={recalibrate}
          onOpenCalibration={() => router.push('/calibracion')}
          car={loop.car}
          fps={loop.fps}
          onResetCar={restartRace}
          raceConfig={raceConfig}
          onRaceConfigChange={setRaceConfig}
          audioMix={audioMix}
          onAudioMixChange={setAudioMix}
          hapticsConfig={hapticsConfig}
          onHapticsConfigChange={setHapticsConfig}
        />
      ) : null}
    </View>
  );
}
