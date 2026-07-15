export interface Quake {
  id: string;
  time: Date;
  mag: number;
  depth: number; // km
  lat: number;
  lng: number;
  place: string;
}
