import type { ChangeEvent } from "react";
import { useState } from "react";
import type { RegisterId, TextCounts } from "../types";
import { formatNumber } from "../lib/format";
import { extractTextFromFile } from "../lib/fileTextExtraction";

type DocumentTaskId = Exclude<RegisterId, "ai">;

interface TextInputPanelProps {
  text: string;
  counts: TextCounts;
  selectedRegister: DocumentTaskId;
  onTextChange: (value: string) => void;
  onRegisterChange: (value: DocumentTaskId) => void;
}

export function TextInputPanel({
  text,
  counts,
  selectedRegister,
  onTextChange,
  onRegisterChange,
}: TextInputPanelProps) {
  const [fileStatus, setFileStatus] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const lowerName = file.name.toLowerCase();
    const isAllowed = [".txt", ".md", ".docx", ".pdf"].some((extension) =>
      lowerName.endsWith(extension),
    );
    if (!isAllowed) {
      setFileStatus("Unsupported file type. Use .txt, .md, .docx or .pdf.");
      event.target.value = "";
      return;
    }

    try {
      setFileStatus(`Reading ${file.name}...`);
      onTextChange(await extractTextFromFile(file));
      setFileStatus(`Loaded ${file.name}.`);
    } catch (error) {
      setFileStatus(error instanceof Error ? error.message : "Could not read this file.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section className="input-panel" aria-labelledby="input-heading">
      <div className="panel-heading">
        <div>
          <h2 id="input-heading">Text input</h2>
          <p>Client-side analysis only. No API calls, uploads, analytics or tracking.</p>
        </div>
      </div>

      <textarea
        aria-label="Writing to analyse"
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="Paste writing here..."
        spellCheck="true"
      />

      <div className="input-controls">
        <label className="file-input">
          <span>Upload .txt, .md, .docx or .pdf</span>
          <input
            accept=".txt,.md,.docx,.pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            type="file"
            onChange={handleFileChange}
          />
        </label>

        <label>
          <span>Document task</span>
          <select
            value={selectedRegister}
            onChange={(event) => onRegisterChange(event.target.value as DocumentTaskId)}
          >
            <option value="explanatory">Academic explanatory / argumentative</option>
            <option value="evaluative">Feedback / evaluative</option>
            <option value="empirical">Empirical summary</option>
            <option value="email">Professional email</option>
          </select>
        </label>

        <p className="mode-note">
          The selected task chooses the relevant AI-style comparison profile and organises metric
          explanations. It is not treated as a standard of good writing.
        </p>
      </div>

      <div className="live-counts" aria-label="Live text counts">
        <span>
          <strong>{formatNumber(counts.words)}</strong> words
        </span>
        <span>
          <strong>{formatNumber(counts.sentences)}</strong> sentences
        </span>
        <span>
          <strong>{formatNumber(counts.paragraphs)}</strong> paragraphs
        </span>
      </div>

      {fileStatus && (
        <p className="file-status" aria-live="polite">
          {fileStatus}
        </p>
      )}
    </section>
  );
}
