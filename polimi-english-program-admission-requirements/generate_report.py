#!/usr/bin/env python3
"""Generate a markdown report from research JSON results."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml


PROJECT_DIR = Path(__file__).resolve().parent
FIELDS_PATH = PROJECT_DIR / "fields.yaml"
RESULTS_DIR = PROJECT_DIR / "results"
REPORT_PATH = PROJECT_DIR / "report.md"
TOC_FIELDS = ["level", "teaching_language", "campus"]

CATEGORY_MAPPING = {
    "Basic Info": ["basic_info", "Basic Info"],
    "Technical Features": [
        "technical_features",
        "technical_characteristics",
        "Technical Features",
    ],
    "Performance Metrics": ["performance_metrics", "performance", "Performance Metrics"],
    "Milestone Significance": ["milestone_significance", "milestones", "Milestone Significance"],
    "Business Info": ["business_info", "commercial_info", "Business Info"],
    "Competition & Ecosystem": [
        "competition_ecosystem",
        "competition",
        "Competition & Ecosystem",
    ],
    "History": ["history", "History"],
    "Market Positioning": ["market_positioning", "market", "Market Positioning"],
    "Program Identity": ["program_identity", "Program Identity"],
    "Admission Classification": ["admission_classification", "Admission Classification"],
    "Academic Requirements": ["academic_requirements", "Academic Requirements"],
    "Language Requirements": ["language_requirements", "Language Requirements"],
    "Deadlines and Fees": ["deadlines_and_fees", "Deadlines and Fees"],
    "Documents": ["documents", "Documents"],
    "Tests and Selection": ["tests_and_selection", "Tests and Selection"],
    "Evidence and Uncertainty": ["evidence_and_uncertainty", "Evidence and Uncertainty"],
}

INTERNAL_FIELDS = {"_source_file", "uncertain"}
NESTED_CATEGORY_KEYS = {
    alias
    for aliases in CATEGORY_MAPPING.values()
    for alias in aliases
}


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)
    data["_source_file"] = path.name
    return data


def anchor(text: str) -> str:
    value = text.lower()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def item_anchor(item: dict[str, Any], index: int) -> str:
    source = str(item.get("_source_file") or "")
    if source.endswith(".json"):
        return anchor(source[:-5])
    return f"{anchor(str(item.get('program_name') or 'item'))}-{index}"


def humanize(name: str) -> str:
    return name.replace("_", " ").strip().title()


def contains_uncertain(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return "[uncertain" in value.lower()
    if isinstance(value, list):
        return any(contains_uncertain(item) for item in value)
    if isinstance(value, dict):
        return any(contains_uncertain(item) for item in value.values())
    return False


def is_empty(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def traverse_find(obj: Any, field_name: str) -> Any:
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == field_name:
                return value
        for value in obj.values():
            found = traverse_find(value, field_name)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for item in obj:
            found = traverse_find(item, field_name)
            if found is not None:
                return found
    return None


def get_field(
    item: dict[str, Any],
    field_name: str,
    category_name: str | None = None,
    skip_uncertain: bool = True,
) -> Any:
    uncertain = set(item.get("uncertain") or [])
    if skip_uncertain and field_name in uncertain:
        return None

    value = item.get(field_name)
    if value is None and category_name:
        for key in CATEGORY_MAPPING.get(category_name, []):
            category_value = item.get(key)
            if isinstance(category_value, dict) and field_name in category_value:
                value = category_value[field_name]
                break
    if value is None:
        value = traverse_find(item, field_name)

    if skip_uncertain and (is_empty(value) or contains_uncertain(value)):
        return None
    return value


def format_inline(value: Any) -> str:
    if is_empty(value):
        return ""
    if isinstance(value, dict):
        parts = []
        for key, val in value.items():
            if is_empty(val) or contains_uncertain(val):
                continue
            parts.append(f"{humanize(key)}: {format_inline(val)}")
        return "; ".join(parts)
    if isinstance(value, list):
        clean = [format_inline(item) for item in value if not is_empty(item) and not contains_uncertain(item)]
        clean = [item for item in clean if item]
        return ", ".join(clean)
    text = str(value).strip()
    return text


def format_value(value: Any, indent: int = 0) -> str:
    prefix = "  " * indent
    if isinstance(value, list):
        if all(isinstance(item, dict) for item in value):
            lines = []
            for item in value:
                parts = []
                for key, val in item.items():
                    if is_empty(val) or contains_uncertain(val):
                        continue
                    parts.append(f"{humanize(key)}: {format_inline(val)}")
                if parts:
                    lines.append(f"{prefix}- " + " | ".join(parts))
            return "\n".join(lines)
        clean = [format_inline(item) for item in value if not is_empty(item) and not contains_uncertain(item)]
        clean = [item for item in clean if item]
        if len(clean) <= 4 and sum(len(item) for item in clean) <= 120:
            return ", ".join(clean)
        return "\n".join(f"{prefix}- {item}" for item in clean)

    if isinstance(value, dict):
        parts = []
        for key, val in value.items():
            if is_empty(val) or contains_uncertain(val):
                continue
            formatted = format_value(val, indent + 1)
            if "\n" in formatted:
                parts.append(f"{prefix}- **{humanize(key)}:**\n{formatted}")
            else:
                parts.append(f"{prefix}- **{humanize(key)}:** {formatted}")
        return "\n".join(parts)

    text = str(value).strip()
    if len(text) > 100:
        return text.replace(". ", ".<br>")
    return text


def field_definitions(fields_yaml: dict[str, Any]) -> tuple[list[dict[str, Any]], set[str]]:
    categories = fields_yaml.get("field_categories", [])
    defined = {
        field["name"]
        for category in categories
        for field in category.get("fields", [])
    }
    return categories, defined


def extra_fields(item: dict[str, Any], defined: set[str]) -> dict[str, Any]:
    extras: dict[str, Any] = {}
    uncertain = set(item.get("uncertain") or [])
    for key, value in item.items():
        if key in INTERNAL_FIELDS or key in NESTED_CATEGORY_KEYS or key in defined or key in uncertain:
            continue
        if is_empty(value) or contains_uncertain(value):
            continue
        extras[key] = value
    return extras


def sort_key(item: dict[str, Any]) -> tuple[int, str]:
    raw_level = str(item.get("level") or "")
    order = 3
    if "bachelor" in raw_level:
        order = 0
    elif "single-cycle" in raw_level:
        order = 1
    elif "master" in raw_level:
        order = 2
    return (order, str(item.get("program_name") or item.get("_source_file") or ""))


def build_report() -> str:
    fields_yaml = load_yaml(FIELDS_PATH)
    categories, defined_fields = field_definitions(fields_yaml)
    items = [load_json(path) for path in sorted(RESULTS_DIR.glob("*.json"))]
    items.sort(key=sort_key)

    lines: list[str] = []
    lines.append("# Politecnico di Milano English-Taught Programme Admission Requirements")
    lines.append("")
    lines.append(f"Source JSON files: {len(items)}")
    lines.append("")
    lines.append("## Table of Contents")
    lines.append("")
    for index, item in enumerate(items, 1):
        name = str(item.get("program_name") or item.get("_source_file"))
        summary_parts = []
        for field_name in TOC_FIELDS:
            value = get_field(item, field_name)
            if value is not None:
                summary_parts.append(f"{humanize(field_name)}: {format_inline(value)}")
        suffix = f" - {' | '.join(summary_parts)}" if summary_parts else ""
        lines.append(f"{index}. [{name}](#{item_anchor(item, index)}){suffix}")

    lines.append("")
    lines.append("## Details")
    lines.append("")

    for index, item in enumerate(items, 1):
        name = str(item.get("program_name") or item.get("_source_file"))
        lines.append(f'<a id="{item_anchor(item, index)}"></a>')
        lines.append("")
        lines.append(f"### {index}. {name}")
        lines.append("")

        for category in categories:
            category_name = category.get("category", "Other")
            category_lines = []
            for field in category.get("fields", []):
                field_name = field["name"]
                if field_name == "program_name":
                    continue
                value = get_field(item, field_name, category_name)
                if value is None:
                    continue
                formatted = format_value(value)
                if not formatted:
                    continue
                if "\n" in formatted:
                    category_lines.append(f"- **{humanize(field_name)}:**\n{formatted}")
                else:
                    category_lines.append(f"- **{humanize(field_name)}:** {formatted}")

            if category_lines:
                lines.append(f"#### {category_name}")
                lines.extend(category_lines)
                lines.append("")

        extras = extra_fields(item, defined_fields)
        if extras:
            lines.append("#### Other Info")
            for key, value in extras.items():
                formatted = format_value(value)
                if formatted:
                    lines.append(f"- **{humanize(key)}:** {formatted}")
            lines.append("")

        uncertain = item.get("uncertain") or []
        if uncertain:
            lines.append("#### Uncertain Fields")
            for field_name in uncertain:
                lines.append(f"- {field_name}")
            lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    report = build_report()
    REPORT_PATH.write_text(report, encoding="utf-8")
    print(f"Wrote {REPORT_PATH}")


if __name__ == "__main__":
    main()
