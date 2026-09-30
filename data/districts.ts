import type { District, Position } from "@/types/political";

const polygon = (west: number, south: number, east: number, north: number): Position[][] => [[
  [west, south], [east, south + .04], [east - .03, north], [west + .02, north - .02], [west, south],
]];

export const districts: District[] = [
  { id: "ka-bengaluru", stateId: "ka", name: "Bengaluru Urban", slug: "bengaluru-urban", constituencyCount: 28, bounds: [[77.37, 12.72], [77.82, 13.23]], polygon: polygon(77.37, 12.72, 77.82, 13.23) },
  { id: "ka-mysuru", stateId: "ka", name: "Mysuru", slug: "mysuru", constituencyCount: 11, bounds: [[76.32, 11.95], [77.02, 12.68]], polygon: polygon(76.32, 11.95, 77.02, 12.68) },
  { id: "ka-belagavi", stateId: "ka", name: "Belagavi", slug: "belagavi", constituencyCount: 18, bounds: [[74.18, 15.55], [75.06, 16.45]], polygon: polygon(74.18, 15.55, 75.06, 16.45) },
  { id: "ka-dakshina-kannada", stateId: "ka", name: "Dakshina Kannada", slug: "dakshina-kannada", constituencyCount: 8, bounds: [[74.72, 12.55], [75.42, 13.28]], polygon: polygon(74.72, 12.55, 75.42, 13.28) },
  { id: "tg-hyderabad", stateId: "tg", name: "Hyderabad", slug: "hyderabad", constituencyCount: 15, bounds: [[78.31, 17.24], [78.61, 17.55]], polygon: polygon(78.31, 17.24, 78.61, 17.55) },
  { id: "tg-rangareddy", stateId: "tg", name: "Rangareddy", slug: "rangareddy", constituencyCount: 14, bounds: [[77.82, 16.86], [78.72, 17.65]], polygon: polygon(77.82, 16.86, 78.72, 17.65) },
  { id: "tg-warangal", stateId: "tg", name: "Warangal", slug: "warangal", constituencyCount: 7, bounds: [[79.34, 17.78], [80.08, 18.38]], polygon: polygon(79.34, 17.78, 80.08, 18.38) },
  { id: "tg-karimnagar", stateId: "tg", name: "Karimnagar", slug: "karimnagar", constituencyCount: 4, bounds: [[78.62, 18.15], [79.37, 18.87]], polygon: polygon(78.62, 18.15, 79.37, 18.87) },
];

export const districtById = Object.fromEntries(districts.map((district) => [district.id, district]));
