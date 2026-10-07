import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import type { DevPanel as DevPanelComponent } from '@/components/DevPanel';
import { LapHud } from '@/components/LapHud';
import { DEFAULT_CAMERA_CONFIG } from '@/core/Camera';
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { DEFAULT_DRIVING_CONFIG } from '@/core/DrivingModel';
import { DEFAULT_FIXED_STEP_CONFIG } from '@/core/FixedStep';
import { withTiltPreferences } from '@/core/PlayerPreferences';
import type { PlayerPreferences } from '@/core/PlayerPreferences';
import { calibrateTilt, DEFAULT_TILT_CONFIG, withTiltSteering } from '@/core/TiltSteering';
import type { TiltConfig } from '@/core/TiltSteering';
import type { Circuit } from '@/core/Track';
import { useBestLapRecord } from '@/hooks/useBestLapRecord';
import { useDrivingLoop } from '@/hooks/useDrivingLoop';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';
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
 * Pantalla de manejo: el circuito, el auto, la cámara, el modo de control (botones o
 * inclinación), las vueltas con su HUD provisorio y el panel de ajuste en desarrollo.
 * Compone piezas; no calcula nada.
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

  const loop = useDrivingLoop({
    input,
    track,
    viewport,
    drivingConfig: activeDrivingConfig,
    cameraConfig,
    onBestLap: saveLap,
  });

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
        <TiltControls input={input} config={tiltConfig} output={tiltOutput} />
      ) : (
        <ButtonControls input={input} />
      )}
      <LapHud laps={loop.laps} recordMs={recordMs} stepHz={STEP_HZ} />
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
          onResetCar={loop.reset}
        />
      ) : null}
    </View>
  );
}
