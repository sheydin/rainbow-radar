import { useCallback, useRef, useState } from 'react';
import styles from './searchbar.module.css';

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

export function SearchBar({ onSelected }: { onSelected: (lat: number, lon: number) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'RainbowRadar/1.0' }, signal: ctrl.current.signal });
      if (!res.ok) throw new Error('Geocoding failed');
      const data = (await res.json()) as NominatimResult[];
      if (data && data.length > 0) {
        const r = data[0];
        onSelected(parseFloat(r.lat), parseFloat(r.lon));
      } else {
        setError('No results');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message ?? 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [onSelected]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  }, [query, doSearch]);

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <input
        className={styles.input}
        placeholder="Search place or address"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button className={styles.button} type="submit" disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </form>
  );
}