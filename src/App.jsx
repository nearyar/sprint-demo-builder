import { useState } from "react";

const TONE_OPTIONS = [
  { value: "internal", label: "Internal team review" },
  { value: "executive", label: "Executive stakeholders" },
  { value: "scheduler", label: "Scheduler-facing" },
];

const SECTION_META = [
  { key: "problem", icon: "🎯", label: "User problem solved" },
  { key: "script", icon: "📋", label: "Demo script" },
  { key: "happyPath", icon: "✅", label: "Happy path" },
  { key: "edgeCases", icon: "⚠️", label: "Edge cases to show" },
  { key: "avoid", icon: "🚫", label: "What NOT to demo" },
  { key: "questions", icon: "💬", label: "Questions to ask audience" },
  { key: "userVoice", icon: "🗣️", label: "Connect to user pain" },
];

function buildPrompt({ title, criteria, notes, tone, userQuotes }) {
  const toneLabel = TONE_OPTIONS.find((t) => t.value === tone)?.label || tone;
  const quotesSection = userQuotes?.trim()
    ? `- User research quotes: ${userQuotes}\n`
    : "";
  const userVoiceInstruction = userQuotes?.trim()
    ? `"userVoice": "2-3 sentences weaving the user research quotes into the demo narrative — how to reference this real user pain aloud during the demo to make it land with the ${toneLabel} audience",`
    : `"userVoice": null,`;
  return `You are a senior product manager helping a developer run a sprint review demo.

Given this ticket information:
- Ticket title: ${title}
- Acceptance criteria: ${criteria}
- Feature notes: ${notes}
${quotesSection}- Audience: ${toneLabel}

Generate a structured demo guide. Respond ONLY with valid JSON — no preamble, no markdown fences, no explanation. Use this exact structure:

{
  "problem": "2-3 sentences: what user problem this feature solves and why it matters to the ${toneLabel} audience",
  "script": "A natural spoken demo script (4-8 sentences) the developer can read aloud. Calibrated for ${toneLabel}. Start with context, show the feature, end with impact.",
  "happyPath": ["step 1", "step 2", "step 3 — ordered list of what to click/show, 4-7 steps"],
  "edgeCases": ["edge case 1", "edge case 2 — 2-4 interesting edge cases worth showing if time allows"],
  "avoid": ["thing to avoid 1", "thing to avoid 2 — 2-4 things that will derail the demo or confuse the audience"],
  "questions": ["question 1", "question 2 — 3-5 questions to ask the audience after the demo to get useful feedback"],
  ${userVoiceInstruction}
}`;
}

async function callClaude(prompt, screenshots) {
  const imageBlocks = (screenshots || []).map((s) => ({
    type: "image",
    source: { type: "base64", media_type: s.mediaType, data: s.base64 },
  }));

  const content =
    imageBlocks.length > 0
      ? [...imageBlocks, { type: "text", text: prompt }]
      : prompt;

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content }],
    }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  const text = data.content?.find((b) => b.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        color: copied ? "var(--color-text-success)" : "var(--color-text-tertiary)",
        padding: "2px 6px",
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
        transition: "color 0.2s",
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function OutputSection({ icon, label, value }) {
  const isArray = Array.isArray(value);
  const copyText = isArray ? value.map((v, i) => `${i + 1}. ${v}`).join("\n") : value;

  return (
    <div
      style={{
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        paddingBottom: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {icon} {label}
        </span>
        <CopyButton text={copyText} />
      </div>
      {isArray ? (
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {value.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--color-text-primary)",
                marginBottom: 4,
              }}
            >
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--color-text-primary)",
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

export default function SprintDemoBuilder() {
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState("");
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState("internal");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [userQuotes, setUserQuotes] = useState("");

  const canGenerate = title.trim() && criteria.trim();

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const prompt = buildPrompt({ title, criteria, notes, tone, userQuotes });
      const data = await callClaude(prompt, screenshots);
      setResult(data);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
  setResult(null);
  setError(null);
  setScreenshots([]);
};

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <h2 className="sr-only">Demo Script Builder</h2>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, justifyContent: "center" }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 4,
              padding: "2px 8px",
              color: "var(--color-text-secondary)",
            }}
          >
            PMA Innovation
          </span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center" }}>
          Turn a Jira ticket into a ready-to-run demo script.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1.4fr" : "1fr", gap: 24 }}>
        {/* LEFT: Form */}
        <div>
          {/* Ticket Title */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Ticket title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Milestone variance detection with visual diff"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          {/* Acceptance Criteria */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Acceptance criteria *
            </label>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Paste your AC here — Given/When/Then or bullet points both work"
              rows={5}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "var(--font-sans)", fontSize: 14 }}
            />
          </div>

          {/* Feature Notes */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              Feature notes
              <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6, letterSpacing: 0 }}>
                — optional
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context about how it was built, known quirks, backend dependencies, etc."
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "var(--font-sans)", fontSize: 14 }}
            />
          </div>

          {/* User Research Quotes */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              User research quotes
              <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6, letterSpacing: 0 }}>
                — optional
              </span>
            </label>
            <textarea
              value={userQuotes}
              onChange={(e) => setUserQuotes(e.target.value)}
              placeholder={`"I never know if a project is on track until it's too late." — Scheduler, Q2 research`}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "var(--font-sans)", fontSize: 14 }}
            />
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--color-text-tertiary)", lineHeight: 1.5 }}>
              Paste verbatim quotes from interviews or surveys. Claude will show you how to weave them in for emotional resonance.
            </p>
          </div>

          {/* Screenshots */}
<div style={{ marginBottom: 16 }}>
  <label style={{
    display: "block", fontSize: 11, fontWeight: 500,
    color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)",
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
  }}>
    Screenshots
    <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6, letterSpacing: 0 }}>
      — optional
    </span>
  </label>
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(",")[1];
          setScreenshots((prev) => [
            ...prev,
            { base64, mediaType: file.type, preview: reader.result, name: file.name },
          ]);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    }}
    style={{ width: "100%", boxSizing: "border-box" }}
  />
  {screenshots.length > 0 && (
    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
      {screenshots.map((s, i) => (
        <div key={i} style={{ position: "relative", display: "inline-flex" }}>
          <img
            src={s.preview}
            alt={s.name}
            style={{ height: 48, borderRadius: 4, border: "0.5px solid var(--color-border-tertiary)" }}
          />
          <button
            onClick={() => setScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
            style={{
              position: "absolute", top: -6, right: -6,
              width: 16, height: 16, borderRadius: "50%",
              background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
              fontSize: 10, lineHeight: "16px", textAlign: "center",
              cursor: "pointer", color: "var(--color-text-secondary)",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )}
</div>

          {/* Tone */}
<div style={{ marginBottom: 24 }}>
  <label
    style={{
      display: "block",
      fontSize: 11,
      fontWeight: 500,
      color: "var(--color-text-secondary)",
      fontFamily: "var(--font-mono)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: 8,
    }}
  >
    Audience
  </label>
  <div style={{ display: "flex", gap: 8 }}>
    {TONE_OPTIONS.map((opt) => (
      <button
        key={opt.value}
        onClick={() => setTone(opt.value)}
        style={{
  appearance: "none",
  fontSize: 12,
  padding: "6px 12px",
  borderRadius: 6,
  border: tone === opt.value
    ? "1.5px solid #333"
    : "0.5px solid #ccc",
  background: tone === opt.value
    ? "#f0f0f0"
    : "transparent",
  color: tone === opt.value
    ? "#111"
    : "#888",
  cursor: "pointer",
  fontWeight: tone === opt.value ? 500 : 400,
  transition: "all 0.15s",
}}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!canGenerate || loading}
            style={{
              width: "100%",
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 500,
              cursor: canGenerate && !loading ? "pointer" : "not-allowed",
              opacity: canGenerate && !loading ? 1 : 0.45,
              background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)",
              color: "var(--color-text-primary)",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Generating…" : result ? "Regenerate ↗" : "Generate demo script ↗"}
          </button>

          {result && (
            <button
              onClick={reset}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "8px 0",
                fontSize: 13,
                cursor: "pointer",
                background: "transparent",
                border: "none",
                color: "var(--color-text-tertiary)",
              }}
            >
              Clear output
            </button>
          )}

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "var(--color-background-danger)",
                border: "0.5px solid var(--color-border-danger)",
                borderRadius: "var(--border-radius-md)",
                fontSize: 13,
                color: "var(--color-text-danger)",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* RIGHT: Output */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 200,
              color: "var(--color-text-tertiary)",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ animation: "pulse 1.4s ease-in-out infinite" }}>
              building your demo script…
            </span>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        )}

        {result && !loading && (
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              padding: "1.25rem",
            }}
          >
            {/* Output header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "0.5px solid var(--color-border-tertiary)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                {title}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-text-tertiary)",
                  background: "var(--color-background-secondary)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {TONE_OPTIONS.find((t) => t.value === tone)?.label}
              </span>
            </div>

            {SECTION_META.map(({ key, icon, label }) =>
              result[key] ? (
                <OutputSection
                  key={key}
                  icon={icon}
                  label={label}
                  value={result[key]}
                />
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
