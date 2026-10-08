#!/usr/bin/env node
/**
 * One-off: generate DevRel feedback prompt MP3 via ElevenLabs TTS.
 * Usage: ELEVENLABS_API_KEY=... node scripts/generate-devrel-feedback-audio.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'apps/landing/public/audio/devrel-feedback-prompt.mp3');
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'kPzsL2i3teMYv0FxEYQ6';
const apiKey = process.env.ELEVENLABS_API_KEY;
const text =
  process.env.ELEVENLABS_TEXT ||
  'Hey - did you like NodeRails? We would love your feedback. You can fill the form, or speak up here.';

if (!apiKey) {
  console.error('Missing ELEVENLABS_API_KEY');
  process.exit(1);
}

const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
    Accept: 'audio/mpeg',
  },
  body: JSON.stringify({
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.35,
      use_speaker_boost: true,
    },
  }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`ElevenLabs TTS failed (${res.status}): ${body}`);
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, buf);
console.log(`Wrote ${outPath} (${buf.length} bytes)`);
