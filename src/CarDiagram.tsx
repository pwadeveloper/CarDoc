import { parts, type Part } from "./data";
export function CarDiagram({
  active,
  selected,
  onSelect,
}: {
  active: Part[];
  selected: Part | null;
  onSelect: (p: Part) => void;
}) {
  return (
    <div className="diagram">
      <svg
        viewBox="0 0 440 650"
        role="img"
        aria-label="Schematic top view of a rear-wheel drive sedan; front at top. Locations are approximate, not a repair diagram."
      >
        <defs>
          <linearGradient id="body" x1="0" x2="1">
            <stop stopColor="#bfcbc6" />
            <stop offset=".25" stopColor="#edf1e9" />
            <stop offset=".6" stopColor="#dce4db" />
            <stop offset="1" stopColor="#a4b6ad" />
          </linearGradient>
          <linearGradient id="glass" x2="0" y2="1">
            <stop stopColor="#47605b" />
            <stop offset="1" stopColor="#1e3934" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="12" stdDeviation="13" floodOpacity=".14" />
          </filter>
        </defs>
        <g stroke="#a9bcb0" opacity=".35" fill="none">
          <ellipse cx="220" cy="328" rx="200" ry="280" strokeDasharray="3 8" />
          <path d="M220 0v650M0 325h440" strokeDasharray="4 8" />
        </g>
        <g filter="url(#shadow)">
          <g fill="#20332d">
            <rect x="83" y="133" width="29" height="99" rx="10" />
            <rect x="328" y="133" width="29" height="99" rx="10" />
            <rect x="83" y="453" width="29" height="99" rx="10" />
            <rect x="328" y="453" width="29" height="99" rx="10" />
          </g>
          <path
            d="M111 93 Q117 39 220 35 Q323 39 329 93 L341 239 L338 478 Q340 579 314 607 Q220 635 126 607 Q100 580 102 478 L99 239Z"
            fill="url(#body)"
            stroke="#8a9f92"
            strokeWidth="2"
          />
          <path
            d="M125 94Q220 76 315 94L301 225Q220 196 139 225Z"
            fill="#dce5da"
            stroke="#a4b5a6"
          />
          <path
            d="M138 237Q220 206 302 237L287 329Q220 313 153 329Z"
            fill="url(#glass)"
          />
          <path
            d="M151 346Q220 330 289 346L291 447Q220 463 149 447Z"
            fill="#dce4d9"
            stroke="#a0b3a5"
          />
          <path
            d="M149 460Q220 478 291 460L310 529Q220 556 130 529Z"
            fill="url(#glass)"
          />
          <path
            d="M131 549Q220 568 310 549L307 590Q220 613 133 590Z"
            fill="#c9d6c7"
            stroke="#a0b3a5"
          />
          <path
            d="M116 253L139 338L137 439L118 482ZM324 253L301 338L303 439L322 482Z"
            fill="#456057"
          />
          <path
            d="M96 272l-22 10v22l26-2M344 272l22 10v22l-26-2"
            fill="#bbcbbd"
            stroke="#90a28f"
          />
          <path
            d="M122 76l54-10M264 66l54 10"
            stroke="#ffffe8"
            strokeWidth="9"
          />
          <path
            d="M121 577l49 10M270 587l49-10"
            stroke="#a9674f"
            strokeWidth="7"
          />
          <path d="M180 50h80" stroke="#748979" strokeWidth="5" />
        </g>
        <g fill="none" stroke="#668c74" strokeWidth="10" opacity=".48">
          <path d="M218 186v302M140 498h155" />
          <path d="M248 195v180q0 30 20 50v137" strokeWidth="6" />
        </g>
        <rect
          x="181"
          y="132"
          width="78"
          height="72"
          rx="12"
          fill="#879c7e"
          stroke="#4d6a50"
        />
        <path
          d="M196 148h49m-49 12h49m-49 12h49m-49 12h49"
          stroke="#dfe7d3"
          strokeWidth="4"
        />
        <rect x="203" y="479" width="32" height="38" rx="8" fill="#7b926f" />
        <text
          x="220"
          y="23"
          textAnchor="middle"
          fontSize="10"
          letterSpacing="4"
          fill="#758c7e"
        >
          FRONT
        </text>
      </svg>
      {parts.map((p, i) => (
        <button
          key={p.id}
          className={`hotspot ${active.includes(p.id) ? "affected" : ""} ${selected === p.id ? "selected" : ""}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          onClick={() => onSelect(p.id)}
          aria-label={`Explore ${p.name}${active.includes(p.id) ? ", related to current code" : ""}`}
          title={p.name}
        >
          {i + 1}
        </button>
      ))}
      <span className="schematic-label">SYSTEM SCHEMATIC · NOT TO SCALE</span>
    </div>
  );
}
