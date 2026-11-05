import React, { useEffect, useRef } from 'react';
import vietmapgl from '@vietmap/vietmap-gl-js/dist/vietmap-gl.js';
import '@vietmap/vietmap-gl-js/dist/vietmap-gl.css';

const TILE_KEY = (import.meta as any).env?.VITE_VIETMAP_TILE_KEY || '';

interface RouteMapProps {
  // Đường đi [lng, lat] từ /api/maps?type=route
  line: [number, number][];
  bbox?: [number, number, number, number];
}

// Bản đồ nhỏ vẽ đường đi A → B. Tách chunk riêng để trang khách không phải tải thư viện bản đồ.
const RouteMap: React.FC<RouteMapProps> = ({ line, bbox }) => {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current || !TILE_KEY || line.length < 2) return;
    const map = new vietmapgl.Map({
      container: el.current,
      style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${TILE_KEY}`,
      bounds: bbox,
      fitBoundsOptions: { padding: 30 },
      attributionControl: false,
    });
    map.addControl(new vietmapgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 4 },
      });
    });
    new vietmapgl.Marker({ color: '#16a34a' }).setLngLat(line[0]).addTo(map);
    new vietmapgl.Marker({ color: '#dc2626' }).setLngLat(line[line.length - 1]).addTo(map);

    return () => map.remove();
  }, [line, bbox]);

  if (!TILE_KEY) return null;
  return <div ref={el} className="h-52 w-full rounded-xl overflow-hidden border border-slate-200" />;
};

export default RouteMap;
