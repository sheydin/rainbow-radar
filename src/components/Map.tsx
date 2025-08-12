import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import styles from './map.module.css';
import { buildGridAround, computeBearingDegrees } from '../lib/geo';
import { computeRainbowProbabilityScore, getSunAnglesForTime } from '../lib/sun';
import type { OneCallDataPoint, OneCallResponse } from '../lib/owm';
import { fetchOneCall } from '../lib/owm';

export type MapViewHandle = {
  flyTo: (center: { lat: number; lon: number }, zoom?: number) => void;
};

export type MapViewProps = {
  initialCenter: { lat: number; lon: number };
  initialZoom: number;
  geolocated: boolean;
};

function MapEvents({ onMoved }: { onMoved: (center: { lat: number; lon: number }, zoom: number) => void }) {
  useMapEvents({
    moveend: (e) => {
      const m = e.target as L.Map;
      const c = m.getCenter();
      onMoved({ lat: c.lat, lon: c.lng }, m.getZoom());
    },
    zoomend: (e) => {
      const m = e.target as L.Map;
      const c = m.getCenter();
      onMoved({ lat: c.lat, lon: c.lng }, m.getZoom());
    },
  });
  return null;
}

export const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(props, ref) {
  const { initialCenter, initialZoom } = props;
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number }>(initialCenter);
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [owm, setOwm] = useState<OneCallResponse | null>(null);
  const [status, setStatus] = useState<string>('');
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);

  useImperativeHandle(ref, () => ({
    flyTo: (c, z) => {
      setCenter(c);
      setZoom(z ?? zoom);
      mapRef.current?.flyTo([c.lat, c.lon], z ?? zoom, { duration: 0.8 });
    },
  }), [zoom]);

  const handleMoved = (c: { lat: number; lon: number }, z: number) => {
    setCenter(c);
    setZoom(z);
  };

  useEffect(() => {
    if (!center) return;
    let aborted = false;
    (async () => {
      try {
        setStatus('Loading weather...');
        const data = await fetchOneCall(center.lat, center.lon);
        if (!aborted) {
          setOwm(data);
          setStatus('');
        }
      } catch (e) {
        console.error(e);
        if (!aborted) setStatus('Weather unavailable.');
      }
    })();
    return () => { aborted = true; };
  }, [center.lat, center.lon]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!heatLayerRef.current) {
      heatLayerRef.current = (L as any).heatLayer([], {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.0: '#0000ff',
          0.25: '#00ffff',
          0.5: '#00ff00',
          0.75: '#ffff00',
          1.0: '#ff0000',
        },
      }).addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (!heatLayerRef.current || !owm) return;
    const map = mapRef.current;
    if (!map) return;

    const grid = buildGridAround(center.lat, center.lon, 25000, zoom >= 13 ? 1500 : 2000);

    const now = new Date();
    const effectiveTs = new Date(now.getTime() + timeOffsetHours * 3600 * 1000);

    const sun = getSunAnglesForTime(center.lat, center.lon, effectiveTs);

    if (sun.elevationDeg <= 0 || sun.elevationDeg >= 42) {
      const empty: [number, number, number][] = [];
      heatLayerRef.current.setLatLngs(empty);
      setStatus('Conditions unfavorable (Sun too low/high).');
      return;
    }

    const points: [number, number, number][] = [];

    for (const cell of grid) {
      const bearing = computeBearingDegrees(center.lat, center.lon, cell.lat, cell.lon);
      const weatherAtCell: OneCallDataPoint = (() => {
        if (owm.hourly && owm.hourly.length > timeOffsetHours) {
          return owm.hourly[timeOffsetHours];
        }
        return owm.current;
      })();

      const rps = computeRainbowProbabilityScore({
        userLat: center.lat,
        userLon: center.lon,
        cellLat: cell.lat,
        cellLon: cell.lon,
        antisolarAzimuthDeg: (sun.azimuthDeg + 180) % 360,
        sunElevationDeg: sun.elevationDeg,
        weather: weatherAtCell,
        bearingUserToCellDeg: bearing,
      });

      if (rps > 0) {
        points.push([cell.lat, cell.lon, Math.max(0, Math.min(1, rps))]);
      }
    }

    heatLayerRef.current.setLatLngs(points);
    setStatus(points.length ? '' : 'No likely rainbow areas nearby.');
  }, [center.lat, center.lon, zoom, timeOffsetHours, owm]);

  return (
    <div className={styles.wrapper}>
      <MapContainer
        center={[center.lat, center.lon] as LatLngExpression}
        zoom={zoom}
        scrollWheelZoom
        className={styles.map}
        ref={(m: L.Map | null) => { if (m) mapRef.current = m; }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className={styles.grayTiles}
        />
        <MapEvents onMoved={handleMoved} />
      </MapContainer>
      <div className={styles.overlayControls}>
        <div className={styles.legend}>
          <div className={styles.legendTitle}>Rainbow likelihood</div>
          <div className={styles.gradientBar} />
          <div className={styles.legendScale}>
            <span>0</span>
            <span>1</span>
          </div>
        </div>
        <div className={styles.timeToggle}>
          <button className={timeOffsetHours === 0 ? styles.active : ''} onClick={() => setTimeOffsetHours(0)}>Now</button>
          <button className={timeOffsetHours === 1 ? styles.active : ''} onClick={() => setTimeOffsetHours(1)}>+1h</button>
          <button className={timeOffsetHours === 2 ? styles.active : ''} onClick={() => setTimeOffsetHours(2)}>+2h</button>
        </div>
        {status && <div className={styles.status}>{status}</div>}
      </div>
    </div>
  );
});