import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  CarFront,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Cloud,
  ExternalLink,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { CarDiagram } from "./CarDiagram";
import {
  parts,
  diagnostics,
  articles,
  extractCodes,
  answerQuestion,
  sources,
  type Part,
} from "./data";
import "./style.css";
import { ManualLibrary } from "./ManualLibrary";
import { loadProfile, reportedService } from "./profile";
import {
  loadConversation,
  newConversation,
  parseConversation,
  message,
  historyForAI,
  followupQuery,
  validCitations,
  CHAT_KEY,
  type ChatMessage,
} from "./chat";
import { topicCitations } from "./manuals";
import {
  type Entry,
  type SyncStatus,
  fetchCloudJournal,
  saveCloudJournal,
} from "./sync";
function read<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(window.localStorage.getItem(key) || "null");
    if (v === null) return fallback;
    if (Array.isArray(fallback)) return Array.isArray(v) ? (v as T) : fallback;
    if (
      typeof fallback === "object" &&
      typeof v === "object" &&
      !Array.isArray(v)
    )
      return { ...fallback, ...v };
    return fallback;
  } catch {
    return fallback;
  }
}
export function App() {
  const [page, setPage] = useState("Overview"),
    [profile, setProfile] = useState(() => loadProfile()),
    [edit, setEdit] = useState(false),
    [draft, setDraft] = useState(profile),
    [part, setPart] = useState<Part | null>(null),
    [codeInput, setCodeInput] = useState(""),
    [codes, setCodes] = useState<string[]>([]),
    [codeError, setCodeError] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All topics"),
    [article, setArticle] = useState<string | null>(null),
    [chatOpen, setChatOpen] = useState(false),
    [question, setQuestion] = useState(""),
    [conversation, setConversation] = useState(loadConversation),
    [busy, setBusy] = useState(false),
    [ai, setAi] = useState(false),
    [entries, setEntries] = useState<Entry[]>(() => {
      const stored = read<Entry[]>("cardoc-journal", []);
      const valid = stored.filter(
        (e) =>
          e &&
          typeof e.id === "string" &&
          typeof e.title === "string" &&
          typeof e.date === "string" &&
          typeof e.notes === "string",
      );
      let seeded = false;
      try {
        seeded =
          window.localStorage.getItem("cardoc-service-report-v2") === "added";
      } catch {}
      if (!seeded && !valid.some((e) => e.id === reportedService.id))
        return [reportedService, ...valid];
      return valid;
    }),
    [notice, setNotice] = useState(""),
    [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const messages = conversation.messages;
  const chatBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    fetchCloudJournal().then((cloudData) => {
      if (!active || !cloudData) {
        if (active) setSyncStatus("offline");
        return;
      }
      if (cloudData.entries && cloudData.entries.length > 0) {
        setEntries((localEntries) => {
          const cloudIds = new Set(cloudData.entries.map((e) => e.id));
          const unsynced = localEntries.filter((e) => !cloudIds.has(e.id));
          if (unsynced.length > 0) {
            const merged = [...unsynced, ...cloudData.entries];
            saveCloudJournal(merged, profile);
            return merged;
          }
          return cloudData.entries;
        });
        if (cloudData.profile) {
          setProfile((localProfile) => ({
            ...localProfile,
            ...cloudData.profile,
          }));
        }
        setSyncStatus("synced");
      } else if (entries.length > 0) {
        setSyncStatus("syncing");
        saveCloudJournal(entries, profile).then((res) => {
          if (active) setSyncStatus(res.ok ? "synced" : "offline");
        });
      } else {
        setSyncStatus("synced");
      }
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    // Only chase the bottom once there is a transcript — pinning an empty
    // panel to its scroll height clipped the welcome heading.
    if (chatBody.current && messages.length)
      chatBody.current.scrollTop = chatBody.current.scrollHeight;
  }, [messages, busy, chatOpen]);
  useEffect(() => {
    try {
      window.localStorage.setItem("cardoc-profile", JSON.stringify(profile));
      window.localStorage.setItem("cardoc-journal", JSON.stringify(entries));
      window.localStorage.setItem("cardoc-service-report-v2", "added");
      window.localStorage.setItem(CHAT_KEY, JSON.stringify(conversation));
    } catch {
      setNotice(
        "Browser storage is unavailable. Changes will last for this session only.",
      );
    }
  }, [profile, entries, conversation]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEdit(false);
        setChatOpen(false);
      }
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);
  const active = [
    ...new Set(
      codes.flatMap((c) => diagnostics.find((d) => d.code === c)?.parts || []),
    ),
  ];
  const chosen = parts.find((p) => p.id === part);
  function scan(value = codeInput) {
    const found = extractCodes(value);
    setCodeError(
      found.length
        ? ""
        : "Enter a complete OBD-II code, such as P0301. Multiple codes can be separated by spaces or commas.",
    );
    setCodes(found);
    setPart(null);
    setPage("Diagnostics");
  }
  function nav(p: string) {
    setPage(p);
    setArticle(null);
    setQuery("");
  }
  function appendMessages(next: ChatMessage[]) {
    setConversation((c) => ({
      ...c,
      updatedAt: new Date().toISOString(),
      messages: [...c.messages, ...next].slice(-200),
    }));
  }
  function exportChat() {
    const blob = new Blob([JSON.stringify(conversation, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cardoc-conversation.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importChat(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2000000) throw new Error("JSON file is too large");
      const restored = parseConversation(JSON.parse(await file.text()));
      if (
        messages.length &&
        !window.confirm(
          "Replace the current saved conversation with this JSON file? Export first to keep a copy.",
        )
      )
        return;
      setConversation(restored);
      setNotice("Conversation restored from JSON.");
    } catch {
      setNotice(
        "Could not import that file. Use a valid CarDoc conversation JSON (up to 200 messages / 2 MB).",
      );
    }
  }
  async function ask(q = question) {
    if (!q.trim() || busy) return;
    setQuestion("");
    const history = historyForAI(messages);
    const contextual = followupQuery(q, messages);
    appendMessages([message("user", q)]);
    setBusy(true);
    const found = extractCodes(q);
    if (found.length) {
      setCodes(found);
      setPage("Diagnostics");
      setPart(null);
    }
    let reply = answerQuestion(contextual);
    let citations = topicCitations(contextual);
    let source: "built-in" | "openai" | "gemini" = "built-in";
    if (reply.startsWith("I don’t have") && citations.length)
      reply =
        "I found this topic in the official Japan-market owner manuals. Open the page references below for the factory instructions and illustrations. Enable the AI connection for an English explanation grounded in those pages.";
    if (ai) {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          signal: AbortSignal.timeout(40000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            history,
            vehicle: {
              ...profile,
              year: 2012,
              model: "Lexus IS 250",
              engine: "4GR-FSE",
              drive: "RWD",
            },
          }),
        });
        if (!res.ok) throw new Error();
        const d = await res.json();
        if (typeof d.answer !== "string") throw new Error();
        reply = d.answer;
        citations = validCitations(d.citations);
        source = d.source === "openai" ? "openai" : "gemini";
      } catch {
        reply =
          "The optional AI connection is unavailable. Here is the built-in answer:\n\n" +
          reply;
      }
    }
    appendMessages([message("assistant", reply, { source, citations })]);
    setBusy(false);
  }
  const filtered = articles.filter(
    (a) =>
      (category === "All topics" || a.category === category) &&
      `${a.title} ${a.body} ${a.tags}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="app">
      <aside className="sidebar" inert={edit}>
        <a
          href="#"
          className="brand"
          aria-label="CarDoc — go to overview"
          onClick={(e) => {
            e.preventDefault();
            nav("Overview");
          }}
        >
          <span className="brand-icon">
            <Activity size={23} />
          </span>
          <span className="brand-text">CarDoc</span>
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace">YOUR GARAGE</div>
        <button
          className="garage"
          onClick={() => {
            setDraft(profile);
            setEdit(true);
          }}
        >
          <CarFront size={23} />
          <span>
            <strong>Lexus IS 250</strong>
            <small>2012 · Rear-wheel drive</small>
          </span>
          <Settings2 size={15} />
        </button>
        <div className="workspace">WORKSPACE</div>
        <nav>
          {[
            ["Overview", LayoutDashboard],
            ["Explore your car", CarFront],
            ["Diagnostics", Activity],
            ["Owner’s manual", BookOpen],
            ["Service journal", ClipboardList],
          ].map(([label, Icon]) => (
            <button
              key={label as string}
              className={page === label ? "nav active" : "nav"}
              title={label as string}
              onClick={() => nav(label as string)}
            >
              <Icon size={18} />
              {label as string}
              {label === "Diagnostics" && codes.length > 0 && (
                <span className="count">{codes.length}</span>
              )}
            </button>
          ))}
        </nav>
        <button className="ask-nav" onClick={() => setChatOpen(true)}>
          <Sparkles size={18} />
          Ask CarDoc
          <ArrowUpRight size={16} />
        </button>
        <div className="sidebar-bottom">
          <div className="small-logo">
            <ShieldCheck size={20} />
          </div>
          <strong>
            A little knowledge.
            <br />A better drive.
          </strong>
          <p>Your car companion, wherever the road takes you.</p>
          <span className="local-dot" /> Saved on this device
        </div>
      </aside>
      <div className="shell" inert={edit}>
        <header>
          <div className="breadcrumb">
            My garage <ChevronRight size={14} /> <span>Lexus IS 250</span>
          </div>
          <button className="header-help" onClick={() => setChatOpen(true)}>
            <CircleHelp size={18} />
            <span>Ask a question</span>
          </button>
          <button
            className="avatar"
            aria-label="Edit vehicle profile"
            onClick={() => {
              setDraft(profile);
              setEdit(true);
            }}
          >
            IS
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR PERSONAL CAR COMPANION</div>
              <h1>
                {page === "Overview"
                  ? "Your Lexus, understood."
                  : page === "Explore your car"
                    ? "Get to know every system."
                    : page === "Diagnostics"
                      ? "Turn codes into clarity."
                      : page === "Owner’s manual"
                        ? "Answers for the road ahead."
                        : "A history worth keeping."}
              </h1>
              <p>
                {page === "Overview"
                  ? "Know what’s under the hood. Feel confident behind the wheel."
                  : page === "Diagnostics"
                    ? "See the systems involved, understand possible causes, and plan the next check."
                    : page === "Owner’s manual"
                      ? "Practical guides for your IS 250, with links to factory documentation."
                      : page === "Service journal"
                        ? "Keep maintenance, mileage and notes together on this device."
                        : "Select a numbered point to explore how your car works."}
              </p>
            </div>
            <button
              className="outline vehicle-edit"
              onClick={() => {
                setDraft(profile);
                setEdit(true);
              }}
            >
              <Settings2 size={16} />
              Vehicle details
            </button>
          </div>
          {notice && (
            <div role="status" className="notice">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}
          {(page === "Overview" || page === "Explore your car") && (
            <>
              <section className="vehicle-hero">
                <div className="hero-copy">
                  <span className="pill">
                    <span /> YOUR VEHICLE
                  </span>
                  <h2>Lexus IS 250</h2>
                  <p className="hero-year">
                    2012 <span>/</span> SECOND GENERATION
                  </p>
                  <div className="spec-row">
                    <div>
                      <strong>2.5L V6</strong>
                      <span>4GR-FSE ENGINE</span>
                    </div>
                    <div>
                      <strong>RWD</strong>
                      <span>DRIVETRAIN</span>
                    </div>
                    <div>
                      <strong>
                        {profile.mileage
                          ? Number(profile.mileage).toLocaleString()
                          : "—"}{" "}
                        <small>
                          {profile.mileage
                            ? profile.unit === "Unconfirmed"
                              ? "unit ?"
                              : profile.unit
                            : ""}
                        </small>
                      </strong>
                      <span>
                        {profile.mileage ? "ODOMETER" : "ADD YOUR MILEAGE"}
                      </span>
                    </div>
                  </div>
                  <button
                    className="hero-link"
                    onClick={() => {
                      setDraft(profile);
                      setEdit(true);
                    }}
                  >
                    Review your car’s profile <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="hero-art">
                  <span className="ghost-type">IS 250</span>
                  <SideCar />
                  <span className="art-caption">
                    2012 IS SERIES · ILLUSTRATION
                  </span>
                </div>
              </section>
              <div className="overview-grid">
                <section className="panel explore-panel">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">THE BIG PICTURE</span>
                      <h2>Explore your car</h2>
                    </div>
                    <span className="tag">8 systems</span>
                  </div>
                  <div className="explore-content">
                    <CarDiagram
                      active={[]}
                      selected={part}
                      onSelect={setPart}
                    />
                    <div className="system-list">
                      {parts.map((p, i) => (
                        <button
                          className={
                            part === p.id ? "system selected" : "system"
                          }
                          key={p.id}
                          onClick={() => setPart(p.id)}
                        >
                          <span className="system-num">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {p.name}
                          <ChevronRight size={15} />
                        </button>
                      ))}
                      {chosen ? (
                        <div className="part-detail">
                          <h3>{chosen.name}</h3>
                          <button
                            className="text-link"
                            onClick={() => {
                              nav("Owner’s manual");
                              setQuery(
                                chosen.id === "battery"
                                  ? "jump"
                                  : chosen.id === "cooling"
                                    ? "overheat"
                                    : "engine bay",
                              );
                            }}
                          >
                            Factory illustrations <ArrowUpRight size={12} />
                          </button>
                          <p>{chosen.description}</p>
                          <button
                            onClick={() => {
                              setPage("Owner’s manual");
                              setQuery(
                                chosen.id === "intake" ? "scanner" : chosen.id,
                              );
                            }}
                          >
                            Read related guides <ArrowRight size={14} />
                          </button>
                        </div>
                      ) : (
                        <p className="diagram-hint">
                          Click a point on the car or choose a system to take a
                          closer look.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
                <div className="right-stack">
                  <section className="diagnose-card">
                    <div className="tile-icon">
                      <Activity size={23} />
                    </div>
                    <h2>
                      A warning light? <br />
                      Let’s understand it.
                    </h2>
                    <p>
                      Enter a code from your OBD-II scanner to see what it could
                      mean.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        scan();
                      }}
                    >
                      <label className="sr-only" htmlFor="overview-code">
                        Scanner code
                      </label>
                      <input
                        id="overview-code"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        placeholder="e.g. P0301"
                        maxLength={200}
                      />
                      <button aria-label="Look up scanner code">
                        <ArrowRight size={21} />
                      </button>
                    </form>
                    <small>
                      Don’t have a code?{" "}
                      <button
                        onClick={() => {
                          setChatOpen(true);
                          setQuestion(
                            "What should I do about a warning light?",
                          );
                        }}
                      >
                        Ask about a symptom <ArrowUpRight size={12} />
                      </button>
                    </small>
                  </section>
                  <section className="panel assistant-card">
                    <Sparkles size={22} />
                    <h3>Meet your glovebox expert.</h3>
                    <p>
                      From tire pressure to a mysterious rattle. Start with a
                      question.
                    </p>
                    <button
                      className="text-link"
                      onClick={() => setChatOpen(true)}
                    >
                      Ask CarDoc <ArrowUpRight size={16} />
                    </button>
                    <span className="mode-label">
                      BUILT-IN KNOWLEDGE · OPTIONAL AI
                    </span>
                  </section>
                </div>
              </div>
              <div className="section-head quick-heading">
                <h2>A good place to start</h2>
                <button
                  className="text-link"
                  onClick={() => nav("Owner’s manual")}
                >
                  Browse the manual <ArrowRight size={16} />
                </button>
              </div>
              <div className="quick-grid">
                {articles.slice(0, 3).map((a, i) => (
                  <button
                    className="quick-card"
                    key={a.id}
                    onClick={() => {
                      nav("Owner’s manual");
                      setArticle(a.id);
                    }}
                  >
                    <span className="quick-number">0{i + 1}</span>
                    <span>
                      <small>{a.category}</small>
                      <strong>{a.title}</strong>
                    </span>
                    <ArrowUpRight size={18} />
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "Diagnostics" && (
            <>
              <section className="panel scan-bar">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    scan();
                  }}
                >
                  <Activity />
                  <label className="sr-only" htmlFor="scan-code">
                    Diagnostic codes
                  </label>
                  <input
                    id="scan-code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="Enter scanner codes, e.g. P0301, P0171"
                    maxLength={200}
                  />
                  <button className="primary">
                    Explain codes <ArrowRight size={17} />
                  </button>
                </form>
                <div className="examples">
                  Try an example:{" "}
                  {["P0301", "P0420", "P0455"].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCodeInput(c);
                        scan(c);
                      }}
                    >
                      {c}
                    </button>
                  ))}
                  <span>
                    {diagnostics.length} supported codes · Generic OBD-II
                    definitions
                  </span>
                </div>
                {codeError && (
                  <p className="error" role="alert">
                    {codeError}
                  </p>
                )}
              </section>
              <div className="diagnostic-grid">
                <section className="panel map-panel">
                  <div className="section-head">
                    <h2>Systems to investigate</h2>
                    <span className="tag">Top view</span>
                  </div>
                  <CarDiagram
                    active={active}
                    selected={part}
                    onSelect={setPart}
                  />
                  <div className="map-legend">
                    <span /> Related system · not a confirmed failure
                  </div>
                  {chosen && (
                    <div className="part-detail">
                      <h3>{chosen.name}</h3>
                      <button
                        className="text-link"
                        onClick={() => {
                          nav("Owner’s manual");
                          setQuery(
                            chosen.id === "battery"
                              ? "jump"
                              : chosen.id === "cooling"
                                ? "overheat"
                                : "engine bay",
                          );
                        }}
                      >
                        Factory illustrations <ArrowUpRight size={12} />
                      </button>
                      <p>{chosen.description}</p>
                    </div>
                  )}
                </section>
                <section className="results" aria-live="polite">
                  {!codes.length ? (
                    <div className="panel empty">
                      <Search size={32} />
                      <h2>A code is a starting point.</h2>
                      <p>
                        Enter a scanner code above. You’ll see what it means,
                        which systems may be involved, and sensible next checks.
                      </p>
                    </div>
                  ) : (
                    codes.map((code) => {
                      const d = diagnostics.find((d) => d.code === code);
                      return (
                        <article className="panel result" key={code}>
                          <div className="section-head">
                            <span className="code-tag">{code}</span>
                            <span className="severity">
                              {d?.severity || "Not in library"}
                            </span>
                          </div>
                          <h2>
                            {d?.title || "Manufacturer or unsupported code"}
                          </h2>
                          <p>
                            {d?.meaning ||
                              "CarDoc does not have a verified entry for this code. Confirm the exact code, module and scanner wording in Lexus service information. No parts are highlighted for this code."}
                          </p>
                          {d && (
                            <>
                              <div className="part-chips">
                                {d.parts.map((p) => (
                                  <button key={p} onClick={() => setPart(p)}>
                                    {parts.find((x) => x.id === p)?.name}
                                    <ArrowUpRight size={12} />
                                  </button>
                                ))}
                              </div>
                              <h3>Possible causes</h3>
                              <ul>
                                {d.causes.map((c) => (
                                  <li key={c}>{c}</li>
                                ))}
                              </ul>
                              <h3>What to check next</h3>
                              <ol>
                                {d.checks.map((c) => (
                                  <li key={c}>{c}</li>
                                ))}
                              </ol>
                              <p className="diagnostic-note">
                                <ShieldCheck size={17} />
                                Test before replacing parts. Diagram locations
                                are approximate; bank and cylinder locations
                                require factory service information.
                              </p>
                            </>
                          )}
                          <a
                            className="source-link"
                            href="https://www.autel.com/u/cms/www/201910/151158279dbd.pdf"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Generic DTC definitions · Autel{" "}
                            <ExternalLink size={12} />
                          </a>
                          <br />
                          <a
                            className="source-link"
                            href={sources.service.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Lexus service information <ExternalLink size={12} />
                          </a>
                        </article>
                      );
                    })
                  )}
                </section>
              </div>
            </>
          )}
          {page === "Owner’s manual" && (
            <>
              <ManualLibrary query={query} />
              <div className="manual-toolbar">
                <label className="search-box">
                  <Search size={20} />
                  <input
                    aria-label="Search manual"
                    placeholder="Search oil, tire pressure, warning lights…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setArticle(null);
                    }}
                  />
                </label>
                <a
                  className="outline"
                  href={sources.manual.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Factory manuals <ExternalLink size={15} />
                </a>
              </div>
              <div className="tabs">
                {[
                  "All topics",
                  "Everyday care",
                  "Warning lights",
                  "Diagnostics",
                  "Know your car",
                ].map((c) => (
                  <button
                    className={category === c ? "selected" : ""}
                    key={c}
                    onClick={() => {
                      setCategory(c);
                      setArticle(null);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="muted">
                Companion guides below complement the official PDFs above. The
                AI can retrieve original manual pages; workshop repair
                procedures remain a separate source.
              </p>
              <div className="manual-grid">
                {filtered.map((a) => (
                  <article
                    className={`panel manual-article ${article === a.id ? "expanded" : ""}`}
                    key={a.id}
                  >
                    <span className="eyebrow">{a.category}</span>
                    <button
                      onClick={() => setArticle(article === a.id ? null : a.id)}
                      aria-expanded={article === a.id}
                    >
                      <h2>{a.title}</h2>
                      <Plus size={18} />
                    </button>
                    <p>
                      {article === a.id ? a.body : a.body.slice(0, 120) + "…"}
                    </p>
                    {article === a.id && (
                      <a
                        className="source-link"
                        target="_blank"
                        rel="noreferrer"
                        href={sources[a.source].url}
                      >
                        {sources[a.source].label}
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </article>
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="panel empty">
                  <Search />
                  <h2>No matching guide yet.</h2>
                  <p>
                    Try a shorter search, choose “All topics”, or ask CarDoc.
                  </p>
                  <button
                    className="outline"
                    onClick={() => {
                      setQuery("");
                      setCategory("All topics");
                    }}
                  >
                    Show all guides
                  </button>
                </div>
              )}
            </>
          )}
          {page === "Service journal" && (
            <div className="journal-grid">
              <form
                className="panel journal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const newEntry: Entry = {
                    id: crypto.randomUUID(),
                    date: String(f.get("date")),
                    mileage: String(f.get("mileage")),
                    unit: profile.unit,
                    title: String(f.get("title")).trim(),
                    notes: String(f.get("notes")).trim(),
                  };
                  const updated = [newEntry, ...entries];
                  setEntries(updated);
                  e.currentTarget.reset();
                  setNotice("Service entry saved on this device.");
                  setSyncStatus("syncing");
                  saveCloudJournal(updated, profile).then((res) => {
                    setSyncStatus(res.ok ? "synced" : "offline");
                  });
                }}
              >
                <h2>Add a service entry</h2>
                <label>
                  Work performed
                  <input
                    name="title"
                    required
                    maxLength={120}
                    placeholder="e.g. Engine oil and filter change"
                  />
                </label>
                <div className="form-row">
                  <label>
                    Date
                    <input
                      name="date"
                      type="date"
                      required
                      defaultValue={new Date().toLocaleDateString("en-CA")}
                    />
                  </label>
                  <label>
                    Odometer ({profile.unit})
                    <input
                      name="mileage"
                      type="number"
                      min="0"
                      max="9999999"
                      placeholder={profile.mileage || "Optional"}
                    />
                  </label>
                </div>
                <label>
                  Notes
                  <textarea
                    name="notes"
                    rows={4}
                    maxLength={2000}
                    placeholder="Parts, workshop, observations…"
                  />
                </label>
                <button className="primary">
                  <Plus size={16} />
                  Save entry
                </button>
              </form>
              <div>
                <div className="journal-header-row">
                  <h3>Service history ({entries.length})</h3>
                  <div className={`sync-badge ${syncStatus}`}>
                    {syncStatus === "syncing" ? (
                      <>
                        <RefreshCw size={12} className="spin" />
                        <span>Syncing to Blob…</span>
                      </>
                    ) : syncStatus === "synced" ? (
                      <>
                        <Cloud size={12} />
                        <span>Vercel Blob synced</span>
                      </>
                    ) : syncStatus === "offline" ? (
                      <>
                        <Cloud size={12} />
                        <span>Saved locally</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={12} />
                        <span>Cloud storage ready</span>
                      </>
                    )}
                  </div>
                </div>
                {entries.length === 0 ? (
                  <div className="panel empty">
                    <ClipboardList size={32} />
                    <h2>Your story starts here.</h2>
                    <p>
                      Add your first service record. CarDoc won’t guess what is
                      overdue without a confirmed schedule and service history.
                    </p>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <article className="panel journal-entry" key={entry.id}>
                      <small>
                        {entry.date}{" "}
                        {entry.mileage &&
                          `· ${Number(entry.mileage).toLocaleString()} ${entry.unit || "unit unconfirmed"}`}
                      </small>
                      <h2>{entry.title}</h2>
                      <p>{entry.notes}</p>
                      <button
                        className="text-link"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete this service entry from this device?",
                            )
                          ) {
                            const updated = entries.filter(
                              (x) => x.id !== entry.id,
                            );
                            setEntries(updated);
                            setSyncStatus("syncing");
                            saveCloudJournal(updated, profile).then((res) => {
                              setSyncStatus(res.ok ? "synced" : "offline");
                            });
                          }
                        }}
                      >
                        Delete entry
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
          <footer>
            <span>
              <ShieldCheck size={14} />
              Built for understanding. Informed by documentation.
            </span>
            <a href={sources.specs.url} target="_blank" rel="noreferrer">
              Vehicle reference <ArrowUpRight size={12} />
            </a>
            <button
              onClick={() => {
                setDraft(profile);
                setEdit(true);
              }}
            >
              Configuration:{" "}
              {profile.market === "Unconfirmed" ||
              profile.transmission === "Unconfirmed" ||
              profile.unit === "Unconfirmed"
                ? "needs confirmation"
                : "owner supplied"}
            </button>
          </footer>
        </main>
      </div>
      {!chatOpen && (
        <button className="chat-fab" onClick={() => setChatOpen(true)}>
          <Sparkles size={18} />
          Ask CarDoc
        </button>
      )}
      {chatOpen && (
        <section className="chat-panel" aria-label="Ask CarDoc">
          <div className="chat-header">
            <div className="brand-icon">
              <Sparkles size={21} />
            </div>
            <div>
              <strong>Ask CarDoc</strong>
              <small>Your Lexus companion</small>
            </div>
            <button
              aria-label="Close questions"
              onClick={() => setChatOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="chat-tools">
            <button onClick={exportChat} disabled={busy}>
              Export JSON
            </button>
            <label>
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                disabled={busy}
                onChange={(e) => {
                  void importChat(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm("Clear the saved conversation on this device?")
                )
                  setConversation(newConversation());
              }}
            >
              Clear chat
            </button>
          </div>
          <div className="chat-body" ref={chatBody} aria-live="polite">
            {!messages.length && (
              <div className="chat-welcome">
                <h2>What’s on your mind?</h2>
                <p>Ask about a warning, a scanner code, or everyday care.</p>
                {[
                  "What does P0301 mean?",
                  "How do I check tire pressure?",
                  "My engine is overheating",
                ].map((q) => (
                  <button key={q} onClick={() => ask(q)}>
                    {q}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div className={`message ${m.role}`} key={i}>
                <small>{m.role === "user" ? "YOU" : "CARDOC"}</small>
                <p>{m.text}</p>
                {m.citations?.map((c) => (
                  <a
                    className="chat-citation"
                    key={c.id}
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    [{c.id}] {c.title} <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            ))}
            {busy && <p role="status">Looking into that…</p>}
          </div>
          <div className="chat-bottom">
            <label className="ai-toggle">
              <input
                type="checkbox"
                checked={ai}
                onChange={(e) => setAi(e.target.checked)}
              />
              Use optional AI connection
            </label>
            <small>
              {ai
                ? "Sends this question + up to 12 previous messages to Google Gemini."
                : "Saved locally as JSON · latest 200 messages · no AI key needed"}
            </small>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask();
              }}
            >
              <input
                aria-label="Your question"
                placeholder="Ask about your Lexus…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={2000}
              />
              <button
                disabled={busy || !question.trim()}
                aria-label="Send question"
              >
                <Send size={18} />
              </button>
            </form>
            <a href={sources.service.url} target="_blank" rel="noreferrer">
              Verify repair details with Lexus service information ↗
            </a>
          </div>
        </section>
      )}
      {edit && (
        <div className="modal-backdrop">
          <section
            className="profile-modal panel"
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const items = e.currentTarget.querySelectorAll<HTMLElement>(
                "button,input,select,textarea,a[href]",
              );
              const first = items[0],
                last = items[items.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
          >
            <div className="section-head">
              <div>
                <span className="eyebrow">MAKE IT YOURS</span>
                <h2 id="profile-title">Your vehicle details</h2>
              </div>
              <button
                aria-label="Close vehicle details"
                onClick={() => setEdit(false)}
              >
                <X />
              </button>
            </div>
            <p>
              2012 Lexus IS 250 · 2.5L 4GR-FSE · RWD. Confirm the remaining
              details for more useful guidance.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setProfile(draft);
                setEdit(false);
                setNotice("Vehicle profile saved on this device.");
                saveCloudJournal(entries, draft)
                  .then((res) => {
                    if (res.ok) setSyncStatus("synced");
                  })
                  .catch(() => {});
              }}
            >
              <div className="form-row">
                <label>
                  Original sales market
                  <select
                    autoFocus
                    value={draft.market}
                    onChange={(e) =>
                      setDraft({ ...draft, market: e.target.value })
                    }
                  >
                    {[
                      "Unconfirmed",
                      "United States",
                      "Canada",
                      "Europe / UK",
                      "Japan",
                      "Middle East",
                      "Other",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Transmission
                  <select
                    value={draft.transmission}
                    onChange={(e) =>
                      setDraft({ ...draft, transmission: e.target.value })
                    }
                  >
                    {["Unconfirmed", "6-speed automatic", "6-speed manual"].map(
                      (x) => (
                        <option key={x}>{x}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Current odometer
                  <input
                    type="number"
                    min="0"
                    max="9999999"
                    value={draft.mileage}
                    onChange={(e) =>
                      setDraft({ ...draft, mileage: e.target.value })
                    }
                  />
                </label>
                <label>
                  Unit
                  <select
                    value={draft.unit}
                    onChange={(e) =>
                      setDraft({ ...draft, unit: e.target.value })
                    }
                  >
                    <option>Unconfirmed</option>
                    <option>km</option>
                    <option>mi</option>
                  </select>
                </label>
              </div>
              <label>
                Manual production period
                <select
                  value={draft.buildPeriod}
                  onChange={(e) =>
                    setDraft({ ...draft, buildPeriod: e.target.value })
                  }
                >
                  <option value="unknown">
                    Unconfirmed — keep both editions available
                  </option>
                  <option value="jp-early">July 2011–June 2012</option>
                  <option value="jp-late">July 2012–April 2013</option>
                </select>
              </label>
              <label>
                Last service date (approximate owner report)
                <input
                  type="date"
                  value={draft.lastServiceDate}
                  onChange={(e) =>
                    setDraft({ ...draft, lastServiceDate: e.target.value })
                  }
                />
              </label>
              <label>
                Trim / package
                <input
                  value={draft.trim}
                  maxLength={100}
                  onChange={(e) => setDraft({ ...draft, trim: e.target.value })}
                />
              </label>
              <label>
                Modifications / known history
                <textarea
                  value={draft.modifications}
                  maxLength={2000}
                  onChange={(e) =>
                    setDraft({ ...draft, modifications: e.target.value })
                  }
                  rows={3}
                />
              </label>
              <p className="muted">
                Saved locally in this browser. The full VIN is not included in
                this app or repository. Fields marked unconfirmed do not change
                factory specifications.
              </p>
              <button className="primary">
                <Check size={17} />
                Save vehicle details
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function SideCar() {
  return (
    <svg
      className="side-car"
      viewBox="0 0 760 320"
      role="img"
      aria-label="Illustrated second-generation Lexus IS sedan in silver green"
    >
      <defs>
        <linearGradient id="paint" x2="0" y2="1">
          <stop stopColor="#edf0e5" />
          <stop offset=".45" stopColor="#bbc7ba" />
          <stop offset=".55" stopColor="#8d9f91" />
          <stop offset=".85" stopColor="#cbd4c4" />
          <stop offset="1" stopColor="#6f8576" />
        </linearGradient>
        <linearGradient id="wind">
          <stop stopColor="#0d2925" />
          <stop offset="1" stopColor="#577268" />
        </linearGradient>
      </defs>
      <ellipse
        cx="382"
        cy="267"
        rx="316"
        ry="21"
        fill="#08251f"
        opacity=".35"
      />
      <path
        d="M62 223L75 183Q90 161 189 148L272 83Q310 65 399 70Q457 72 513 129L645 157Q680 169 691 216L683 243L78 246Z"
        fill="url(#paint)"
        stroke="#819784"
        strokeWidth="2"
      />
      <path
        d="M213 148L285 90Q307 82 339 82L338 144ZM354 82Q399 78 429 92L484 141L353 143Z"
        fill="url(#wind)"
        stroke="#9aaa97"
        strokeWidth="3"
      />
      <path
        d="M91 187L192 180L518 164L656 183M211 156L207 215M343 153v75M495 151l18 76"
        stroke="#6f8776"
        strokeWidth="2"
        fill="none"
      />
      <path d="M93 229h572" stroke="#d8decd" strokeWidth="4" />
      <path d="M625 166l41 18l7 12l-45-8Z" fill="#f5f3d1" />
      <path d="M78 177l31-6l-7 21l-31 3" fill="#b9674e" />
      <path d="M290 155h25M450 153h23" stroke="#e5e8da" strokeWidth="5" />
      <path d="M480 136l22-7l15 14l-31 4" fill="#c6d0bc" />
      <path
        d="M124 247a62 62 0 01124 0M526 247a62 62 0 01124 0"
        fill="#1a3028"
      />
      {[186, 588].map((x) => (
        <g key={x}>
          <circle cx={x} cy="242" r="50" fill="#182924" />
          <circle
            cx={x}
            cy="242"
            r="37"
            fill="#a3b4a5"
            stroke="#52695b"
            strokeWidth="5"
          />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`M${x} 242l-8-32h16Z`}
              transform={`rotate(${i * 36} ${x} 242)`}
              fill="#dbe0d1"
              stroke="#728874"
            />
          ))}
          <circle cx={x} cy="242" r="10" fill="#9bac99" />
        </g>
      ))}
      <path d="M90 205l47-6M654 204l30 3" stroke="#526c5c" strokeWidth="5" />
    </svg>
  );
}
if (document.getElementById("root"))
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
