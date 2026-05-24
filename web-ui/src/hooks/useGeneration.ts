import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, type GameRecord, type GenerateRequest } from '../api/client.js';

export type GenStatus = 'idle' | 'running' | 'done' | 'error';

export interface GenerationState {
  id: string | null;
  status: GenStatus;
  logs: string[];
  game: GameRecord | null;
  error: string | null;
}

/** Extra provider config forwarded to the backend on each generation. */
export interface ProviderOverride {
  baseUrl?: string;
  apiKey?: string;
  imageProvider?: string;
  imageBaseUrl?: string;
  imageApiKey?: string;
  imageModel?: string;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({
    id: null,
    status: 'idle',
    logs: [],
    game: null,
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const start = useCallback(
    async (
      prompt: string,
      model?: string,
      _unused?: undefined,
      override?: ProviderOverride,
    ) => {
      socketRef.current?.disconnect();
      socketRef.current = null;

      setState({ id: null, status: 'running', logs: [], game: null, error: null });

      const body: GenerateRequest = {
        prompt,
        model,
        baseUrl:       override?.baseUrl,
        apiKey:        override?.apiKey,
        imageProvider: override?.imageProvider,
        imageBaseUrl:  override?.imageBaseUrl,
        imageApiKey:   override?.imageApiKey,
        imageModel:    override?.imageModel,
      };

      let jobId: string;
      try {
        const res = await api.generate(body);
        jobId = res.id;
      } catch (err) {
        setState((prev) => ({ ...prev, status: 'error', error: String(err) }));
        return;
      }

      setState((prev) => ({ ...prev, id: jobId }));

      const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => socket.emit('subscribe', jobId));

      socket.on('log', ({ line }: { line: string }) => {
        setState((prev) => ({ ...prev, logs: [...prev.logs, line] }));
      });

      socket.on('done', async ({ id }: { id: string }) => {
        try {
          const game = await api.getGame(id);
          setState((prev) => ({ ...prev, status: 'done', game }));
        } catch {
          setState((prev) => ({ ...prev, status: 'done' }));
        }
        socket.disconnect();
      });

      socket.on('error', ({ error: err }: { error: string }) => {
        setState((prev) => ({ ...prev, status: 'error', error: err }));
        socket.disconnect();
      });
    },
    [],
  );

  const reset = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setState({ id: null, status: 'idle', logs: [], game: null, error: null });
  }, []);

  return { state, start, reset };
}
