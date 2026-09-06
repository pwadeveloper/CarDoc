import { useState } from "react";
import { TranslatedManual } from "./TranslatedManual";
import { BookOpen, ExternalLink, ArrowUpRight } from "lucide-react";
import {
  manuals,
  manualTopics,
  topicPage,
  manualUrl,
  type ManualId,
} from "./manuals";
export function ManualLibrary({
  query = "",
  initialTopic = "hood",
}: {
  query?: string;
  initialTopic?: string;
}) {
  const [edition, setEdition] = useState<ManualId>("jp-early"),
    [topicId, setTopicId] = useState(initialTopic),
    [show, setShow] = useState(false);
  const manual = manuals.find((m) => m.id === edition)!;
  const topic = manualTopics.find((t) => t.id === topicId)!;
  const page = topicPage(topic, edition);
  const filtered = manualTopics.filter((t) =>
    `${t.title} ${t.keywords}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <TranslatedManual />
      <section className="panel factory-library">
        <div className="section-head">
          <div>
            <span className="eyebrow">ENGLISH OWNER’S MANUAL</span>
            <h2>
              <BookOpen size={19} /> 2012 Lexus IS 250 / IS 350
            </h2>
          </div>
          <span className="tag">OM53A87U · English</span>
        </div>
        <p>
          Read the English North American edition online. This is the same model
          year, but equipment, specifications and maintenance requirements can
          differ from your Japan-market car. Use the Japanese originals below to
          confirm market-specific details.
        </p>
        <div className="manual-actions">
          <a
            className="outline"
            href="https://www.carmanualsonline.info/lexus-is250-2012-owner-s-manual-lexus-2012-is250-is350-owners-manual-om53a87u"
            target="_blank"
            rel="noreferrer"
          >
            Read English manual <ExternalLink size={14} />
          </a>
        </div>
        <p className="manual-scope">
          Hosted by Car Manuals Online. Useful printed pages: hood 394, floor
          jack 395, engine compartment 397, fuses 435, warning lights 471, flat
          tire 492 and discharged battery 510. The English manual is an external
          reference; AI page retrieval uses the Japanese originals.
        </p>
      </section>
      <section className="panel factory-library">
        <div className="section-head">
          <div>
            <span className="eyebrow">OFFICIAL LEXUS DOCUMENTATION</span>
            <h2>
              <BookOpen size={19} /> Japan-market manual library
            </h2>
          </div>
          <span className="tag">676 PDF pages</span>
        </div>
        <p>
          Original Japanese manuals with English topic shortcuts. Select the
          production period shown on the vehicle build label; the exact edition
          is not yet confirmed.
        </p>
        <label className="edition-select">
          Manual edition
          <select
            value={edition}
            onChange={(e) => setEdition(e.target.value as ManualId)}
          >
            {manuals.map((m) => (
              <option key={m.id} value={m.id}>
                {m.edition} · {m.code}
              </option>
            ))}
          </select>
        </label>
        <div className="manual-actions">
          <a className="outline" href={`/manuals/${manual.file}`} download>
            Download original PDF <ArrowUpRight size={14} />
          </a>
          <a
            className="text-link"
            href={manual.url}
            target="_blank"
            rel="noreferrer"
          >
            Lexus source <ExternalLink size={13} />
          </a>
        </div>
        <div className="topic-shortcuts">
          {filtered.map((t) => (
            <button
              key={t.id}
              aria-label={`${t.title} p. ${edition === "jp-early" ? t.early : t.late}`}
              className={topicId === t.id ? "selected" : ""}
              onClick={() => {
                setTopicId(t.id);
                setShow(true);
              }}
            >
              {t.title}
              <small>p. {edition === "jp-early" ? t.early : t.late}</small>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p>
            No matching manual shortcut. Try “fuses”, “keys”, “oil” or
            “jacking”.
          </p>
        )}
        <div className="viewer-heading">
          <strong>{topic.title}</strong>
          <span>
            Printed p. {page - 4} · PDF page {page}
          </span>
          <button className="text-link" onClick={() => setShow(!show)}>
            {show ? "Hide viewer" : "Open viewer"}
          </button>
          <a
            className="text-link"
            href={manualUrl(edition, page, true)}
            target="_blank"
            rel="noreferrer"
          >
            Open page <ExternalLink size={12} />
          </a>
        </div>
        {show && (
          <object
            key={`${edition}-${page}`}
            className="manual-viewer"
            data={manualUrl(edition, page, true)}
            type="application/pdf"
            aria-label={`${topic.title}, ${manual.code}, PDF page ${page}`}
          >
            <p>
              Your browser does not embed PDFs.{" "}
              <a
                href={manualUrl(edition, page, true)}
                target="_blank"
                rel="noreferrer"
              >
                Open the manual page
              </a>
              .
            </p>
          </object>
        )}
        <p className="manual-scope">
          Owner-manual illustrations include hood release, jacking points, fuse
          boxes, bulbs and emergency procedures. Workshop wiring, bank/cylinder
          locations and scanner diagnosis are separate service information.
        </p>
      </section>
    </>
  );
}
