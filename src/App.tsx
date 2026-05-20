import { useEffect, useMemo, useState } from "react";
import { AiStyleProfilesPanel } from "./components/AiStyleProfilesPanel";
import { Header } from "./components/Header";
import { MetricTable } from "./components/MetricTable";
import { SummaryCards } from "./components/SummaryCards";
import { TextInputPanel } from "./components/TextInputPanel";
import { defaultAiStyleScope, type AiProfileScope } from "./lib/aiStyleProfiles";
import { getLiveCounts } from "./lib/textProcessing";
import { analyseText } from "./lib/metrics";
import type { RegisterId } from "./types";
import "./styles.css";

const taskLabels: Record<Exclude<RegisterId, "ai">, string> = {
  explanatory: "Academic explanatory / argumentative",
  evaluative: "Feedback / evaluative",
  empirical: "Empirical summary",
  email: "Professional email",
};

function App() {
  const [text, setText] = useState("");
  const [selectedRegister, setSelectedRegister] =
    useState<Exclude<RegisterId, "ai">>("evaluative");
  const [aiProfileScope, setAiProfileScope] = useState<AiProfileScope>(defaultAiStyleScope);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const counts = useMemo(() => getLiveCounts(text), [text]);
  const hasDocument = counts.words >= 20;
  const analysis = useMemo(() => analyseText(text), [text]);

  return (
    <div className="app-shell">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />

      <main>
        <TextInputPanel
          text={text}
          counts={counts}
          selectedRegister={selectedRegister}
          onTextChange={setText}
          onRegisterChange={setSelectedRegister}
        />

        {!hasDocument ? (
          <section className="empty-analysis" aria-live="polite">
            <h2>Analysis output</h2>
            <p>
              Paste a document or upload a .txt, .md, .docx or .pdf file to compute the
              submitted document metrics and compare them with the selected task-specific
              AI-style profile.
            </p>
          </section>
        ) : (
          <>
            <SummaryCards
              selectedTaskLabel={taskLabels[selectedRegister]}
            />

            <AiStyleProfilesPanel
              analysis={analysis}
              scope={aiProfileScope}
              selectedRegister={selectedRegister}
              onScopeChange={setAiProfileScope}
              targetRegisterId={selectedRegister}
            />

            <MetricTable analysis={analysis} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
