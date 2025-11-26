// src/App.alt.jsx
import React, { useState } from "react";
import Dropzone from "./components/Dropzone";
import "./App.css";

/*
  New layout: Split-studio
  - Left rail: file upload + recent uploads
  - Center: large reading canvas / preview
  - Right: suggestions, hashtags, quick actions
  - Keeps Dropzone component & backend logic unchanged
*/

export default function AppAlt() {
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]); // simple local recent uploads list

  // onResult wrapper to also track recent files (if the backend returns filename, pass it)
  function handleResult(res) {
    setResult(res);
    try {
      const name = res?.filename || res?.name || `file-${Date.now()}`;
      setRecent((r) =>
        [{ name, time: Date.now(), words: res?.words || 0 }, ...r].slice(0, 6)
      );
    } catch {
      // ignore
    }
  }

  return (
    <div className="studio-root">
      <header className="studio-topbar">
        <div className="brand">
          <div>
            <div className="brand-title">Social Media Content Analyzer</div>
            <div className="brand-sub">Upload • Extract • Optimize</div>
          </div>
        </div>
      </header>

      <main className="studio-grid">
        {/* LEFT RAIL */}
        <aside className="left-rail">
          <div className="panel upload-panel">
            <h3>Upload & Scan</h3>
            <p className="muted">PDF or image • 10 MB max</p>
            <div className="drop-container">
              {/* using existing Dropzone so backend logic stays same */}
              <Dropzone onResult={handleResult} />
            </div>
          </div>

          <div className="panel recent-panel">
            <h4>Recent uploads</h4>
            <ul className="recent-list">
              {recent.length === 0 && (
                <li className="muted">No recent uploads</li>
              )}
              {recent.map((r, i) => (
                <li key={i} className="recent-item">
                  <div className="recent-name">{r.name}</div>
                  <div className="recent-meta">
                    {r.words} words • {new Date(r.time).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* CENTER READER */}
        <section className="center-canvas">
          <div className="canvas-header">
            <h2>Reader</h2>
            <div className="canvas-meta">
              <span className="meta-pill">
                Words {result ? result.words : 0}
              </span>
              <span className="meta-pill">{result ? "Processed" : "Idle"}</span>
            </div>
          </div>

          <div className="canvas-body" role="region" aria-live="polite">
            {result ? (
              <article className="extracted">
                <pre>{result.text}</pre>
              </article>
            ) : (
              <div className="placeholder">
                <div className="placeholder-title">No content loaded</div>
                <div className="muted">
                  Upload a file to see extracted text & AI suggestions.
                </div>
              </div>
            )}
          </div>

          <div className="canvas-footer">
            <div className="footer-note">
              Tip: For best OCR results use well-lit, high-resolution images.
            </div>
          </div>
        </section>

        {/* RIGHT SUGGESTIONS */}
        <aside className="right-rail">
          <div className="panel suggestions-panel">
            <h4>AI Suggestions</h4>
            <div className="suggestions-list">
              {result ? (
                result.suggestions && result.suggestions.length > 0 ? (
                  result.suggestions.map((s, i) => (
                    <div key={i} className="suggestion-item">
                      <div className="s-text">{s}</div>
                    </div>
                  ))
                ) : (
                  <div className="muted">No suggestions returned.</div>
                )
              ) : (
                <div className="muted">Upload a file to get suggestions.</div>
              )}
            </div>
          </div>
          <div className="panel info-panel">
            <h4>Status</h4>
            <div className="muted">
              {result ? "Processed successfully" : "Waiting for upload"}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
