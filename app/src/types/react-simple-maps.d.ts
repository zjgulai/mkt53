declare module 'react-simple-maps' {
  import { ComponentType, ReactNode } from 'react';

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
    };
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  interface GeographyProps {
    geography: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }

  interface GeographiesProps {
    geography: string | Record<string, unknown>;
    children: (data: { geographies: any[] }) => ReactNode;
  }

  interface MarkerProps {
    coordinates: [number, number];
    onClick?: () => void;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    children?: ReactNode;
  }

  interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    onMove?: (event: { coordinates: [number, number]; zoom: number }) => void;
    onMoveStart?: (event: { coordinates: [number, number]; zoom: number }) => void;
    onMoveEnd?: (event: { coordinates: [number, number]; zoom: number }) => void;
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const Marker: ComponentType<MarkerProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
}
