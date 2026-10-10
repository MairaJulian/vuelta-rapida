/**
 * Genera los sonidos de la carrera en `assets/sounds/`, en WAV mono de 16 bits a 44,1 kHz.
 *
 *   node scripts/generate-sounds.mjs
 *       Sintetiza los efectos: luces del semáforo, largada, piano, borde, vuelta y llegada.
 *
 *   node scripts/generate-sounds.mjs --engine <motorseamless11.wav>
 *       Además pasa el loop del motor (estéreo) a mono, sin tocar la costura del loop.
 *
 * WAV porque el decodificador de react-native-audio-api, sin FFmpeg ni las bibliotecas
 * externas (ver app.json), solo lee WAV, MP3 y FLAC. Sin dependencias: solo Node.
 * El azar (ruido) sale de una semilla fija: el script siempre genera los mismos archivos.
 */
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/** Muestras de `seconds` de duración, en silencio. */
const silence = (seconds) => new Float32Array(Math.round(seconds * RATE));

/** Ruido blanco reproducible (generador congruencial). */
function noise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 2 ** 32) * 2 - 1;
  };
}

/** Envolvente: subida lineal en `attack` s y caída exponencial con `decay` s de constante. */
function envelope(t, attack, decay) {
  if (t < attack) {
    return t / attack;
  }
  return Math.exp(-(t - attack) / decay);
}

/** Onda cuadrada con ciclo `duty` (0 a 1). */
const square = (phase, duty = 0.5) => (phase % 1 < duty ? 1 : -1);

/** Onda triangular. */
const triangle = (phase) => 1 - 4 * Math.abs((phase % 1) - 0.5);

/** Filtro pasabajos de un polo, en el lugar. */
function lowPass(samples, cutoffHz) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoffHz) / RATE);
  let y = 0;
  for (let i = 0; i < samples.length; i += 1) {
    y += a * (samples[i] - y);
    samples[i] = y;
  }
  return samples;
}

/** Suma `source` sobre `target` desde `offset` s. */
function mix(target, source, offset = 0) {
  const start = Math.round(offset * RATE);
  for (let i = 0; i < source.length && start + i < target.length; i += 1) {
    target[start + i] += source[i];
  }
  return target;
}

/** Lleva el pico a `peak` y apaga los últimos 5 ms para que no haga clic. */
function finish(samples, peak = 0.8) {
  let max = 0;
  for (const value of samples) {
    max = Math.max(max, Math.abs(value));
  }
  const gain = max > 0 ? peak / max : 1;
  const fade = Math.min(samples.length, Math.round(0.005 * RATE));
  for (let i = 0; i < samples.length; i += 1) {
    const tail = samples.length - i;
    samples[i] *= gain * (tail < fade ? tail / fade : 1);
  }
  return samples;
}

/** Pitido del semáforo: seno con un poco de segundo armónico. */
function beep(frequency, seconds, decay) {
  const out = silence(seconds);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    const phase = 2 * Math.PI * frequency * t;
    out[i] = (Math.sin(phase) + 0.3 * Math.sin(2 * phase)) * envelope(t, 0.005, decay);
  }
  return out;
}

/** Piano: "brrr", una cuadrada grave que golpea 24 veces por segundo, como los bordes del piano. */
function kerb() {
  const out = silence(0.35);
  const random = noise(7);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    const bumps = 0.5 + 0.5 * square(t * 24, 0.45);
    const body = 0.7 * square(t * 70) + 0.3 * random();
    out[i] = body * bumps * envelope(t, 0.01, 0.12);
  }
  return lowPass(out, 900);
}

/** Borde: golpe sordo (seno que baja de 140 a 45 Hz) y un chasquido de ruido al comienzo. */
function border() {
  const out = silence(0.4);
  const random = noise(11);
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    phase += (2 * Math.PI * (45 + 95 * Math.exp(-t / 0.05))) / RATE;
    const thump = Math.sin(phase) * envelope(t, 0.002, 0.09);
    const crack = random() * envelope(t, 0.001, 0.02);
    out[i] = thump + 0.5 * crack;
  }
  return lowPass(out, 2500);
}

/** Nota con onda, duración y caída dadas. */
function note(wave, frequency, seconds, decay, attack = 0.004) {
  const out = silence(seconds);
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    out[i] = wave(frequency * t) * envelope(t, attack, decay);
  }
  return out;
}

/** Vuelta completa: dos notas que suben (la5 y mi6), triangulares. */
function lap() {
  const out = silence(0.5);
  mix(out, note(triangle, 880, 0.25, 0.08));
  mix(out, note(triangle, 1318.5, 0.38, 0.12), 0.1);
  return out;
}

/** Llegada: arpegio de 8 bits (do mayor) con bajo triangular y un acorde final. */
function finishJingle() {
  const out = silence(1.5);
  const step = 0.11;
  const melody = [523.25, 659.25, 783.99, 1046.5];
  melody.forEach((frequency, i) => {
    mix(
      out,
      note((p) => 0.5 * square(p, 0.25), frequency, step * 1.6, 0.08),
      i * step,
    );
  });
  const chordAt = melody.length * step;
  for (const frequency of [1046.5, 1318.5, 1568]) {
    mix(
      out,
      note((p) => 0.35 * square(p, 0.5), frequency, 1, 0.35),
      chordAt,
    );
  }
  const bass = [130.81, 196, 261.63];
  bass.forEach((frequency, i) => {
    mix(
      out,
      note((p) => 0.8 * triangle(p), frequency, step * 2, 0.2),
      i * step * 1.5,
    );
  });
  mix(
    out,
    note((p) => 0.8 * triangle(p), 130.81, 1, 0.4),
    chordAt,
  );
  return lowPass(out, 6000);
}

/** Récord personal: campanita corta (si6 y fa#7, triangulares), brillante y sin ruido. */
function personalBest() {
  const out = silence(0.7);
  mix(out, note(triangle, 1975.5, 0.3, 0.1));
  mix(out, note(triangle, 2959.96, 0.5, 0.2), 0.09);
  return out;
}

/** Superar a otro jugador: arpegio de 8 bits que sube (sol, si, re, sol), cuadrado. */
function overtake() {
  const out = silence(0.9);
  const step = 0.08;
  [392, 493.88, 587.33, 783.99].forEach((frequency, i) => {
    mix(
      out,
      note((p) => 0.5 * square(p, 0.25), frequency, step * 2.2, 0.07),
      i * step,
    );
  });
  mix(
    out,
    note((p) => 0.3 * square(p, 0.5), 1174.66, 0.5, 0.2),
    step * 4,
  );
  return lowPass(out, 6000);
}

/**
 * Récord de la pista: fanfarria de una frase de ocho notas (do-mi-sol-do agudo y su
 * vuelta) con bajo, y un acorde largo final. Más larga y llena que la llegada, a propósito.
 */
function trackRecord() {
  const out = silence(2.4);
  const step = 0.12;
  const phrase = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1568];
  phrase.forEach((frequency, i) => {
    mix(
      out,
      note((p) => 0.5 * square(p, 0.25), frequency, step * 1.8, 0.09),
      i * step,
    );
  });
  const chordAt = phrase.length * step + 0.05;
  for (const frequency of [1046.5, 1318.5, 1568, 2093]) {
    mix(
      out,
      note((p) => 0.28 * square(p, 0.5), frequency, 1.3, 0.5),
      chordAt,
    );
  }
  [130.81, 130.81, 196, 196, 261.63, 261.63, 196, 261.63].forEach((frequency, i) => {
    mix(
      out,
      note((p) => 0.8 * triangle(p), frequency, step * 1.6, 0.15),
      i * step,
    );
  });
  mix(
    out,
    note((p) => 0.8 * triangle(p), 130.81, 1.3, 0.55),
    chordAt,
  );
  return lowPass(out, 6500);
}

/** Lee un WAV PCM de 16 bits y lo devuelve en mono. */
function readMonoWav(path) {
  const buffer = readFileSync(path);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${path} no es un WAV`);
  }
  let offset = 12;
  let format = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      format = {
        encoding: buffer.readUInt16LE(offset + 8),
        channels: buffer.readUInt16LE(offset + 10),
        rate: buffer.readUInt32LE(offset + 12),
        bits: buffer.readUInt16LE(offset + 22),
      };
    } else if (id === 'data') {
      data = buffer.subarray(offset + 8, offset + 8 + size);
    }
    offset += 8 + size + (size % 2);
  }
  if (!format || !data || format.encoding !== 1 || format.bits !== 16 || format.rate !== RATE) {
    throw new Error(`${path}: se espera PCM de 16 bits a ${RATE} Hz`);
  }
  const frames = data.length / (2 * format.channels);
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    let sum = 0;
    for (let c = 0; c < format.channels; c += 1) {
      sum += data.readInt16LE((i * format.channels + c) * 2) / 32768;
    }
    out[i] = sum / format.channels;
  }
  return out;
}

/** Escribe un WAV PCM mono de 16 bits. */
function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((value, i) => {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  const path = join(OUT_DIR, name);
  writeFileSync(path, Buffer.concat([header, data]));
  console.log(`${name}: ${(samples.length / RATE).toFixed(2)} s`);
}

mkdirSync(OUT_DIR, { recursive: true });
writeWav('light.wav', finish(beep(440, 0.22, 0.06)));
writeWav('go.wav', finish(beep(880, 0.5, 0.16)));
writeWav('kerb.wav', finish(kerb(), 0.7));
writeWav('border.wav', finish(border(), 0.9));
writeWav('lap.wav', finish(lap(), 0.7));
writeWav('finish.wav', finish(finishJingle(), 0.75));
writeWav('personal-best.wav', finish(personalBest(), 0.7));
writeWav('overtake.wav', finish(overtake(), 0.75));
writeWav('track-record.wav', finish(trackRecord(), 0.8));

const engineIndex = process.argv.indexOf('--engine');
if (engineIndex !== -1) {
  const source = process.argv[engineIndex + 1];
  if (!source) {
    throw new Error('Falta la ruta del WAV del motor después de --engine');
  }
  // Sin normalizar ni recortar: el loop tiene que seguir empalmando sin saltos.
  writeWav('engine.wav', readMonoWav(source));
}
