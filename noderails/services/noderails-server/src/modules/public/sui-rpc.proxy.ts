import type { Request, Response } from 'express';
import { suiRpcForChain } from '../payments/sui-escrow-tx.js';

const ALLOWED_CHAIN_IDS = new Set([201, 202, 203]);

type JsonRpcRequest = {
  jsonrpc?: string;
  method?: string;
  params?: unknown;
  id?: unknown;
};

function isJsonRpcCall(value: unknown): value is JsonRpcRequest & { method: string } {
  if (typeof value !== 'object' || value === null) return false;
  const method = (value as JsonRpcRequest).method;
  return typeof method === 'string' && method.trim().length > 0;
}

function normalizePayload(body: unknown): JsonRpcRequest | JsonRpcRequest[] | null {
  if (isJsonRpcCall(body)) return body;
  if (Array.isArray(body) && body.length > 0 && body.every(isJsonRpcCall)) return body;
  return null;
}

/** Browser-safe Sui JSON-RPC proxy (public fullnodes block cross-origin requests). */
export async function proxySuiRpc(req: Request, res: Response): Promise<void> {
  const chainIdRaw = req.query.chainId;
  const chainId =
    typeof chainIdRaw === 'string' ? Number(chainIdRaw) : Number(Array.isArray(chainIdRaw) ? chainIdRaw[0] : NaN);

  if (!Number.isInteger(chainId) || !ALLOWED_CHAIN_IDS.has(chainId)) {
    res.status(400).json({ error: 'Invalid chainId' });
    return;
  }

  const payload = normalizePayload(req.body);
  if (!payload) {
    res.status(400).json({ error: 'Invalid JSON-RPC request' });
    return;
  }

  const upstream = suiRpcForChain({ rpcUrl: null, chainId });
  const upstreamRes = await fetch(upstream, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const text = await upstreamRes.text();
  res.status(upstreamRes.status).type('application/json').send(text);
}
