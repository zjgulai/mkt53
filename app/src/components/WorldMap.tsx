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

const MAP_FRAME = {
  left: 10,
  top: 20,
  width: 80,
  height: 58,
};

function projectCoordinates([longitude, latitude]: [number, number]) {
  const x = MAP_FRAME.left + ((longitude + 180) / 360) * MAP_FRAME.width;
  const y = MAP_FRAME.top + ((90 - latitude) / 180) * MAP_FRAME.height;

  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}

export default function WorldMap({ markers, activeId, onMarkerClick }: WorldMapProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#F5F0EB]">
      <img
        src="/images/world-map.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-95"
      />
      <div className="absolute inset-0 bg-white/5" />

      {markers.map((marker) => {
        const position = projectCoordinates(marker.coordinates);
        const isActive = activeId === marker.id;

        return (
          <button
            key={marker.id}
            type="button"
            aria-label={`${marker.name}：${marker.status}`}
            onClick={() => onMarkerClick(marker.id)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
            style={position}
          >
            <span
              className={`absolute left-1/2 top-1/2 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all ${isActive ? 'h-8 w-8 opacity-20' : 'h-6 w-6 opacity-15 group-hover:opacity-25'}`}
              style={{ backgroundColor: marker.color }}
            />
            <span
              className={`block rounded-full border-2 border-white shadow-sm transition-all ${isActive ? 'h-4 w-4' : 'h-3 w-3 group-hover:h-3.5 group-hover:w-3.5'}`}
              style={{
                backgroundColor: marker.color,
                boxShadow: isActive ? `0 0 10px ${marker.color}` : `0 2px 6px ${marker.color}80`,
              }}
            />
            <span
              className={`absolute left-1/2 top-[-1.4rem] -translate-x-1/2 whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#1d1d1f] shadow-sm transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              {marker.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
