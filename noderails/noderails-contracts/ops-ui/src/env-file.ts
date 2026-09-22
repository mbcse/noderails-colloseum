import { readFileSync, writeFileSync, existsSync, renameSync, copyFileSync } from 'node:fs';
import { ENV_KEYS, type EnvKey } from './catalog.js';

export function parseEnvFile(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function quoteValue(value: string): string {
  if (value === '') return '';
  if (/[\s#"']/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function readAllowlistedEnv(envPath: string, examplePath: string): Record<EnvKey, string> {
  let raw = '';
  if (existsSync(envPath)) {
    raw = readFileSync(envPath, 'utf8');
  } else if (existsSync(examplePath)) {
    raw = readFileSync(examplePath, 'utf8');
  }
  const parsed = parseEnvFile(raw);
  const values = {} as Record<EnvKey, string>;
  for (const key of ENV_KEYS) {
    values[key] = parsed[key] ?? '';
  }
  return values;
}

export function mergeEnvFile(
  envPath: string,
  examplePath: string,
  updates: Record<string, string>,
): Record<EnvKey, string> {
  for (const key of Object.keys(updates)) {
    if (!ENV_KEYS.includes(key as EnvKey)) {
      throw new Error(`Unknown env key: ${key}`);
    }
  }

  if (!existsSync(envPath)) {
    if (existsSync(examplePath)) {
      copyFileSync(examplePath, envPath);
    } else {
      writeFileSync(envPath, '', { mode: 0o600 });
    }
  }

  const original = readFileSync(envPath, 'utf8');
  const lines = original.split(/\r?\n/);
  const seen = new Set<string>();
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return line;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}=${quoteValue(updates[key]!)}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      if (next.length && next[next.length - 1] !== '') next.push('');
      next.push(`${key}=${quoteValue(value)}`);
    }
  }

  const tmp = `${envPath}.tmp`;
  writeFileSync(tmp, next.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });
  renameSync(tmp, envPath);
  return readAllowlistedEnv(envPath, examplePath);
}
