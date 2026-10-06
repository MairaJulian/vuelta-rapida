import { DEFAULT_TILT_CONFIG } from '@/core/TiltSteering';

import {
  DEFAULT_PLAYER_PREFERENCES,
  getStartStep,
  parsePlayerPreferences,
  serializePlayerPreferences,
  withTiltPreferences,
} from './PlayerPreferences';
import type { PlayerPreferences } from './PlayerPreferences.types';

const saved: PlayerPreferences = {
  controlMode: 'tilt',
  tiltNeutralAngle: 0.12,
  tiltSensitivity: 7,
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
        extra: 1,
      }),
    );
    expect(parsed).toEqual({ controlMode: null, tiltNeutralAngle: null, tiltSensitivity: 8 });
  });

  it('limita la sensibilidad a 1–10', () => {
    expect(parsePlayerPreferences(JSON.stringify({ tiltSensitivity: 99 })).tiltSensitivity).toBe(
      10,
    );
    expect(parsePlayerPreferences(JSON.stringify({ tiltSensitivity: -3 })).tiltSensitivity).toBe(1);
  });

  it('devuelve un objeto nuevo, no los valores por defecto congelados', () => {
    const parsed = parsePlayerPreferences(null);
    expect(parsed).not.toBe(DEFAULT_PLAYER_PREFERENCES);
    expect(Object.isFrozen(parsed)).toBe(false);
  });
});

describe('serializePlayerPreferences', () => {
  it('guarda solo los campos conocidos', () => {
    const withExtra = { ...saved, extra: true } as PlayerPreferences;
    expect(JSON.parse(serializePlayerPreferences(withExtra))).toEqual(saved);
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
});

describe('withTiltPreferences', () => {
  it('aplica la calibración y la sensibilidad guardadas', () => {
    expect(withTiltPreferences(DEFAULT_TILT_CONFIG, saved)).toEqual({
      ...DEFAULT_TILT_CONFIG,
      neutralAngle: 0.12,
      sensitivity: 7,
    });
  });

  it('sin calibrar, el derecho es el celular nivelado', () => {
    expect(withTiltPreferences(DEFAULT_TILT_CONFIG, DEFAULT_PLAYER_PREFERENCES).neutralAngle).toBe(
      0,
    );
  });
});
