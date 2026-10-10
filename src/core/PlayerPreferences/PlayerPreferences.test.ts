import { SAVE_VERSION } from '@/core/SaveData';
import { DEFAULT_TILT_CONFIG, MAX_DEAD_ZONE, MIN_DEAD_ZONE } from '@/core/TiltSteering';

import {
  DEAD_ZONE_LEVELS,
  deadZoneFromLevel,
  deadZoneToLevel,
  DEFAULT_PLAYER_PREFERENCES,
  getStartStep,
  isControlModeAvailable,
  parsePlayerPreferences,
  serializePlayerPreferences,
  withTiltPreferences,
} from './PlayerPreferences';
import type { PlayerPreferences } from './PlayerPreferences.types';

const DEG = Math.PI / 180;

const saved: PlayerPreferences = {
  controlMode: 'tilt',
  tiltNeutralAngle: 0.12,
  tiltSensitivity: 7,
  tiltDeadZone: 3 * DEG,
  soundEnabled: false,
  vibrationEnabled: false,
};

describe('parsePlayerPreferences', () => {
  it('sin nada guardado devuelve los valores por defecto', () => {
    expect(parsePlayerPreferences(null)).toEqual(DEFAULT_PLAYER_PREFERENCES);
    expect(parsePlayerPreferences('')).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it('lee lo que se guardó', () => {
    expect(parsePlayerPreferences(serializePlayerPreferences(saved))).toEqual(saved);
  });

  it('con JSON roto vuelve a los valores por defecto', () => {
    expect(parsePlayerPreferences('{controlMode:')).toEqual(DEFAULT_PLAYER_PREFERENCES);
    expect(parsePlayerPreferences('42')).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it('descarta cada campo inválido por separado', () => {
    const parsed = parsePlayerPreferences(
      JSON.stringify({
        controlMode: 'volante',
        tiltNeutralAngle: 'x',
        tiltSensitivity: 8,
        tiltDeadZone: 'grande',
        soundEnabled: 'si',
        vibrationEnabled: 0,
        extra: 1,
      }),
    );
    expect(parsed).toEqual({
      controlMode: null,
      tiltNeutralAngle: null,
      tiltSensitivity: 8,
      tiltDeadZone: DEFAULT_PLAYER_PREFERENCES.tiltDeadZone,
      soundEnabled: true,
      vibrationEnabled: true,
    });
  });

  it('las preferencias de antes del sonido y la vibración arrancan con los dos prendidos', () => {
    const parsed = parsePlayerPreferences(JSON.stringify({ controlMode: 'buttons' }));
    expect(parsed.soundEnabled).toBe(true);
    expect(parsed.vibrationEnabled).toBe(true);
  });

  it('las preferencias de antes de la zona muerta ajustable arrancan con la inicial', () => {
    const old = JSON.stringify({ controlMode: 'tilt', tiltNeutralAngle: 0.1, tiltSensitivity: 6 });
    expect(parsePlayerPreferences(old).tiltDeadZone).toBe(DEFAULT_TILT_CONFIG.deadZone);
  });

  it('limita la sensibilidad a 1–10', () => {
    expect(parsePlayerPreferences(JSON.stringify({ tiltSensitivity: 99 })).tiltSensitivity).toBe(
      10,
    );
    expect(parsePlayerPreferences(JSON.stringify({ tiltSensitivity: -3 })).tiltSensitivity).toBe(1);
  });

  it('limita la zona muerta a 1°–9°', () => {
    expect(parsePlayerPreferences(JSON.stringify({ tiltDeadZone: 1 })).tiltDeadZone).toBe(
      MAX_DEAD_ZONE,
    );
    expect(parsePlayerPreferences(JSON.stringify({ tiltDeadZone: 0 })).tiltDeadZone).toBe(
      MIN_DEAD_ZONE,
    );
  });

  it('ignora el número de versión y los récords de antes de los perfiles', () => {
    const parsed = parsePlayerPreferences(
      JSON.stringify({ version: 1, controlMode: 'buttons', bestLapsMs: { lago: 70000 } }),
    );
    expect(parsed).toEqual({ ...DEFAULT_PLAYER_PREFERENCES, controlMode: 'buttons' });
  });

  it('devuelve un objeto nuevo, no los valores por defecto congelados', () => {
    const parsed = parsePlayerPreferences(null);
    expect(parsed).not.toBe(DEFAULT_PLAYER_PREFERENCES);
    expect(Object.isFrozen(parsed)).toBe(false);
  });
});

describe('serializePlayerPreferences', () => {
  it('guarda el número de versión y solo los campos conocidos', () => {
    const withExtra = { ...saved, extra: true } as PlayerPreferences;
    expect(JSON.parse(serializePlayerPreferences(withExtra))).toEqual({
      version: SAVE_VERSION,
      ...saved,
    });
  });
});

describe('niveles de la zona muerta', () => {
  it('van de 1° a 9° de a 2°, y el nivel 3 es la zona muerta inicial', () => {
    const degrees = Array.from(
      { length: DEAD_ZONE_LEVELS },
      (_, i) => deadZoneFromLevel(i + 1) / DEG,
    );
    degrees.forEach((value, i) => expect(value).toBeCloseTo([1, 3, 5, 7, 9][i], 9));
    expect(deadZoneFromLevel(3)).toBeCloseTo(DEFAULT_TILT_CONFIG.deadZone, 12);
    expect(deadZoneToLevel(DEFAULT_PLAYER_PREFERENCES.tiltDeadZone)).toBeCloseTo(3, 9);
  });

  it('nivel y zona muerta van y vuelven', () => {
    for (let level = 1; level <= DEAD_ZONE_LEVELS; level += 1) {
      expect(deadZoneToLevel(deadZoneFromLevel(level))).toBeCloseTo(level, 9);
    }
  });

  it('limita valores fuera de la escala', () => {
    expect(deadZoneFromLevel(0)).toBeCloseTo(MIN_DEAD_ZONE, 12);
    expect(deadZoneFromLevel(9)).toBeCloseTo(MAX_DEAD_ZONE, 12);
    expect(deadZoneToLevel(0)).toBe(1);
    expect(deadZoneToLevel(30 * DEG)).toBe(DEAD_ZONE_LEVELS);
  });
});

describe('getStartStep', () => {
  it('sin modo elegido, primero se elige el control', () => {
    expect(getStartStep(DEFAULT_PLAYER_PREFERENCES)).toBe('choose-control');
  });

  it('con inclinación sin calibrar, va a la calibración', () => {
    expect(getStartStep({ ...saved, tiltNeutralAngle: null })).toBe('calibrate');
  });

  it('con inclinación calibrada o con botones, va directo a la pista', () => {
    expect(getStartStep(saved)).toBe('drive');
    expect(getStartStep({ ...DEFAULT_PLAYER_PREFERENCES, controlMode: 'buttons' })).toBe('drive');
  });

  it('con la inclinación desactivada, siempre va directo a la pista', () => {
    expect(getStartStep(DEFAULT_PLAYER_PREFERENCES, false)).toBe('drive');
    expect(getStartStep({ ...saved, tiltNeutralAngle: null }, false)).toBe('drive');
    expect(getStartStep(saved, false)).toBe('drive');
    expect(getStartStep({ ...saved, controlMode: 'buttons' }, false)).toBe('drive');
  });
});

describe('isControlModeAvailable', () => {
  it('con la inclinación activada, cualquier modo sirve', () => {
    expect(isControlModeAvailable('tilt', true)).toBe(true);
    expect(isControlModeAvailable('buttons', true)).toBe(true);
    expect(isControlModeAvailable(null, true)).toBe(true);
  });

  it('con la inclinación desactivada, una inclinación guardada no sirve', () => {
    expect(isControlModeAvailable('tilt', false)).toBe(false);
    expect(isControlModeAvailable('buttons', false)).toBe(true);
    expect(isControlModeAvailable(null, false)).toBe(true);
  });
});

describe('withTiltPreferences', () => {
  it('aplica la calibración, la sensibilidad y la zona muerta guardadas', () => {
    expect(withTiltPreferences(DEFAULT_TILT_CONFIG, saved)).toEqual({
      ...DEFAULT_TILT_CONFIG,
      neutralAngle: 0.12,
      sensitivity: 7,
      deadZone: 3 * DEG,
    });
  });

  it('la zona muerta y la sensibilidad guardadas no se pisan entre sí', () => {
    const base = withTiltPreferences(DEFAULT_TILT_CONFIG, saved);
    const wider = withTiltPreferences(DEFAULT_TILT_CONFIG, { ...saved, tiltDeadZone: 9 * DEG });
    const sharper = withTiltPreferences(DEFAULT_TILT_CONFIG, { ...saved, tiltSensitivity: 10 });
    expect(wider).toEqual({ ...base, deadZone: 9 * DEG });
    expect(sharper).toEqual({ ...base, sensitivity: 10 });
  });

  it('sin calibrar, el derecho es el celular nivelado', () => {
    expect(withTiltPreferences(DEFAULT_TILT_CONFIG, DEFAULT_PLAYER_PREFERENCES).neutralAngle).toBe(
      0,
    );
  });
});
