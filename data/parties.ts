import type { Party } from "@/types/political";

export const parties: Party[] = [
  { id: "INC", name: "Indian National Congress", abbreviation: "INC", color: "#287FB8" },
  { id: "BJP", name: "Bharatiya Janata Party", abbreviation: "BJP", color: "#E8872D" },
  { id: "JDS", name: "Janata Dal (Secular)", abbreviation: "JD(S)", color: "#5E9963" },
  { id: "BRS", name: "Bharat Rashtra Samithi", abbreviation: "BRS", color: "#C8568B" },
  { id: "AIMIM", name: "All India Majlis-e-Ittehadul Muslimeen", abbreviation: "AIMIM", color: "#238269" },
  { id: "OTH", name: "Other parties / independents", abbreviation: "Others", color: "#78879A" },
];

export const partyById = Object.fromEntries(parties.map((party) => [party.id, party]));
