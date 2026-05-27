import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export interface MapMarker {
  name: string;
  coordinates: [number, number];
  color: string;
  status: string;
  id: string;
}

interface WorldMapProps {
  markers: MapMarker[];
  activeId: string | null;
  onMarkerClick: (id: string) => void;
}

export default function WorldMap({ markers, activeId, onMarkerClick }: WorldMapProps) {
  return (
    <ComposableMap
      projection="geoNaturalEarth1"
      projectionConfig={{ scale: 140, center: [20, 20] }}
      style={{ width: '100%', height: '100%' }}
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }: { geographies: any[] }) =>
          geographies.map((geo: any) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill={geo.properties.name === 'Antarctica' ? '#F0EBE6' : '#FBF8F5'}
              stroke="#E8E0D9"
              strokeWidth={0.5}
              style={{
                default: { outline: 'none' },
                hover: { fill: '#F5EDE8', outline: 'none' },
                pressed: { outline: 'none' },
              }}
            />
          ))
        }
      </Geographies>
      {markers.map((m) => {
        const isActive = activeId === m.id;
        return (
          <Marker
            key={m.id}
            coordinates={m.coordinates}
            onClick={() => onMarkerClick(m.id)}
            style={{
              default: { cursor: 'pointer' },
              hover: { cursor: 'pointer' },
            }}
          >
            <circle
              r={isActive ? 8 : 6}
              fill={m.color}
              stroke="white"
              strokeWidth={2}
              style={{
                filter: isActive ? `drop-shadow(0 0 6px ${m.color})` : `drop-shadow(0 2px 3px ${m.color}60)`,
                transition: 'all 0.2s ease',
              }}
            />
            {isActive && (
              <circle r={14} fill={m.color} opacity={0.15}>
                <animate attributeName="r" from={10} to={18} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from={0.3} to={0} dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <text
              textAnchor="middle"
              y={-16}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                fill: '#1d1d1f',
                textShadow: '0 1px 2px rgba(255,255,255,0.8)',
              }}
            >
              {m.name}
            </text>
          </Marker>
        );
      })}
    </ComposableMap>
  );
}
