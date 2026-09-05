import { X } from "lucide-react";
import { ACCENT } from "../../data/mockData";

/** Tiny markdown-ish renderer — headers, bullet lists, bold, links.
 * No dependency needed for the fairly uniform structure TermsFeed
 * generates. */
function renderInline(text, keyBase) {
  const nodes = [];
  const regex = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let m;
  let key = 0;
  while ((m = regex.exec(text))) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={`${keyBase}-${key++}`}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      nodes.push(
        <a key={`${keyBase}-${key++}`} href={m[3]} target="_blank" rel="noreferrer" className="underline" style={{ color: ACCENT }}>
          {m[2]}
        </a>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function parseBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let listBuffer = [];
  let paraBuffer = [];
  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({ type: "ul", items: [...listBuffer] });
      listBuffer = [];
    }
  };
  const flushPara = () => {
    if (paraBuffer.length) {
      blocks.push({ type: "p", text: paraBuffer.join(" ") });
      paraBuffer = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === "---") {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushPara();
      flushList();
      blocks.push({ type: "h3", text: line.slice(4) });
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push({ type: "h2", text: line.slice(3) });
      continue;
    }
    if (line.startsWith("# ")) {
      flushPara();
      flushList();
      blocks.push({ type: "h1", text: line.slice(2) });
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushPara();
      listBuffer.push(line.slice(2));
      continue;
    }
    paraBuffer.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

function LegalDocument({ markdown }) {
  const blocks = parseBlocks(markdown);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        if (b.type === "h1") return <h1 key={i} className="text-xl font-bold mt-2">{renderInline(b.text, i)}</h1>;
        if (b.type === "h2") return <h2 key={i} className="text-base font-bold mt-4">{renderInline(b.text, i)}</h2>;
        if (b.type === "h3") return <h3 key={i} className="text-sm font-semibold mt-3">{renderInline(b.text, i)}</h3>;
        if (b.type === "ul")
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        return <p key={i}>{renderInline(b.text, i)}</p>;
      })}
    </div>
  );
}

/** Overlay modal — used so clicking "Privacy Policy" / "Terms of
 * Service" during signup never navigates away and never loses
 * whatever the person has already typed into the form. */
export default function LegalModal({ t, title, markdown, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className={`w-full max-w-2xl max-h-[85vh] rounded-xl border ${t.border} ${t.panel} ${t.text} shadow-2xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${t.border} flex-shrink-0`}>
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} className={t.sub2}>
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <LegalDocument markdown={markdown} />
        </div>
      </div>
    </div>
  );
}
