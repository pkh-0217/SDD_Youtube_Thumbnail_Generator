"use client";

import { useEffect, useRef, useState } from "react";
import type { Candidate } from "@/types";
import { drawThumbnail, exportPng, THUMB_H, THUMB_W, triggerDownload } from "@/lib/canvas";

interface Props {
  candidate: Candidate;
  title: string;
}

export default function ThumbnailCanvas({ candidate, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // 후보가 바뀌면 이미지를 새로 로드한다.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = `data:${candidate.mime};base64,${candidate.b64}`;
    return () => {
      img.onload = null;
    };
  }, [candidate]);

  // 이미지 로드 후 + 제목 변경 시 재렌더(API 재호출 없음).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawThumbnail(ctx, { imageBitmap: image, titleText: title });
  }, [image, title]);

  async function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await exportPng(canvas);
    triggerDownload(blob, "thumbnail.png");
  }

  return (
    <div className="card space-y fade-in">
      <span className="section-label">미리보기</span>
      <canvas ref={canvasRef} width={THUMB_W} height={THUMB_H} className="preview" />
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={handleDownload}>
          PNG 다운로드
        </button>
        <span className="muted">제목을 바꾸면 미리보기가 즉시 갱신돼요.</span>
      </div>
    </div>
  );
}
