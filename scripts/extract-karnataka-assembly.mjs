import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlPath = path.join(process.env.TEMP ?? process.env.TMP ?? ".", "karnataka_assembly.html");
const html = fs.readFileSync(htmlPath, "utf8");
const mainUrl = "https://en.wikipedia.org/wiki/Karnataka_Legislative_Assembly";
const transcludedUrl = "https://en.wikipedia.org/wiki/16th_Karnataka_Assembly";
const mainPageRevisionId = Number(html.match(/"wgCurRevisionId":(\d+)/)?.[1] ?? 0) || null;
const mainPageModifiedAt = html.match(/"dateModified":"([^"]+)"/)?.[1] ?? null;

const decode = (value) => value
  .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&ndash;/gi, "–")
  .replace(/&mdash;/gi, "—")
  .replace(/\s+/g, " ")
  .trim();

const absoluteWikiUrl = (href) => href
  ? (href.startsWith("http") ? href : `https://en.wikipedia.org${href}`)
  : null;

const start = html.indexOf('<h2 id="Members_of_Legislative_Assembly"');
const tableStart = html.indexOf("<table", start);
const tableEnd = html.indexOf("</table>", tableStart);
const table = html.slice(tableStart, tableEnd + 8);
const rowHtml = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);

const parsedRows = rowHtml.slice(1).map((row) => {
  const cells = [...row.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map((match) => ({
    attrs: match[2],
    html: match[3],
    text: decode(match[3]),
    href: absoluteWikiUrl(match[3].match(/href="([^"]+)"/i)?.[1] ?? null),
    color: match[2].match(/background-color:\s*(#[0-9A-Fa-f]{6})/i)?.[1]?.toUpperCase() ?? null,
    partyName: match[2].match(/data-sort-value="([^"]+)"/i)?.[1] ?? null,
  }));
  return { row, cells };
});

let currentDistrict = null;
let currentSeat = null;
const seats = [];

for (const { cells } of parsedRows) {
  if (!cells.length) continue;
  let offset = 0;
  if (!/^\d+$/.test(cells[0].text) && cells.length >= 7) {
    currentDistrict = cells[0].text;
    offset = 1;
  }

  if (/^\d+$/.test(cells[offset]?.text ?? "")) {
    const number = Number(cells[offset].text);
    const constituencyCell = cells[offset + 1];
    const memberCell = cells[offset + 2];
    const swatchCell = cells[offset + 3];
    const partyCell = cells[offset + 4];
    const remarksCell = cells[offset + 5];
    const statusMatch = constituencyCell.text.match(/\((SC|ST)\)\s*$/i);
    currentSeat = {
      acNumber: number,
      constituency: constituencyCell.text.replace(/\s*\((SC|ST)\)\s*$/i, ""),
      reservation: statusMatch ? statusMatch[1].toUpperCase() : "GEN",
      district: currentDistrict,
      currentMember: memberCell?.text || null,
      party: partyCell?.text || null,
      partyFullName: swatchCell?.partyName || null,
      partyColor: swatchCell?.color || null,
      remarks: remarksCell?.text || null,
      constituencySourceUrl: constituencyCell.href,
      tableSourceUrl: mainUrl,
      transcludedTableSourceUrl: transcludedUrl,
      historicalEntries: [],
    };
    seats.push(currentSeat);
    continue;
  }

  // A row without an AC number is a continuation of a rowspan after a death,
  // resignation or election to Parliament. The final continuation is current.
  if (currentSeat && cells.length >= 1 && /vacant/i.test(cells[0].text)) {
    const prior = {
      member: currentSeat.currentMember,
      party: currentSeat.party,
      partyFullName: currentSeat.partyFullName,
      partyColor: currentSeat.partyColor,
      remarks: currentSeat.remarks,
    };
    currentSeat.historicalEntries.push(prior);
    currentSeat.currentMember = null;
    currentSeat.party = "VAC";
    currentSeat.partyFullName = "Vacant";
    currentSeat.partyColor = "#FFFFFF";
    currentSeat.remarks = "Vacant; previous incumbent and vacancy reason retained in historicalEntries.";
  } else if (currentSeat && cells.length >= 4) {
    const prior = {
      member: currentSeat.currentMember,
      party: currentSeat.party,
      partyFullName: currentSeat.partyFullName,
      partyColor: currentSeat.partyColor,
      remarks: currentSeat.remarks,
    };
    currentSeat.historicalEntries.push(prior);

    currentSeat.currentMember = cells[0].text || null;
    currentSeat.partyColor = cells[1].color || null;
    currentSeat.partyFullName = cells[1].partyName || null;
    currentSeat.party = cells[2].text || null;
    currentSeat.remarks = cells[3].text || null;
  }
}

// The page's composition table lists Dharwad as vacant, while the transcluded
// member table still names Vinay Kulkarni. Prefer the explicit current summary,
// but retain the contradictory member-table value for auditability.
const dharwad = seats.find((seat) => seat.acNumber === 71);
if (dharwad) {
  dharwad.historicalEntries.push({
    member: dharwad.currentMember,
    party: dharwad.party,
    partyFullName: dharwad.partyFullName,
    partyColor: dharwad.partyColor,
    remarks: "The members table still lists this member, but the main page composition table explicitly lists Dharwad as vacant.",
  });
  dharwad.currentMember = null;
  dharwad.party = "VAC";
  dharwad.partyFullName = "Vacant";
  dharwad.partyColor = "#FFFFFF";
  dharwad.remarks = "Marked vacant from the page's composition table; see historicalEntries for the member-table discrepancy.";
}

const partyInfo = {
  INC: { partyName: "Indian National Congress", abbreviation: "INC", seats: 136, color: "#00BFFF" },
  BJP: { partyName: "Bharatiya Janata Party", abbreviation: "BJP", seats: 63, color: "#FF9933" },
  "JD(S)": { partyName: "Janata Dal (Secular)", abbreviation: "JD(S)", seats: 18, color: "#02865A" },
  SKP: { partyName: "Sarvodaya Karnataka Paksha", abbreviation: "SKP", seats: 1, color: "#FFFF00" },
  IND: { partyName: "Independent", abbreviation: "IND", seats: 4, color: "#DCDCDC" },
  VAC: { partyName: "Vacant", abbreviation: "VAC", seats: 2, color: "#FFFFFF" },
};

for (const seat of seats) {
  const info = partyInfo[seat.party];
  if (info) {
    seat.partyFullName = info.partyName;
    seat.partyColor = info.color;
  }
}

const observedCounts = seats.reduce((counts, seat) => {
  counts[seat.party] = (counts[seat.party] ?? 0) + 1;
  return counts;
}, {});

const missingNumbers = Array.from({ length: 224 }, (_, index) => index + 1)
  .filter((number) => !seats.some((seat) => seat.acNumber === number));
const duplicateNumbers = [...new Set(seats.map((seat) => seat.acNumber)
  .filter((number, index, all) => all.indexOf(number) !== index))];
const ambiguities = [
  {
    acNumber: 71,
    constituency: "Dharwad",
    issue: "The page composition table names Dharwad as vacant, while the transcluded MLA table still lists Vinay Kulkarni (INC). The normalized current record is Vacant and the contradictory row is preserved in historicalEntries.",
  },
  {
    issue: "After applying both vacancies named in the composition table (Dharwad and Hiriyur), the 224 normalized seat records contain INC 135 and IND 5, while the same page's party summary states INC 136 and IND 4. The source is internally inconsistent; no unsupported reassignment was made.",
  },
];

const output = {
  generatedAt: new Date().toISOString(),
  retrievalDate: "2026-10-01",
  source: {
    mainUrl,
    mainPageRevisionId,
    mainPageModifiedAt,
    transcludedMembersTableUrl: transcludedUrl,
    scope: "Current Karnataka Legislative Assembly composition and the transcluded members table as visible on the main source page.",
    attribution: "Wikipedia contributors; party colors are copied from the rendered Wikipedia swatches in the members table.",
  },
  assembly: {
    name: "Karnataka Legislative Assembly",
    term: "16th Karnataka Assembly",
    termPeriod: "2023–2028",
    totalSeats: 224,
    electionDate: "2023-05-10",
    votingSystem: "First past the post",
  },
  parties: Object.values(partyInfo).map((party) => ({
    ...party,
    colorSource: party.abbreviation === "VAC"
      ? `${mainUrl} (composition table vacancy swatch)`
      : `${mainUrl} (rendered party swatches in the members table)`,
  })),
  constituencies: seats.sort((a, b) => a.acNumber - b.acNumber),
  validation: {
    expectedConstituencyCount: 224,
    extractedConstituencyCount: seats.length,
    uniqueAcNumberCount: new Set(seats.map((seat) => seat.acNumber)).size,
    missingAcNumbers: missingNumbers,
    duplicateAcNumbers: duplicateNumbers,
    expectedPartyCounts: Object.fromEntries(Object.values(partyInfo).map((party) => [party.abbreviation, party.seats])),
    observedPartyCounts: observedCounts,
    passedSeatNumberValidation: seats.length === 224 && missingNumbers.length === 0 && duplicateNumbers.length === 0,
    passedPartyCountValidation: Object.values(partyInfo).every((party) => observedCounts[party.abbreviation] === party.seats),
    ambiguousEntries: ambiguities,
  },
};

fs.mkdirSync(path.join(root, "data", "scraped"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data", "scraped", "karnataka-assembly-source.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(JSON.stringify(output.validation, null, 2));
