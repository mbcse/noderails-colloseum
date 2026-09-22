import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_FORGE = join(homedir(), '.foundry', 'bin', 'forge');

function foundryBinDir(env: NodeJS.ProcessEnv): string | null {
  const explicit = env.FOUNDRY_BIN?.trim();
  if (explicit) {
    const forgePath = explicit.endsWith('forge') ? explicit : join(explicit, 'forge');
    if (existsSync(forgePath)) return join(forgePath, '..');
  }
  const dir = join(homedir(), '.foundry', 'bin');
  if (existsSync(join(dir, 'forge'))) return dir;
  return null;
}

/** Put `~/.foundry/bin` (or `FOUNDRY_BIN`) first so ops-ui matches `foundryup` in a login shell. */
export function withFoundryPath(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const dir = foundryBinDir(env);
  if (!dir) return { ...env };
  const sep = process.platform === 'win32' ? ';' : ':';
  const pathVar = env.PATH ?? '';
  const parts = pathVar.split(sep).filter(Boolean);
  if (parts.includes(dir)) return { ...env };
  const next = `${dir}${sep}${pathVar}`;
  return { ...env, PATH: next };
}

export function resolveForgeExecutable(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.FOUNDRY_BIN?.trim();
  if (explicit && existsSync(explicit)) return explicit;
  if (existsSync(DEFAULT_FORGE)) return DEFAULT_FORGE;
  return 'forge';
}
