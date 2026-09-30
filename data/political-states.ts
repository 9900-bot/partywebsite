import type { StateRegion } from "@/types/political";

export const politicalStates: StateRegion[] = [
  {
    id: "ka", name: "Karnataka", mapName: "Karnataka", slug: "karnataka",
    constituencyCount: 224, districtCount: 31, bounds: [[74.02, 11.55], [78.62, 18.55]],
    partySeats: { INC: 135, BJP: 66, JDS: 19, OTH: 4 }, demoCoverage: "complete",
  },
  {
    id: "tg", name: "Telangana", mapName: "Telangana", slug: "telangana",
    constituencyCount: 119, districtCount: 33, bounds: [[77.15, 15.72], [81.18, 19.93]],
    partySeats: { INC: 64, BRS: 39, BJP: 8, AIMIM: 7, OTH: 1 }, demoCoverage: "complete",
  },
  {
    id: "mh", name: "Maharashtra", mapName: "Maharashtra", slug: "maharashtra",
    constituencyCount: 288, districtCount: 36, bounds: [[72.55, 15.55], [80.95, 22.15]],
    partySeats: {}, demoCoverage: "overview",
  },
  {
    id: "tn", name: "Tamil Nadu", mapName: "Tamil Nadu", slug: "tamil-nadu",
    constituencyCount: 234, districtCount: 38, bounds: [[76.18, 8.05], [80.35, 13.58]],
    partySeats: {}, demoCoverage: "overview",
  },
];

export const stateById = Object.fromEntries(politicalStates.map((state) => [state.id, state]));
