interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Client-side writing style diagnostics</p>
        <h1>Writing Register Diagnostic Tool</h1>
        <p className="header-copy">
          Review writing metrics alongside a curated AI-style comparison profile. Text stays in
          this browser.
        </p>
      </div>
      <button className="secondary-button" type="button" onClick={onToggleTheme}>
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>
    </header>
  );
}
