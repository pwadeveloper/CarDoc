import manifest from "../knowledge/manuals.json" with { type: "json" };
export const manuals = manifest;
export type ManualId = "jp-early" | "jp-late";
export type ManualTopic = {
  id: string;
  title: string;
  keywords: string;
  early: number;
  late: number;
  length: number;
};
// Printed page numbers verified against each edition's table of contents; PDF offset is +4.
export const manualTopics: ManualTopic[] = [
  [
    "keys",
    "Keys & remote",
    "key remote fob smart entry battery keyless",
    22,
    22,
    6,
  ],
  ["entry", "Smart entry", "smart entry unlock locking door", 28, 28, 9],
  ["trunk", "Trunk", "trunk boot open latch", 43, 43, 4],
  [
    "seat",
    "Seats & memory",
    "seat seating memory position adjustment",
    47,
    47,
    8,
  ],
  ["seatbelt", "Seat belts", "seat belt restraint", 55, 55, 5],
  ["mirror", "Mirrors", "mirror rearview folding", 63, 63, 5],
  ["windows", "Windows & moonroof", "window sunroof moonroof reset", 68, 68, 7],
  [
    "refuel",
    "Refueling",
    "fuel petrol gasoline octane cap tank refuel premium",
    75,
    75,
    4,
  ],
  [
    "alarm",
    "Alarm & immobilizer",
    "alarm immobilizer theft security",
    79,
    79,
    6,
  ],
  ["airbags", "Airbags", "airbag srs restraint", 86, 86, 8],
  ["child", "Child restraints", "child baby seat isofix tether", 94, 94, 15],
  ["start", "Starting & ignition", "start ignition engine button", 119, 119, 5],
  [
    "transmission",
    "Automatic transmission",
    "automatic transmission gear shift paddle ect",
    124,
    124,
    5,
  ],
  [
    "gauges",
    "Gauges & display",
    "odometer mileage gauge meter dashboard display",
    132,
    132,
    12,
  ],
  ["lights", "Lights", "headlight fog light lamp beam", 144, 144, 4],
  ["wipers", "Wipers & washers", "wiper washer rain", 148, 148, 6],
  ["cruise", "Cruise control", "cruise speed control", 154, 154, 4],
  [
    "stability",
    "ABS, VSC & TRC",
    "abs vsc trc stability traction brake assist skid",
    169,
    169,
    5,
  ],
  ["cleaning", "Cleaning", "clean wash wax interior leather", 220, 222, 9],
  [
    "tires",
    "Tires",
    "tire tyre pressure rotation tread wheel psi",
    226,
    229,
    6,
  ],
  ["hood", "Hood release", "hood bonnet engine bay open", 232, 235, 3],
  [
    "jack",
    "Jacking points",
    "jack lift lifting support stands underbody",
    235,
    238,
    2,
  ],
  [
    "covers",
    "Engine covers",
    "engine bay cover under hood engine compartment diagram location",
    237,
    240,
    2,
  ],
  [
    "bulbs",
    "Bulb replacement",
    "bulb headlamp replacement lighting",
    239,
    242,
    7,
  ],
  [
    "fuses",
    "Fuse boxes",
    "fuse fuses box fusebox amperage obd socket electrical",
    246,
    249,
    10,
  ],
  ["key-battery", "Key battery", "key fob battery remote battery", 256, 259, 2],
  [
    "washer",
    "Washer fluid",
    "washer windscreen windshield fluid refill",
    258,
    261,
    2,
  ],
  ["tow", "Towing", "tow towing recovery transport", 264, 268, 4],
  [
    "warnings",
    "Warning lights",
    "warning light check engine mil oil pressure brake charging battery warning",
    268,
    272,
    4,
  ],
  [
    "messages",
    "Warning messages",
    "warning message display triangle maintenance oil level",
    272,
    276,
    10,
  ],
  [
    "flat",
    "Flat tire",
    "flat tire tyre puncture spare wheel wheel nut",
    282,
    286,
    8,
  ],
  [
    "no-start",
    "No-start troubleshooting",
    "not start no start crank starting problem",
    290,
    294,
    2,
  ],
  [
    "shift-lock",
    "Shift lock",
    "shift stuck park gear lock override",
    292,
    296,
    1,
  ],
  [
    "emergency-key",
    "Emergency key use",
    "key not working dead fob emergency key",
    294,
    298,
    3,
  ],
  [
    "jump",
    "Jump starting",
    "jump battery flat dead boost terminals charging",
    297,
    301,
    3,
  ],
  [
    "overheat",
    "Overheating",
    "overheat overheating coolant radiator hot temperature steam",
    300,
    304,
    2,
  ],
  ["stuck", "Vehicle stuck", "stuck mud sand recovery snow", 302, 306, 1],
  [
    "emergency",
    "Emergency stop",
    "emergency stop runaway accelerator stuck pedal",
    303,
    307,
    1,
  ],
  [
    "specs",
    "Fluids & specifications",
    "oil engine oil viscosity capacity filter coolant spark plug fluid atf differential fuel octane specification 4gr",
    306,
    310,
    8,
  ],
  [
    "customize",
    "Customization",
    "customize settings personalization door lock buzzer",
    314,
    318,
    4,
  ],
].map(([id, title, keywords, early, late, length]) => ({
  id: String(id),
  title: String(title),
  keywords: String(keywords),
  early: Number(early),
  late: Number(late),
  length: Number(length),
}));
export function topicPage(topic: ManualTopic, id: ManualId) {
  return (id === "jp-early" ? topic.early : topic.late) + 4;
}
export function manualUrl(id: ManualId, page?: number, local = false) {
  const m = manuals.find((m) => m.id === id)!;
  return (local ? `/manuals/${m.file}` : m.url) + (page ? `#page=${page}` : "");
}
const stop = new Set([
  "the",
  "and",
  "for",
  "how",
  "what",
  "can",
  "does",
  "this",
  "that",
  "with",
  "about",
  "car",
  "lexus",
  "please",
  "is250",
]);
export function findTopics(query: string) {
  const words =
    query
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter((x) => !stop.has(x)) || [];
  return manualTopics
    .map((topic) => ({
      topic,
      score: words.reduce(
        (n, w) =>
          n +
          (topic.keywords.split(" ").includes(w) ? 2 : 0) +
          (topic.title.toLowerCase().includes(w) ? 1 : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.topic);
}
export type Citation = {
  id: string;
  manualId: ManualId | "web";
  page: number;
  title: string;
  url: string;
};
export function topicCitations(query: string): Citation[] {
  return findTopics(query)
    .slice(0, 2)
    .flatMap((topic) =>
      manuals.map((m) => ({
        id: `${m.id}:${topicPage(topic, m.id as ManualId)}`,
        manualId: m.id as ManualId,
        page: topicPage(topic, m.id as ManualId),
        title: `${topic.title} · ${m.code} · printed p. ${m.id === "jp-early" ? topic.early : topic.late}`,
        url: manualUrl(m.id as ManualId, topicPage(topic, m.id as ManualId)),
      })),
    );
}
