import { useEffect, useState } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { manualUrl } from "./manuals";
type Page = { page: number; title: string; text: string; notes: string[] };
type Translation = { sourcePages: number; notice: string; pages: Page[] };
export function TranslatedManual() {
  const [document, setDocument] = useState<Translation>();
  const [error, setError] = useState(false);
  const [page, setPage] = useState(239);
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    import("../knowledge/translations/jp-early.en.json")
      .then((m) => {
        if (active) setDocument(m.default);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  if (!document)
    return (
      <section className="panel">
        <p>
          {error
            ? "The English translation could not be loaded. Reload to retry."
            : "Loading English translation…"}
        </p>
      </section>
    );
  const selected = document.pages.find((p) => p.page === page);
  const matches = query.trim()
    ? document.pages.filter((p) =>
        `${p.title} ${p.text}`.toLowerCase().includes(query.toLowerCase()),
      )
    : [];
  return (
    <section className="panel factory-library">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            YOUR JAPANESE MANUAL · ENGLISH TRANSLATION
          </span>
          <h2>
            <BookOpen size={19} /> Japan-market English reader
          </h2>
        </div>
        <span className="tag">
          {document.pages.length} / {document.sourcePages} pages translated
        </span>
      </div>
      <p>July 2011–June 2012 production · M53A85. {document.notice}</p>
      <label className="edition-select">
        Search translated pages
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search English text"
        />
      </label>
      {query.trim() && (
        <div className="topic-shortcuts">
          {matches.map((p) => (
            <button key={p.page} onClick={() => setPage(p.page)}>
              {p.title}
              <small>PDF p. {p.page}</small>
            </button>
          ))}
          {!matches.length && (
            <p>
              No matches in the translated pages. Other pages may still be
              pending.
            </p>
          )}
        </div>
      )}
      <label className="edition-select">
        English translation page
        <select value={page} onChange={(e) => setPage(Number(e.target.value))}>
          {Array.from({ length: document.sourcePages }, (_, i) => i + 1).map(
            (n) => (
              <option key={n} value={n}>
                PDF {n}
                {n > 4 ? ` · printed ${n - 4}` : ""}
                {document.pages.some((p) => p.page === n)
                  ? " · English available"
                  : " · pending"}
              </option>
            ),
          )}
        </select>
      </label>
      <div className="manual-actions">
        <button
          className="outline"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous page
        </button>
        <button
          className="outline"
          disabled={page === document.sourcePages}
          onClick={() => setPage(page + 1)}
        >
          Next page
        </button>
        <a
          className="text-link"
          href={manualUrl("jp-early", page, true)}
          target="_blank"
          rel="noreferrer"
        >
          Original Japanese page and diagrams <ExternalLink size={13} />
        </a>
      </div>
      {selected ? (
        <article aria-label="English page translation">
          <h3>{selected.title}</h3>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
            {selected.text}
          </p>
          {selected.notes.length > 0 && (
            <aside className="manual-scope">
              <strong>Translation notes</strong>
              {selected.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </aside>
          )}
        </article>
      ) : (
        <p role="status">
          This page has not been translated yet. The original Japanese page is
          available above.
        </p>
      )}
    </section>
  );
}
