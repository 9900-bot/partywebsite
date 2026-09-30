import type { Constituency, Position } from "@/types/political";

const box = (west: number, south: number, east: number, north: number): Position[][] => [[[west, south], [east, south], [east, north], [west, north], [west, south]]];

export const constituencies: Constituency[] = [
  { id: "ka-shivajinagar", name: "Shivajinagar", stateId: "ka", districtId: "ka-bengaluru", constituencyNumber: 162, bounds: [[77.57, 12.97], [77.64, 13.04]], polygon: box(77.57, 12.97, 77.64, 13.04) },
  { id: "ka-jayanagar", name: "Jayanagar", stateId: "ka", districtId: "ka-bengaluru", constituencyNumber: 173, bounds: [[77.54, 12.89], [77.62, 12.97]], polygon: box(77.54, 12.89, 77.62, 12.97) },
  { id: "ka-mahadevapura", name: "Mahadevapura", stateId: "ka", districtId: "ka-bengaluru", constituencyNumber: 174, bounds: [[77.65, 12.91], [77.78, 13.08]], polygon: box(77.65, 12.91, 77.78, 13.08) },
  { id: "ka-chamundeshwari", name: "Chamundeshwari", stateId: "ka", districtId: "ka-mysuru", constituencyNumber: 215, bounds: [[76.48, 12.18], [76.66, 12.39]], polygon: box(76.48, 12.18, 76.66, 12.39) },
  { id: "ka-krishnaraja", name: "Krishnaraja", stateId: "ka", districtId: "ka-mysuru", constituencyNumber: 216, bounds: [[76.60, 12.24], [76.76, 12.39]], polygon: box(76.60, 12.24, 76.76, 12.39) },
  { id: "ka-narasimharaja", name: "Narasimharaja", stateId: "ka", districtId: "ka-mysuru", constituencyNumber: 218, bounds: [[76.65, 12.30], [76.82, 12.47]], polygon: box(76.65, 12.30, 76.82, 12.47) },
  { id: "ka-belagavi-north", name: "Belagavi Uttar", stateId: "ka", districtId: "ka-belagavi", constituencyNumber: 11, bounds: [[74.44, 15.82], [74.59, 16.02]], polygon: box(74.44, 15.82, 74.59, 16.02) },
  { id: "ka-belagavi-south", name: "Belagavi Dakshin", stateId: "ka", districtId: "ka-belagavi", constituencyNumber: 12, bounds: [[74.51, 15.72], [74.68, 15.91]], polygon: box(74.51, 15.72, 74.68, 15.91) },
  { id: "ka-gokak", name: "Gokak", stateId: "ka", districtId: "ka-belagavi", constituencyNumber: 9, bounds: [[74.77, 16.05], [74.96, 16.26]], polygon: box(74.77, 16.05, 74.96, 16.26) },
  { id: "ka-mangaluru-south", name: "Mangaluru City South", stateId: "ka", districtId: "ka-dakshina-kannada", constituencyNumber: 203, bounds: [[74.78, 12.78], [74.91, 12.93]], polygon: box(74.78, 12.78, 74.91, 12.93) },
  { id: "ka-bantval", name: "Bantval", stateId: "ka", districtId: "ka-dakshina-kannada", constituencyNumber: 205, bounds: [[74.95, 12.77], [75.13, 12.99]], polygon: box(74.95, 12.77, 75.13, 12.99) },
  { id: "ka-moodabidri", name: "Moodabidri", stateId: "ka", districtId: "ka-dakshina-kannada", constituencyNumber: 201, bounds: [[74.97, 12.99], [75.18, 13.18]], polygon: box(74.97, 12.99, 75.18, 13.18) },
  { id: "tg-jubilee-hills", name: "Jubilee Hills", stateId: "tg", districtId: "tg-hyderabad", constituencyNumber: 61, bounds: [[78.38, 17.39], [78.47, 17.48]], polygon: box(78.38, 17.39, 78.47, 17.48) },
  { id: "tg-nampally", name: "Nampally", stateId: "tg", districtId: "tg-hyderabad", constituencyNumber: 63, bounds: [[78.43, 17.34], [78.50, 17.41]], polygon: box(78.43, 17.34, 78.50, 17.41) },
  { id: "tg-malakpet", name: "Malakpet", stateId: "tg", districtId: "tg-hyderabad", constituencyNumber: 58, bounds: [[78.49, 17.34], [78.56, 17.42]], polygon: box(78.49, 17.34, 78.56, 17.42) },
  { id: "tg-serilingampally", name: "Serilingampally", stateId: "tg", districtId: "tg-rangareddy", constituencyNumber: 52, bounds: [[78.26, 17.36], [78.42, 17.52]], polygon: box(78.26, 17.36, 78.42, 17.52) },
  { id: "tg-rajendranagar", name: "Rajendranagar", stateId: "tg", districtId: "tg-rangareddy", constituencyNumber: 51, bounds: [[78.31, 17.20], [78.47, 17.36]], polygon: box(78.31, 17.20, 78.47, 17.36) },
  { id: "tg-maheshwaram", name: "Maheshwaram", stateId: "tg", districtId: "tg-rangareddy", constituencyNumber: 50, bounds: [[78.47, 17.03], [78.65, 17.25]], polygon: box(78.47, 17.03, 78.65, 17.25) },
  { id: "tg-warangal-west", name: "Warangal West", stateId: "tg", districtId: "tg-warangal", constituencyNumber: 105, bounds: [[79.53, 17.94], [79.68, 18.12]], polygon: box(79.53, 17.94, 79.68, 18.12) },
  { id: "tg-warangal-east", name: "Warangal East", stateId: "tg", districtId: "tg-warangal", constituencyNumber: 106, bounds: [[79.66, 17.94], [79.82, 18.13]], polygon: box(79.66, 17.94, 79.82, 18.13) },
  { id: "tg-parkal", name: "Parkal", stateId: "tg", districtId: "tg-warangal", constituencyNumber: 104, bounds: [[79.43, 18.13], [79.64, 18.31]], polygon: box(79.43, 18.13, 79.64, 18.31) },
  { id: "tg-karimnagar", name: "Karimnagar", stateId: "tg", districtId: "tg-karimnagar", constituencyNumber: 26, bounds: [[78.92, 18.35], [79.10, 18.52]], polygon: box(78.92, 18.35, 79.10, 18.52) },
  { id: "tg-huzurabad", name: "Huzurabad", stateId: "tg", districtId: "tg-karimnagar", constituencyNumber: 31, bounds: [[79.12, 18.15], [79.30, 18.36]], polygon: box(79.12, 18.15, 79.30, 18.36) },
  { id: "tg-manakondur", name: "Manakondur", stateId: "tg", districtId: "tg-karimnagar", constituencyNumber: 30, bounds: [[78.80, 18.15], [79.00, 18.36]], polygon: box(78.80, 18.15, 79.00, 18.36) },
];

export const constituencyById = Object.fromEntries(constituencies.map((item) => [item.id, item]));
