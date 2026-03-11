// Type shims for packages whose export maps don't include "types" entries
// (needed for moduleResolution: "bundler")

declare module "react-leaflet" {
  export const MapContainer: React.ComponentType<any>
  export const TileLayer: React.ComponentType<any>
  export const Marker: React.ComponentType<any>
  export const Popup: React.ComponentType<any>
  export const Polygon: React.ComponentType<any>
  export function useMapEvents(handlers: any): any
  export function useMap(): any
}

declare module "react-markdown" {
  const ReactMarkdown: React.ComponentType<{
    children: string
    className?: string
    components?: Record<string, React.ComponentType<any>>
    [key: string]: any
  }>
  export default ReactMarkdown
}
