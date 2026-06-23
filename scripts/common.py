from __future__ import annotations

import argparse
import csv
from datetime import datetime
from pathlib import Path
from typing import Callable

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
) -> None:
    ensure_data_dirs()
    parser = build_parser(description, default_input, default_output)
    args = parser.parse_args()

    try:
      df = read_csv(args.input)
      result = processor(df)
      write_csv(result, args.output)
      print(f"Saved {len(result)} rows to {args.output}")
    except Exception as exc:
      record_error(script_name, str(exc), args.input)
      raise
