import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './app.module.css';
import { MapView } from './components/Map';
import type { MapViewHandle } from './components/Map';
import { SearchBar } from './components/SearchBar';

export type LatLng = { lat: number; lon: number };

function useGeolocation() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
    return () => {
      // no watch used; nothing to cleanup
    };
  }, []);

  return { position, error } as const;
}

export default function App() {
  const mapRef = useRef<MapViewHandle>(null);
  const { position, error } = useGeolocation();
  const [center, setCenter] = useState<LatLng | null>(null);

  useEffect(() => {
    if (position) {
      setCenter(position);
      mapRef.current?.flyTo(position, 12);
    }
  }, [position]);

  const handleLocateMe = useCallback(() => {
    if (position) {
      setCenter(position);
      mapRef.current?.flyTo(position, 12);
    }
  }, [position]);

  const onSearchSelected = useCallback((lat: number, lon: number) => {
    const p = { lat, lon };
    setCenter(p);
    mapRef.current?.flyTo(p, 12);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <SearchBar onSelected={onSearchSelected} />
        <button className={styles.locateBtn} onClick={handleLocateMe}>Locate me</button>
      </div>
      <MapView ref={mapRef} initialCenter={center ?? { lat: 0, lon: 0 }} initialZoom={center ? 12 : 2} geolocated={!!position} />
      {!position && (
        <div className={styles.toast}>Enable location to center the map and compute a local rainbow forecast.</div>
      )}
      {error && <div className={styles.toastError}>{error}</div>}
    </div>
  );
}
