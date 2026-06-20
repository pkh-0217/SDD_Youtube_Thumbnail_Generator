"use client";

import { useEffect, useRef, useState } from "react";
import ThumbnailForm from "@/components/ThumbnailForm";
import CandidateGallery from "@/components/CandidateGallery";
import ThumbnailCanvas from "@/components/ThumbnailCanvas";
import { errorView } from "@/lib/errorView";
import type { ApiError, Candidate } from "@/types";

type Status = "idle" | "generating" | "success" | "error";

const UPSTREAM_FALLBACK: ApiError = {
  code: "UPSTREAM_ERROR",
  message: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
  retryable: true,
};

export default function Home() {
  // 입력값 — 어떤 상태 전이에서도 보존한다.
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [status, setStatus] = useState<Status>("idle");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // 경과 타이머(생성 중에만).
  useEffect(() => {
    if (status !== "generating") return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  async function generate() {
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("generating");
    setError(null);
    setCandidates([]);
    setSelectedId(null);

    const form = new FormData();
    form.set("prompt", prompt);
    form.set("titleText", title);
    files.forEach((f) => form.append("images", f));

    try {
      const res = await fetch("/api/generate", { method: "POST", body: form, signal: controller.signal });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.candidates) {
        setError((json?.error as ApiError) ?? UPSTREAM_FALLBACK);
        setStatus("error");
        return;
      }
      const list = json.candidates as Candidate[];
      setCandidates(list);
      setSelectedId(list[0]?.id ?? null);
      setStatus("success");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // 취소: 조용히 복귀
      setError(UPSTREAM_FALLBACK);
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setStatus("idle"); // 입력은 그대로 보존
  }

  const view = error ? errorView(error) : null;
  const selected = candidates.find((c) => c.id === selectedId) ?? null;

  return (
    <main className="page space-y">
      <header>
        <h1 className="page-title">YouTube 썸네일 생성기</h1>
        <p className="lead">프롬프트로 1280×720 후보 3장을 만들고, 제목을 얹어 PNG로 내려받으세요.</p>
      </header>

      <ThumbnailForm
        prompt={prompt}
        onPromptChange={setPrompt}
        title={title}
        onTitleChange={setTitle}
        files={files}
        onFilesChange={setFiles}
        onSubmit={generate}
        disabled={status === "generating"}
        promptRef={promptRef}
      />

      {status === "generating" && (
        <section className="card space-y" aria-live="polite">
          <div className="gen-status">
            <span className="spinner" aria-hidden="true" />
            <span>생성 중… {elapsed}초 (보통 15~40초)</span>
          </div>
          <CandidateGallery loading candidates={[]} selectedId={null} onSelect={() => {}} />
          <div className="row">
            <button type="button" className="btn btn-retry" onClick={cancel}>
              취소
            </button>
          </div>
        </section>
      )}

      {status === "error" && view && (
        <section className="error-banner space-y" aria-live="polite">
          <p>{view.message}</p>
          <div className="row">
            {view.retryable && (
              <button type="button" className="btn btn-retry" onClick={generate}>
                {view.retryLabel}
              </button>
            )}
            {view.focusPrompt && (
              <button
                type="button"
                className="btn btn-text"
                onClick={() => promptRef.current?.focus()}
              >
                프롬프트 수정
              </button>
            )}
          </div>
        </section>
      )}

      {status === "success" && (
        <section className="space-y">
          <div>
            <span className="section-label">후보 3장 · 1장을 선택하세요</span>
            <CandidateGallery
              loading={false}
              candidates={candidates}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          {selected && <ThumbnailCanvas candidate={selected} title={title} />}
          <div className="row">
            <button type="button" className="btn btn-text" onClick={generate}>
              다시 생성
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
