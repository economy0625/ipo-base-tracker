from __future__ import annotations

import argparse
import csv
from datetime import datetime
from pathlib import Path
from typing import Callable, Iterable

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "data" / "raw"
PROCESSED_DIR = ROOT_DIR / "data" / "processed"
OUTPUT_DIR = ROOT_DIR / "data" / "output"
ERRORS_PATH = OUTPUT_DIR / "errors.csv"


def ensure_data_dirs() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def build_parser(description: str, default_input: Path, default_output: Path) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument(
        "--input",
        default=str(default_input),
        help="Input CSV path",
    )
    parser.add_argument(
        "--output",
        default=str(default_output),
        help="Output CSV path",
    )
    return parser


def read_csv(path: str | Path) -> pd.DataFrame:
    return pd.read_csv(path)


def resolve_input_path(
    requested_path: str | Path,
    standard_path: Path,
    fallback_paths: Iterable[Path] = (),
    next_script: str | None = None,
) -> Path:
    requested = Path(requested_path)
    if requested.exists():
        return requested

    if requested == standard_path:
        for fallback_path in fallback_paths:
            if fallback_path.exists():
                print(
                    f"표준 입력 파일이 없어 이전 파일명을 사용합니다: {fallback_path}"
                )
                return fallback_path

    message = f"입력 파일을 찾을 수 없습니다: {requested}"
    if next_script:
        message += f"\n먼저 다음 스크립트를 실행해 주세요: {next_script}"
    raise FileNotFoundError(message)


def write_csv(df: pd.DataFrame, path: str | Path) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")


def record_error(script_name: str, message: str, input_path: str | Path | None = None) -> None:
    ensure_data_dirs()
    is_new = not ERRORS_PATH.exists()
    with ERRORS_PATH.open("a", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["timestamp", "script", "input_path", "error"],
        )
        if is_new:
            writer.writeheader()
        writer.writerow(
            {
                "timestamp": datetime.now().isoformat(timespec="seconds"),
                "script": script_name,
                "input_path": str(input_path) if input_path else "",
                "error": message,
            }
        )


def run_step(
    script_name: str,
    description: str,
    default_input: Path,
    default_output: Path,
    processor: Callable[[pd.DataFrame], pd.DataFrame],
    fallback_inputs: Iterable[Path] = (),
    next_script: str | None = None,
) -> None:
    ensure_data_dirs()
    parser = build_parser(description, default_input, default_output)
    args = parser.parse_args()

    try:
        input_path = resolve_input_path(
            args.input,
            default_input,
            fallback_inputs,
            next_script,
        )
        df = read_csv(input_path)
        result = processor(df)
        write_csv(result, args.output)
        print(f"저장 완료: {args.output} ({len(result)}행)")
    except FileNotFoundError as exc:
        print(exc)
        record_error(script_name, str(exc), args.input)
    except Exception as exc:
        record_error(script_name, str(exc), args.input)
        raise
