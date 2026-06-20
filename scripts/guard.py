#!/usr/bin/env python3
"""위험한 Bash 명령을 차단하는 PreToolUse 훅 가드 (크로스 플랫폼).

기존 settings.json은 `echo "$VAR" | grep -qE ...` 형태의 POSIX 셸 구문을 써서
Windows(cmd.exe)에서는 grep도 없고 변수 확장도 달라 무조건 실패했다. 이 스크립트는
Python만으로 동일한 검사를 수행하므로 macOS/Linux/Windows에서 똑같이 동작한다.

입력 경로:
  1순위 — Claude Code가 PreToolUse 훅에 stdin으로 넘기는 JSON 페이로드
          (tool_input.command 에 실제 명령이 들어있다).
  2순위 — 구버전 호환용 CLAUDE_TOOL_INPUT 환경변수.

위험 패턴이 감지되면 stderr에 사유를 출력하고 exit 1로 도구 실행을 차단한다.
"""
import json
import os
import re
import sys

# 차단 메시지가 Windows 콘솔 코드페이지와 무관하게 일관된 UTF-8로 나가도록.
_reconfigure = getattr(sys.stderr, "reconfigure", None)
if _reconfigure is not None:
    try:
        _reconfigure(encoding="utf-8")
    except (ValueError, OSError):
        pass

DANGEROUS = re.compile(
    r"rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard|DROP\s+TABLE",
    re.IGNORECASE,
)


def _read_command() -> str:
    raw = ""
    # stdin이 파이프/리다이렉트로 연결돼 있을 때만 읽는다 (대화형에서 멈추지 않도록).
    if not sys.stdin.isatty():
        try:
            raw = sys.stdin.read()
        except (OSError, ValueError):
            raw = ""

    if raw.strip():
        try:
            payload = json.loads(raw)
        except ValueError:
            return raw  # JSON이 아니면 원문 전체를 검사 대상으로 삼는다
        tool_input = payload.get("tool_input", payload)
        if isinstance(tool_input, dict):
            command = tool_input.get("command")
            if command:
                return str(command)
        return raw

    return os.environ.get("CLAUDE_TOOL_INPUT", "")


def main():
    if DANGEROUS.search(_read_command()):
        print("BLOCKED: 위험한 명령어가 감지되었습니다.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
