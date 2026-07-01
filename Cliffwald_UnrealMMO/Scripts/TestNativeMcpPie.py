import argparse
import json
import subprocess
import sys
import time
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent


def parse_curl_response(raw: str) -> tuple[dict[str, str], dict]:
    header_text, _, body = raw.partition("\r\n\r\n")
    if not body:
        header_text, _, body = raw.partition("\n\n")

    headers: dict[str, str] = {}
    for line in header_text.splitlines()[1:]:
        if ":" not in line:
            continue
        name, value = line.split(":", 1)
        headers[name.strip().lower()] = value.strip()

    data_lines = []
    for line in body.splitlines():
        if line.startswith("data:"):
            data_lines.append(line[5:].strip())

    if data_lines:
        return headers, json.loads("\n".join(data_lines))

    stripped_body = body.strip()
    if stripped_body:
        return headers, json.loads(stripped_body)

    return headers, {}


def post_mcp_file(endpoint: str, file_name: str, session_id: str | None = None) -> tuple[str | None, dict]:
    command = [
        "curl.exe",
        "--no-progress-meter",
        "-i",
        "-N",
        "--max-time",
        "6",
        "-H",
        "Accept: application/json, text/event-stream",
        "-H",
        "Content-Type: application/json",
    ]

    if session_id:
        command.extend(["-H", f"Mcp-Session-Id: {session_id}"])

    command.extend([
        "--data-binary",
        f"@{SCRIPT_DIR / file_name}",
        endpoint,
    ])

    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")
    combined = result.stdout

    headers, parsed = parse_curl_response(combined)
    received_session = headers.get("mcp-session-id")

    if result.returncode not in (0, 28) and not parsed:
        raise RuntimeError(result.stderr.strip() or f"curl exited with {result.returncode}")

    return received_session, parsed


def get_tool_text(response: dict) -> str:
    content = response.get("result", {}).get("content", [])
    if content and isinstance(content[0], dict) and "text" in content[0]:
        return str(content[0]["text"])

    return json.dumps(response, ensure_ascii=False, separators=(",", ":"))


def is_truthy_tool_result(text: str) -> bool:
    if "true" in text.lower():
        return True

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return False

    if isinstance(parsed, bool):
        return parsed

    if isinstance(parsed, dict):
        return any(value is True for value in parsed.values())

    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test Unreal Engine native MCP PIE control.")
    parser.add_argument("--endpoint", default="http://127.0.0.1:8000/mcp")
    args = parser.parse_args()

    try:
        session_id, initialize = post_mcp_file(args.endpoint, "mcp_initialize.json")
        if not session_id:
            raise RuntimeError(f"Native MCP did not return Mcp-Session-Id: {initialize}")

        print(f"Native MCP session: {session_id}")

        _, current_level = post_mcp_file(args.endpoint, "mcp_epic_get_current_level.json", session_id)
        print(f"Current level: {get_tool_text(current_level)}")

        _, start_pie = post_mcp_file(args.endpoint, "mcp_epic_start_pie.json", session_id)
        print(f"StartPIE: {get_tool_text(start_pie)}")

        time.sleep(3)

        _, is_pie_running = post_mcp_file(args.endpoint, "mcp_epic_is_pie_running.json", session_id)
        pie_text = get_tool_text(is_pie_running)
        print(f"IsPIERunning: {pie_text}")

        _, stop_pie = post_mcp_file(args.endpoint, "mcp_epic_stop_pie.json", session_id)
        print(f"StopPIE: {get_tool_text(stop_pie)}")

        if not is_truthy_tool_result(pie_text):
            print("PIE did not report a running state.", file=sys.stderr)
            return 2

        return 0
    except (RuntimeError, json.JSONDecodeError) as exc:
        print(f"Native MCP smoke failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
