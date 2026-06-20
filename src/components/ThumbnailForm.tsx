"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGES, validateImages } from "@/lib/imageValidation";

const EXAMPLE_PROMPTS = [
  "검정 배경에 충격받은 표정의 남자, 빨간 화살표와 큰 숫자",
  "네온사인 가득한 도쿄 밤거리를 걷는 뒷모습, 시네마틱",
  "주방에서 갓 구운 빵을 들고 환하게 웃는 셰프, 따뜻한 조명",
];

interface Props {
  prompt: string;
  onPromptChange: (v: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  onSubmit: () => void;
  disabled: boolean;
  promptRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export default function ThumbnailForm({
  prompt,
  onPromptChange,
  title,
  onTitleChange,
  files,
  onFilesChange,
  onSubmit,
  disabled,
  promptRef,
}: Props) {
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 파일 → objectURL 미리보기(파일 목록 변경 시 재생성, 언마운트 시 정리).
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const promptEmpty = prompt.trim().length === 0;

  function addFiles(incoming: FileList | File[]) {
    const next = [...files, ...Array.from(incoming)];
    const error = validateImages(next);
    if (error) {
      setImageError(error);
      return;
    }
    setImageError(null);
    onFilesChange(next);
  }

  function removeFile(index: number) {
    setImageError(null);
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <form
      className="card space-y"
      onSubmit={(e) => {
        e.preventDefault();
        if (!promptEmpty && !disabled) onSubmit();
      }}
    >
      <div>
        <span className="section-label">예시 프롬프트</span>
        <div className="chips">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip"
              disabled={disabled}
              onClick={() => onPromptChange(ex)}
            >
              {ex.length > 22 ? `${ex.slice(0, 22)}…` : ex}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="section-label" htmlFor="prompt">
          프롬프트 <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <textarea
          id="prompt"
          ref={promptRef}
          className="textarea"
          placeholder="썸네일에 담고 싶은 내용을 적어주세요"
          value={prompt}
          disabled={disabled}
          onChange={(e) => onPromptChange(e.target.value)}
        />
        {promptEmpty && <p className="field-help">썸네일에 담고 싶은 내용을 적어주세요.</p>}
      </div>

      <div>
        <label className="section-label" htmlFor="title">
          제목 텍스트 <span className="muted">(선택)</span>
        </label>
        <input
          id="title"
          className="input"
          placeholder="썸네일 위에 얹을 큰 제목"
          value={title}
          disabled={disabled}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <div>
        <span className="section-label">
          참고 이미지 <span className="muted">(선택 · 최대 {MAX_IMAGES}장)</span>
        </span>
        <div
          className={`dropzone${dragging ? " drag" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="이미지 업로드"
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
        >
          클릭하거나 이미지를 끌어다 놓으세요 (PNG·JPEG·WEBP, 각 8MB 이하)
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {imageError && <p className="field-error">{imageError}</p>}
        {previews.length > 0 && (
          <div className="thumbs">
            {previews.map((url, i) => (
              <div className="thumb" key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`업로드 이미지 ${i + 1}`} />
                <button
                  type="button"
                  className="thumb-remove"
                  aria-label={`이미지 ${i + 1} 삭제`}
                  onClick={() => removeFile(i)}
                  disabled={disabled}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={promptEmpty || disabled}>
          썸네일 생성
        </button>
        {promptEmpty && <span className="muted">프롬프트를 입력하면 생성할 수 있어요.</span>}
      </div>
    </form>
  );
}
