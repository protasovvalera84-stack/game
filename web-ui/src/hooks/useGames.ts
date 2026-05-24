import { useCallback, useEffect, useState } from 'react';
import { api, type GameRecord } from '../api/client.js';

export function useGames() {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listGames();
      setGames(data);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id: string) => {
      await api.deleteGame(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    },
    [],
  );

  return { games, loading, error, refresh, remove };
}
