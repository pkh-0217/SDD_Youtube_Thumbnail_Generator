import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import type { Candidate, GenerateResult } from "@/types";
import { mapError, STATUS, validate } from "./lib";

// Next.js: 생성 지연(15~40초)을 대비해 기본보다 길게 둔다.
export const maxDuration = 60;

// --- gpt-image-2 호출 파라미터 (한 곳에서 상수 관리) ---
const MODEL = "gpt-image-2";
const SIZE = "1280x720";
const QUALITY = "medium";
const N = 3;
const OUTPUT_FORMAT = "webp";

// 서버 타임아웃: maxDuration 안에서 업스트림 호출을 중단할 여유를 둔다.
const TIMEOUT_MS = 55_000;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") ?? "");
    const images = form.getAll("images").filter((v): v is File => v instanceof File);

    const invalid = validate(prompt, images);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: STATUS[invalid.code] });
    }

    // 클라이언트는 핸들러 내부에서 지연 생성(import만으로 env 의존이 생기지 않도록).
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // gpt-image-2는 SDK 타입 유니온에 없으므로 호출 파라미터를 캐스팅한다.
    const params = {
      model: MODEL,
      prompt,
      size: SIZE,
      quality: QUALITY,
      n: N,
      output_format: OUTPUT_FORMAT,
    };

    let result;
    try {
      if (images.length > 0) {
        const files = await Promise.all(
          images.map((f, i) => toFile(f, f.name || `image-${i}.png`, { type: f.type })),
        );
        result = await openai.images.edit(
          { ...params, image: files } as unknown as OpenAI.Images.ImageEditParams,
          { signal: controller.signal },
        );
      } else {
        result = await openai.images.generate(
          params as unknown as OpenAI.Images.ImageGenerateParams,
          { signal: controller.signal },
        );
      }
    } finally {
      clearTimeout(timer);
    }

    const data = (result as OpenAI.Images.ImagesResponse).data ?? [];
    const candidates: Candidate[] = data.map((d, i) => ({
      id: `cand-${i}`,
      b64: d.b64_json ?? "",
      mime: "image/webp",
    }));

    return NextResponse.json({ candidates } satisfies GenerateResult);
  } catch (e) {
    const error = mapError(e);
    return NextResponse.json({ error }, { status: STATUS[error.code] });
  }
}
