import { representatives } from "@/data/representatives";
import type { ElectionResult } from "@/types/political";

const rivals = ["BJP", "INC", "JDS", "BRS", "AIMIM"].filter(Boolean);

function createHistory(constituencyId: string, currentParty: string, candidateName: string, index: number): ElectionResult[] {
  const stateYears = constituencyId.startsWith("tg-") ? [2014, 2018, 2023] : [2013, 2018, 2023];
  const rivalParty = rivals.find((party) => party !== currentParty && !(constituencyId.startsWith("ka-") && party === "BRS")) ?? "OTH";
  const previousParty = index % 3 === 0 ? rivalParty : currentParty;
  return stateYears.map((year, yearIndex) => {
    const isLatest = yearIndex === stateYears.length - 1;
    const winnerParty = isLatest ? currentParty : yearIndex === 0 ? previousParty : currentParty;
    const winnerName = isLatest ? candidateName : `${["Neha", "Rahul", "Aditi", "Sameer"][index % 4]} ${["Rao", "Patil", "Reddy", "Kumar"][yearIndex]}`;
    const winnerPct = Number((48.4 + ((index * 7 + yearIndex * 3) % 9) + (isLatest ? 1.8 : 0)).toFixed(1));
    const runnerPct = Number((38.1 + ((index * 5 + yearIndex * 2) % 6)).toFixed(1));
    const totalVotes = 148000 + index * 2100;
    const winnerVotes = Math.round(totalVotes * winnerPct / 100);
    const runnerVotes = Math.round(totalVotes * runnerPct / 100);
    return {
      constituencyId,
      year,
      winningMargin: winnerVotes - runnerVotes,
      candidates: [
        { candidateId: `${constituencyId}-${year}-1`, candidateName: winnerName, partyId: winnerParty, votes: winnerVotes, votePercentage: winnerPct, position: 1 },
        { candidateId: `${constituencyId}-${year}-2`, candidateName: `${["N. Chandra", "R. Sharma", "P. Naidu", "M. Shetty"][index % 4]}`, partyId: winnerParty === rivalParty ? currentParty : rivalParty, votes: runnerVotes, votePercentage: runnerPct, position: 2 },
        { candidateId: `${constituencyId}-${year}-3`, candidateName: "Other candidates", partyId: "OTH", votes: totalVotes - winnerVotes - runnerVotes, votePercentage: Number((100 - winnerPct - runnerPct).toFixed(1)), position: 3 },
      ],
    };
  });
}

export const electionResults = representatives.flatMap((rep, index) => createHistory(rep.constituencyId, rep.partyId, rep.name, index));
