import type { MapPoint } from "@/components/map/points-map-impl";
export const SATELLITE_URL =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg";
export const SATELLITE_ATTRIBUTION =
  '<a href="https://cloudless.eox.at">EOxCloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2025) · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>';
export function groupMapPoints(points: MapPoint[], zoom: number, selectedId?: string | null) {
  const cells = new Map<string, MapPoint[]>();
  const size = ((360 / Math.pow(2, zoom)) * 64) / 256;
  for (const point of points) {
    if (
      !Number.isFinite(point.lat) ||
      !Number.isFinite(point.lng) ||
      Math.abs(point.lat) > 90 ||
      Math.abs(point.lng) > 180
    )
      continue;
    const latitude = (Math.max(-85, Math.min(85, point.lat)) * Math.PI) / 180;
    const y = (Math.log(Math.tan(Math.PI / 4 + latitude / 2)) * 180) / Math.PI;
    const key =
      point.id === selectedId || zoom >= 17
        ? `point:${point.id}`
        : `${Math.floor(point.lng / size)}:${Math.floor(y / size)}`;
    cells.set(key, [...(cells.get(key) ?? []), point]);
  }
  return [...cells.values()];
}
