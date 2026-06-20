"use client";

import type { Candidate } from "@/types";

interface Props {
  loading: boolean;
  candidates: Candidate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CandidateGallery({ loading, candidates, selectedId, onSelect }: Props) {
  if (loading) {
    return (
      <div className="candidate-grid" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="candidate-grid">
      {candidates.map((c, i) => {
        const selected = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            className={`candidate${selected ? " selected" : ""}`}
            aria-pressed={selected}
            aria-label={`후보 ${i + 1}${selected ? " (선택됨)" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:${c.mime};base64,${c.b64}`} alt={`썸네일 후보 ${i + 1}`} />
          </button>
        );
      })}
    </div>
  );
}
