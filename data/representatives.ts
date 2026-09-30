import type { MLA } from "@/types/political";

export const representatives: MLA[] = [
  { id: "rep-01", name: "Aarav Deshmukh", constituencyId: "ka-shivajinagar", partyId: "INC", currentTermStart: 2019, consecutiveWins: 2, totalWins: 2 },
  { id: "rep-02", name: "Meera Kulkarni", constituencyId: "ka-jayanagar", partyId: "BJP", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
  { id: "rep-03", name: "Kiran Reddy", constituencyId: "ka-mahadevapura", partyId: "BJP", currentTermStart: 2018, consecutiveWins: 2, totalWins: 3 },
  { id: "rep-04", name: "Nandini Gowda", constituencyId: "ka-chamundeshwari", partyId: "JDS", currentTermStart: 2018, consecutiveWins: 2, totalWins: 2 },
  { id: "rep-05", name: "Rohan Prasad", constituencyId: "ka-krishnaraja", partyId: "INC", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
  { id: "rep-06", name: "Farah Siddiqui", constituencyId: "ka-narasimharaja", partyId: "INC", currentTermStart: 2013, consecutiveWins: 3, totalWins: 3 },
  { id: "rep-07", name: "Sanjay Patil", constituencyId: "ka-belagavi-north", partyId: "BJP", currentTermStart: 2018, consecutiveWins: 2, totalWins: 2 },
  { id: "rep-08", name: "Lavanya Naik", constituencyId: "ka-belagavi-south", partyId: "INC", currentTermStart: 2023, consecutiveWins: 1, totalWins: 2 },
  { id: "rep-09", name: "Manoj Jadhav", constituencyId: "ka-gokak", partyId: "BJP", currentTermStart: 2013, consecutiveWins: 3, totalWins: 4 },
  { id: "rep-10", name: "Ananya Shetty", constituencyId: "ka-mangaluru-south", partyId: "INC", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
  { id: "rep-11", name: "Vikram Rai", constituencyId: "ka-bantval", partyId: "BJP", currentTermStart: 2018, consecutiveWins: 2, totalWins: 2 },
  { id: "rep-12", name: "Leela Hegde", constituencyId: "ka-moodabidri", partyId: "JDS", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
  { id: "rep-13", name: "Samira Khan", constituencyId: "tg-jubilee-hills", partyId: "INC", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
  { id: "rep-14", name: "Imran Qureshi", constituencyId: "tg-nampally", partyId: "AIMIM", currentTermStart: 2018, consecutiveWins: 2, totalWins: 2 },
  { id: "rep-15", name: "Arjun Varma", constituencyId: "tg-malakpet", partyId: "AIMIM", currentTermStart: 2014, consecutiveWins: 3, totalWins: 3 },
  { id: "rep-16", name: "Kavya Rao", constituencyId: "tg-serilingampally", partyId: "BRS", currentTermStart: 2018, consecutiveWins: 2, totalWins: 2 },
  { id: "rep-17", name: "Mohit Reddy", constituencyId: "tg-rajendranagar", partyId: "INC", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
  { id: "rep-18", name: "Divya Ramesh", constituencyId: "tg-maheshwaram", partyId: "BRS", currentTermStart: 2018, consecutiveWins: 2, totalWins: 2 },
  { id: "rep-19", name: "Pranav Rao", constituencyId: "tg-warangal-west", partyId: "INC", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
  { id: "rep-20", name: "Suhasini Devi", constituencyId: "tg-warangal-east", partyId: "BRS", currentTermStart: 2014, consecutiveWins: 3, totalWins: 3 },
  { id: "rep-21", name: "Nikhil Reddy", constituencyId: "tg-parkal", partyId: "INC", currentTermStart: 2023, consecutiveWins: 1, totalWins: 2 },
  { id: "rep-22", name: "Tejaswini Rao", constituencyId: "tg-karimnagar", partyId: "BJP", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
  { id: "rep-23", name: "Aditya Reddy", constituencyId: "tg-huzurabad", partyId: "BJP", currentTermStart: 2018, consecutiveWins: 2, totalWins: 2 },
  { id: "rep-24", name: "Priya Kumar", constituencyId: "tg-manakondur", partyId: "INC", currentTermStart: 2023, consecutiveWins: 1, totalWins: 1 },
];

export const representativeByConstituency = Object.fromEntries(representatives.map((rep) => [rep.constituencyId, rep]));
