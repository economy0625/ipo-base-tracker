from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "data" / "output"
REPORT_PATH = OUTPUT_DIR / "pipeline_run_report.txt"


@dataclass(frozen=True)
class PipelineStep:
    name: str
    script: Path
    enabled: bool = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the IPO Base Tracker data pipeline end to end."
    )
    parser.add_argument(
        "--skip-fetch",
        action="store_true",
        help="Skip scripts/10_fetch_listings_from_api.py",
    )
    parser.add_argument(
        "--skip-upload",
        action="store_true",
        help="Skip scripts/08_upload_to_supabase.py",
    )
    parser.add_argument(
        "--skip-backtest",
        action="store_true",
        help="Skip scripts/07_backtest_strategy.py",
    )
    return parser.parse_args()


def build_steps(args: argparse.Namespace) -> list[PipelineStep]:
    return [
        PipelineStep(
            "API 후보 수집",
            ROOT_DIR / "scripts" / "10_fetch_listings_from_api.py",
            enabled=not args.skip_fetch,
        ),
        PipelineStep(
            "후보 listings.csv 승격",
            ROOT_DIR / "scripts" / "11_promote_listings_candidates.py",
        ),
        PipelineStep(
            "상장 목록 정규화",
            ROOT_DIR / "scripts" / "01_import_listings_csv.py",
        ),
        PipelineStep(
            "일별 가격 수집",
            ROOT_DIR / "scripts" / "03_fetch_daily_prices.py",
        ),
        PipelineStep(
            "지표 계산",
            ROOT_DIR / "scripts" / "04_calculate_metrics.py",
        ),
        PipelineStep(
            "그룹 분류",
            ROOT_DIR / "scripts" / "05_classify_groups.py",
        ),
        PipelineStep(
            "신호 탐지",
            ROOT_DIR / "scripts" / "06_detect_signals.py",
        ),
        PipelineStep(
            "백테스트",
            ROOT_DIR / "scripts" / "07_backtest_strategy.py",
            enabled=not args.skip_backtest,
        ),
        PipelineStep(
            "Supabase 업로드",
            ROOT_DIR / "scripts" / "08_upload_to_supabase.py",
            enabled=not args.skip_upload,
        ),
        PipelineStep(
            "데이터셋 검증",
            ROOT_DIR / "scripts" / "09_validate_dataset.py",
            enabled=(ROOT_DIR / "scripts" / "09_validate_dataset.py").exists(),
        ),
    ]


def print_and_record(lines: list[str], message: str = "") -> None:
    print(message)
    lines.append(message)


def run_step(step: PipelineStep, lines: list[str]) -> int:
    if not step.enabled:
        print_and_record(lines, f"[SKIP] {step.name} - {step.script.name}")
        return 0

    if not step.script.exists():
        print_and_record(
            lines,
            f"[FAIL] {step.name} - 스크립트를 찾을 수 없습니다: {step.script}",
        )
        return 127

    print_and_record(lines, f"[START] {step.name} - {step.script.name}")
    started_at = datetime.now()
    completed = subprocess.run(
        [sys.executable, str(step.script)],
        cwd=ROOT_DIR,
        text=True,
        capture_output=True,
    )
    elapsed = datetime.now() - started_at

    if completed.stdout.strip():
        lines.append("")
        lines.append(f"--- stdout: {step.script.name} ---")
        lines.extend(completed.stdout.rstrip().splitlines())
    if completed.stderr.strip():
        lines.append("")
        lines.append(f"--- stderr: {step.script.name} ---")
        lines.extend(completed.stderr.rstrip().splitlines())

    if completed.returncode == 0:
        print_and_record(
            lines,
            f"[SUCCESS] {step.name} - {step.script.name} ({elapsed})",
        )
    else:
        print_and_record(
            lines,
            (
                f"[FAIL] {step.name} - {step.script.name} "
                f"오류 코드 {completed.returncode} ({elapsed})"
            ),
        )

    return completed.returncode


def write_report(lines: list[str]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    lines: list[str] = []
    started_at = datetime.now()

    print_and_record(lines, "IPO Base Tracker 전체 파이프라인 실행")
    print_and_record(lines, f"시작 시각: {started_at.isoformat(timespec='seconds')}")
    print_and_record(
        lines,
        (
            "옵션: "
            f"skip_fetch={args.skip_fetch}, "
            f"skip_upload={args.skip_upload}, "
            f"skip_backtest={args.skip_backtest}"
        ),
    )
    print_and_record(lines)

    exit_code = 0
    failed_step: PipelineStep | None = None
    for step in build_steps(args):
        exit_code = run_step(step, lines)
        print_and_record(lines)
        if exit_code != 0:
            failed_step = step
            break

    finished_at = datetime.now()
    print_and_record(lines, "실행 요약")
    print_and_record(lines, f"종료 시각: {finished_at.isoformat(timespec='seconds')}")
    print_and_record(lines, f"총 소요 시간: {finished_at - started_at}")

    if failed_step:
        print_and_record(
            lines,
            f"결과: 실패 - {failed_step.script.name}, 오류 코드 {exit_code}",
        )
    else:
        print_and_record(lines, "결과: 성공")

    write_report(lines)
    print(f"실행 결과 요약 저장: {REPORT_PATH}")
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
