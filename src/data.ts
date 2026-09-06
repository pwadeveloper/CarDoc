export const sources = {
  specs: {
    label: "Lexus · 2012 IS product information",
    url: "https://pressroom.lexus.com/2012-lexus-is-250-350-product-specs/",
  },
  manual: {
    label: "Lexus Japan · Official IS manuals",
    url: "https://manual.lexus.jp/is/",
  },
  service: {
    label: "Toyota / Lexus · Technical Information System",
    url: "https://techinfo.toyota.com/",
  },
  vin: {
    label: "NHTSA · VIN decoder",
    url: "https://www.nhtsa.gov/vin-decoder",
  },
};
export type Part =
  | "engine"
  | "intake"
  | "exhaust"
  | "fuel"
  | "battery"
  | "brakes"
  | "drivetrain"
  | "cooling";
export const parts: {
  id: Part;
  name: string;
  description: string;
  x: number;
  y: number;
}[] = [
  {
    id: "engine",
    name: "Engine & ignition",
    description:
      "The longitudinal 2.5L 4GR-FSE V6 turns combustion into motion. Misfire diagnosis can involve ignition, fueling, air leaks or mechanical compression.",
    x: 48,
    y: 27,
  },
  {
    id: "intake",
    name: "Air intake",
    description:
      "The air filter, intake duct and mass airflow sensor supply and measure incoming air. Unmetered air can upset fuel mixture.",
    x: 65,
    y: 20,
  },
  {
    id: "cooling",
    name: "Cooling system",
    description:
      "The radiator, hoses, pump and thermostat manage engine temperature. Never remove a coolant cap while hot.",
    x: 48,
    y: 12,
  },
  {
    id: "battery",
    name: "Battery & charging",
    description:
      "The 12V battery starts the vehicle; the alternator supports electrical loads while running. Low voltage can cause multiple unrelated warnings.",
    x: 31,
    y: 21,
  },
  {
    id: "exhaust",
    name: "Exhaust & emissions",
    description:
      "Catalysts and exhaust sensors monitor and reduce emissions. A catalyst efficiency code does not by itself prove the catalyst needs replacement.",
    x: 60,
    y: 54,
  },
  {
    id: "drivetrain",
    name: "RWD drivetrain",
    description:
      "Power travels from the transmission through the propeller shaft and rear differential to the rear wheels. Fluid procedures depend on transmission and market.",
    x: 48,
    y: 72,
  },
  {
    id: "fuel",
    name: "Fuel & EVAP",
    description:
      "The tank and evaporative-emissions system contain fuel vapor. The direct-injection fuel system operates at high pressure; leave invasive testing to a qualified technician.",
    x: 33,
    y: 76,
  },
  {
    id: "brakes",
    name: "Brakes & tires",
    description:
      "Brakes, tires and ABS work together to control stopping. A red brake warning, fluid loss or reduced braking calls for stopping safely and arranging assistance.",
    x: 22,
    y: 38,
  },
];
export type Diagnostic = {
  code: string;
  title: string;
  parts: Part[];
  severity: "Check soon" | "Urgent if symptomatic";
  meaning: string;
  causes: string[];
  checks: string[];
};
const misfire = (code: string, cylinder?: number): Diagnostic => ({
  code,
  title: cylinder
    ? `Cylinder ${cylinder} misfire detected`
    : "Random / multiple cylinder misfire",
  parts: ["engine", "intake", "fuel"],
  severity: "Urgent if symptomatic",
  meaning: `The computer detected uneven combustion${cylinder ? ` associated with cylinder ${cylinder}` : " across one or more cylinders"}. This identifies a symptom, not a failed part.`,
  causes: [
    "Spark plug or ignition coil issue",
    "Injector or fuel delivery issue",
    "Intake leak or low compression",
  ],
  checks: [
    "If the check-engine light flashes or the engine shakes badly, stop safely and arrange assistance.",
    "Save all codes and freeze-frame data before clearing anything.",
    "Have ignition, fuel delivery and compression tested. Confirm cylinder numbering in Lexus service information before working.",
  ],
});
export const diagnostics: Diagnostic[] = [
  misfire("P0300"),
  ...Array.from({ length: 6 }, (_, i) => misfire(`P030${i + 1}`, i + 1)),
  ...["P0171", "P0174"].map((code, i): Diagnostic => ({
    code,
    title: `System too lean · bank ${i + 1}`,
    parts: ["intake", "fuel", "engine"],
    severity: "Check soon",
    meaning:
      "Fuel correction has reached a lean-condition threshold. The cause may involve air, fuel delivery or measurement.",
    causes: [
      "Unmetered intake air",
      "Contaminated or inaccurate airflow reading",
      "Fuel supply or injector issue",
    ],
    checks: [
      "Record companion codes and freeze-frame data.",
      "With engine off and cool, visually check the intake duct for loose connections.",
      "Ask a technician to compare fuel trims and perform leak and fuel-system tests.",
    ],
  })),
  ...["P0420", "P0430"].map((code, i): Diagnostic => ({
    code,
    title: `Catalyst efficiency below threshold · bank ${i + 1}`,
    parts: ["exhaust", "engine"],
    severity: "Check soon",
    meaning:
      "The catalyst monitor detected efficiency below its threshold. Diagnose related misfires, leaks and sensor signals before replacing a catalytic converter.",
    causes: [
      "Catalyst deterioration",
      "Exhaust leak or sensor issue",
      "Underlying misfire or mixture problem",
    ],
    checks: [
      "Check for accompanying misfire or mixture codes first.",
      "Inspect for exhaust leaks when the system is cool.",
      "Have a technician evaluate upstream and downstream sensor data and catalyst operation.",
    ],
  })),
  {
    code: "P0455",
    title: "EVAP system · large leak detected",
    parts: ["fuel"],
    severity: "Check soon",
    meaning:
      "The evaporative-emissions monitor detected a large leak or inability to seal the system.",
    causes: [
      "Loose or damaged fuel cap",
      "Disconnected vapor hose",
      "Purge or vent valve fault",
    ],
    checks: [
      "With the engine off, check that the fuel cap is seated and its seal is intact.",
      "Save codes; a warning may take several drive cycles to resolve after a correction.",
      "If the code returns, arrange an EVAP smoke test. If you smell strong fuel, stop and get assistance.",
    ],
  },
  {
    code: "P0442",
    title: "EVAP system · small leak detected",
    parts: ["fuel"],
    severity: "Check soon",
    meaning: "A small leak was detected in the fuel vapor system.",
    causes: ["Fuel cap seal", "Vapor hose leak", "Valve sealing fault"],
    checks: [
      "Inspect the fuel cap seal with engine off.",
      "Record all codes and symptoms.",
      "Arrange an EVAP leak test if it returns.",
    ],
  },
  {
    code: "P0101",
    title: "Mass airflow sensor · range / performance",
    parts: ["intake", "engine"],
    severity: "Check soon",
    meaning:
      "Measured airflow does not match the expected range for engine conditions.",
    causes: [
      "Intake duct leak or obstruction",
      "Airflow sensor contamination",
      "Sensor wiring or engine performance issue",
    ],
    checks: [
      "Inspect the air filter and intake duct with engine off.",
      "Do not touch the sensing element or use general-purpose cleaner.",
      "Compare live airflow data against Lexus service specifications before replacing the sensor.",
    ],
  },
  {
    code: "P0128",
    title: "Coolant temperature below regulating temperature",
    parts: ["cooling", "engine"],
    severity: "Check soon",
    meaning: "The engine did not warm as expected by the temperature monitor.",
    causes: [
      "Thermostat stuck open",
      "Low coolant",
      "Temperature sensor or wiring issue",
    ],
    checks: [
      "Only when fully cool, check coolant reservoir level.",
      "Record warm-up behavior and temperature readings.",
      "Have thermostat operation and sensor accuracy checked. Stop safely if the engine overheats.",
    ],
  },
];
// Additional generic code meanings checked against Autel's published DTC reference.
// Lettered coils are intentionally not equated to physical cylinder positions.
diagnostics.push(
  ...Array.from({ length: 6 }, (_, i): Diagnostic => ({
    code: `P035${i + 1}`,
    title: `Ignition coil ${String.fromCharCode(65 + i)} circuit fault`,
    parts: ["engine"],
    severity: "Urgent if symptomatic",
    meaning:
      "The ignition-coil circuit monitor detected an electrical fault. This does not distinguish the coil from its wiring or control circuit.",
    causes: [
      "Coil circuit or connector fault",
      "Power, ground or control wiring issue",
    ],
    checks: [
      "Save all codes and freeze-frame data. Stop safely if the engine shakes severely or the warning flashes.",
      "Use Lexus service information to identify the lettered circuit; do not assume a physical cylinder position.",
      "Have the circuit tested before replacing a coil.",
    ],
  })),
  ...Array.from({ length: 6 }, (_, i): Diagnostic => ({
    code: `P020${i + 1}`,
    title: `Cylinder ${i + 1} injector circuit fault`,
    parts: ["fuel", "engine"],
    severity: "Urgent if symptomatic",
    meaning:
      "The injector circuit monitor detected a fault. Electrical tests are needed to separate an injector problem from wiring or control faults.",
    causes: [
      "Injector electrical fault",
      "Connector, harness or driver circuit issue",
    ],
    checks: [
      "Record companion codes and the operating conditions.",
      "Stop safely for severe misfire or a strong fuel smell.",
      "Have a qualified technician test the direct-injection system; do not loosen high-pressure fuel lines.",
    ],
  })),
  ...["P0172", "P0175"].map((code, i): Diagnostic => ({
    code,
    title: `Rich mixture detected · bank ${i + 1}`,
    parts: ["fuel", "intake", "engine"],
    severity: "Check soon",
    meaning:
      "Fuel-trim monitoring detected a rich condition. The reported bank is a diagnostic identifier, not a verified component location.",
    causes: [
      "Fuel delivery or injector issue",
      "Air-measurement or sensor issue",
    ],
    checks: [
      "Keep freeze-frame and companion codes.",
      "Have fuel trims, airflow and fueling checked together.",
      "Do not replace a sensor solely from this code.",
    ],
  })),
  {
    code: "P0441",
    title: "EVAP purge flow outside expected range",
    parts: ["fuel"],
    severity: "Check soon",
    meaning: "The vapor-purge monitor detected unexpected flow.",
    causes: ["Purge valve or hose issue", "Flow measurement or control fault"],
    checks: [
      "Record all EVAP codes.",
      "Arrange testing of purge operation and vapor lines.",
      "Stop safely if there is a strong fuel smell.",
    ],
  },
  {
    code: "P0446",
    title: "EVAP vent control circuit fault",
    parts: ["fuel"],
    severity: "Check soon",
    meaning: "The EVAP vent-control monitor detected a circuit fault.",
    causes: ["Vent control circuit or connector issue", "Valve fault"],
    checks: [
      "Record codes before clearing.",
      "Have the vent circuit and valve checked using the applicable Lexus procedure.",
      "Do not assume a loose fuel cap explains a circuit code.",
    ],
  },
);
export function extractCodes(text: string) {
  return [
    ...new Set(text.toUpperCase().match(/\b[PBCU][0-3][0-9A-F]{3}\b/g) || []),
  ];
}
export const articles = [
  {
    id: "scanner",
    title: "What to do with a scanner code",
    category: "Diagnostics",
    part: "engine" as Part,
    body: "Record every code, whether it is pending or confirmed, and the freeze-frame data. Note when the symptom occurs. A code points to a monitored condition; it does not prove a part is defective. Do not clear codes before diagnosis, because useful evidence and readiness status may be lost.",
    tags: "obd scanner scan code clear freeze frame",
    source: "service" as const,
  },
  {
    id: "misfire",
    title: "A rough idle or flashing engine light",
    category: "Warning lights",
    part: "engine" as Part,
    body: "A flashing check-engine light with shaking can indicate an active misfire that may damage the catalyst. Stop in a safe place, switch off the engine and arrange professional assistance. Ignition, fueling, intake leaks and compression are possible areas to test. A steady light also needs diagnosis; it is not a guarantee that driving is safe.",
    tags: "rough idle shaking flashing check engine misfire drive safe",
    source: "service" as const,
  },
  {
    id: "oil",
    title: "Checking the engine oil",
    category: "Everyday care",
    part: "engine" as Part,
    body: "Park on level ground. Follow the owner manual’s engine warm-up and wait-time instructions, then check the dipstick, wipe it, reinsert fully and read again. Avoid overfilling. Oil grade, capacity and service interval must be confirmed in the manual for your market before a change. If the oil-pressure warning appears while running, stop safely and switch the engine off.",
    tags: "oil dipstick pressure change viscosity capacity",
    source: "manual" as const,
  },
  {
    id: "coolant",
    title: "Understanding engine temperature",
    category: "Everyday care",
    part: "cooling" as Part,
    body: "If the engine overheats, stop safely and switch it off. Do not open a hot cooling system or reach near fans. Once fully cool, the reservoir level can be visually inspected. Repeated coolant loss requires diagnosis. Use the correct coolant specification from your market’s manual.",
    tags: "coolant temperature radiator overheating water thermostat",
    source: "manual" as const,
  },
  {
    id: "tires",
    title: "Tire pressure starts at the door label",
    category: "Everyday care",
    part: "brakes" as Part,
    body: "Use the cold tire pressures on your vehicle’s tire-information label, not the maximum pressure molded onto the tire. Check wheel and tire sizes before rotation: staggered front and rear sizes may prevent front-to-rear rotation. A TPMS warning is a prompt to inspect pressures and tires, not a substitute for a gauge.",
    tags: "tire tyre pressure tpms rotate wheel psi",
    source: "manual" as const,
  },
  {
    id: "battery",
    title: "Battery and charging warnings",
    category: "Warning lights",
    part: "battery" as Part,
    body: "A charging warning while driving can indicate that electrical power is not being replenished. Stop safely and seek assistance. For a no-start condition, record whether the engine cranks and whether lights dim. Use the owner manual’s jump-start procedure and terminal locations; reversed polarity can cause serious damage.",
    tags: "battery alternator charging jump start no start voltage",
    source: "manual" as const,
  },
  {
    id: "brakes",
    title: "When a brake warning needs immediate attention",
    category: "Warning lights",
    part: "brakes" as Part,
    body: "If a red brake warning stays on after releasing the parking brake, or braking feels weak, stop safely and arrange assistance. Do not continue driving with fluid loss or reduced braking. ABS and stability-control codes require a scanner that can read the relevant module; a basic engine-code reader may not show them.",
    tags: "brake abs vsc traction stop fluid",
    source: "manual" as const,
  },
  {
    id: "fuel",
    title: "Fuel cap and evaporative emissions",
    category: "Diagnostics",
    part: "fuel" as Part,
    body: "A loose cap can contribute to an EVAP warning. With the engine off, inspect the cap seal and close it according to the manual. Persistent codes need a leak test. A strong fuel smell or visible fuel leak calls for stopping safely, avoiding ignition sources and getting professional help.",
    tags: "fuel cap evap petrol gasoline smell leak",
    source: "service" as const,
  },
  {
    id: "rwd",
    title: "How your rear-wheel drive system works",
    category: "Know your car",
    part: "drivetrain" as Part,
    body: "The engine sends power through the transmission and propeller shaft to the rear differential and rear wheels. Confirm automatic or manual transmission before choosing fluid or a service procedure. For towing, follow the owner manual; do not assume the driven wheels can roll on the ground.",
    tags: "rwd rear wheel drive transmission differential tow gearbox",
    source: "specs" as const,
  },
  {
    id: "service",
    title: "Building a maintenance baseline",
    category: "Everyday care",
    part: "engine" as Part,
    body: "Record date, odometer, work performed and receipts in the service journal. Start with the maintenance schedule for your original sales market and account for operating conditions. Until mileage and history are known, CarDoc does not invent a next-service date or declare a service overdue.",
    tags: "maintenance schedule interval service mileage history",
    source: "manual" as const,
  },
];
export function answerQuestion(question: string) {
  const codes = extractCodes(question);
  if (codes.length)
    return codes
      .map((code) => {
        const d = diagnostics.find((d) => d.code === code);
        return d
          ? `${d.code} — ${d.title}\n\n${d.meaning}\n\nNext checks:\n${d.checks.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nThese are possible causes, not confirmed repairs.`
          : `${code}: This code is not in the built-in library. Confirm the exact code, module and scanner wording using Lexus service information. No component has been identified.`;
      })
      .join("\n\n");
  const words = question.toLowerCase().match(/[a-z]{3,}/g) || [];
  const ranked = articles
    .map((a) => ({
      a,
      score: words.filter((w) =>
        (a.title + " " + a.tags).toLowerCase().includes(w),
      ).length,
    }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score
    ? `${ranked[0].a.title}\n\n${ranked[0].a.body}\n\nReference: ${sources[ranked[0].a.source].label}`
    : "I don’t have a reliable built-in answer to that yet. Try an OBD-II code (for example P0301), or ask about oil, tire pressure, warning lights, coolant, the battery or maintenance. For exact repair specifications, use Lexus service information for your vehicle.";
}
