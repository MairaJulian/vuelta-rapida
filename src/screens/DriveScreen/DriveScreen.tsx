import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, BackHandler, useWindowDimensions, View } from 'react-native';

import { DEFAULT_RACE_AUDIO_MIX } from '@/audio/RaceAudio';
import type { DevPanel as DevPanelComponent } from '@/components/DevPanel';
import { LapHud } from '@/components/LapHud';
import { PauseMenu } from '@/components/PauseMenu';
import { RaceResults } from '@/components/RaceResults';
import { StartLights } from '@/components/StartLights';
import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import { createEventBus } from '@/core/EventBus';
import { DEFAULT_FIXED_STEP_CONFIG } from '@/core/FixedStep';
import { formatLapTime, ticksToMs } from '@/core/LapTimer';
import { DEFAULT_RACE_HAPTICS } from '@/haptics/RaceHaptics';
import { withTiltPreferences } from '@/core/PlayerPreferences';
import type { PlayerPreferences } from '@/core/PlayerPreferences';
import { DEFAULT_RACE_CONFIG } from '@/core/RaceFlow';
import type { RaceEvent } from '@/core/RaceFlow';
import { calibrateTilt, DEFAULT_TILT_CONFIG, withTiltSteering } from '@/core/TiltSteering';
import type { TiltConfig } from '@/core/TiltSteering';
import type { Circuit } from '@/core/Track';
import { useBestLapRecord } from '@/hooks/useBestLapRecord';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';
import { useRaceAudio } from '@/hooks/useRaceAudio';
import { useRaceHaptics } from '@/hooks/useRaceHaptics';
import { useRaceLoop } from '@/hooks/useRaceLoop';
import { useRaceStatus } from '@/hooks/useRaceStatus';
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
 * Pantalla de carrera: el circuito, el auto, la cámara, el modo de control (botones o
 * inclinación), el semáforo, el HUD de vueltas, la pausa, los resultados y el panel
 * de ajuste en desarrollo. Compone piezas; no calcula nada.
 */
export function DriveScreen(_props: DriveScreenProps) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const viewport = useMemo(() => ({ width, height }), [width, height]);
  const router = useRouter();
  const { preferences, updatePreferences } = usePlayerPreferences();
  const [drivingConfig, setDrivingConfig] = useState(DEFAULT_DRIVING_CONFIG);
  const [cameraConfig, setCameraConfig] = useState(DEFAULT_CAMERA_CONFIG);
  // El circuito es fijo hasta que exista la selección de pista; el panel cambia el ancho.
  const [track, setTrack] = useState<Circuit>(DEFAULT_CIRCUIT);
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

  useEffect(() => bus.on('newRecord', (event) => saveLap(event.lapTicks)), [bus, saveLap]);

  const { phase, pausedLap, results } = useRaceStatus({ bus, lapView: loop.lapView });

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

  return (
    <View style={styles.container} testID="drive-screen">
      <DriveCanvas
        track={track}
        cameraTransform={loop.cameraTransform}
        carTransform={loop.carTransform}
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
          onTrackChange={(next) => setTrack((current) => ({ ...current, width: next.width }))}
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
