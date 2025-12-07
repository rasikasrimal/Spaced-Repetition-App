import pathlib
import re


def find_mermaid_blocks(paths: list[pathlib.Path]) -> list[tuple[str, int, str, str]]:
    block_re = re.compile(r"```mermaid(.*?)```", re.DOTALL | re.IGNORECASE)
    sections: list[tuple[str, int, str, str]] = []

    for path in paths:
        if not path.exists():
            continue

        text = path.read_text(encoding="utf-8")
        rel = path.as_posix()
        matches = list(block_re.finditer(text))
        if not matches:
            continue

        lines = text.splitlines()
        for idx, match in enumerate(matches, 1):
            start_line = text[: match.start()].count("\n")
            title: str | None = None

            # Look upwards for a nearby markdown heading
            for offset in range(1, 8):
                line_idx = start_line - offset
                if line_idx < 0:
                    break
                candidate = lines[line_idx].strip()
                if candidate.startswith("#"):
                    title = candidate.lstrip("#").strip()
                    break

            if not title:
                title = f"Diagram {idx}"

            code = match.group(1).strip("\n")
            sections.append((rel, idx, title, code))

    return sections


def generate_output(sections: list[tuple[str, int, str, str]]) -> str:
    out_lines: list[str] = []

    out_lines.append("# Mermaid Diagrams Overview")
    out_lines.append("")
    out_lines.append(
        "This document aggregates all Mermaid diagrams found in the documentation. "
        "Each diagram is grouped by source file with a brief contextual title."
    )
    out_lines.append("")

    current_file: str | None = None

    for rel, idx, title, code in sections:
        if rel != current_file:
            current_file = rel
            out_lines.append("")
            out_lines.append("---")
            out_lines.append("")
            out_lines.append(f"## Source: `{rel}`")
            out_lines.append("")

        out_lines.append(f"### {title}")
        out_lines.append("")
        out_lines.append(
            f"*Description*: Mermaid diagram extracted from {rel}, diagram #{idx}."
        )
        out_lines.append("")
        out_lines.append("```mermaid")
        out_lines.append(code)
        out_lines.append("```")
        out_lines.append("")

    return "\n".join(out_lines)


def main() -> None:
    root = pathlib.Path(".")
    md_files = [
        pathlib.Path("README.md"),
        pathlib.Path("SpacedRepetitionApp_Documentation.md"),
        pathlib.Path("docs/core/ALGORITHMS_FORGETTING_CURVE.md"),
        pathlib.Path("docs/forgetting-curve.md"),
        pathlib.Path("docs/core/ARCHITECTURE.md"),
        pathlib.Path("docs/core/DATA_MODEL.md"),
        pathlib.Path("docs/ui/NAVIGATION.md"),
        pathlib.Path("docs/ui/UI_STYLE_AUDIT.md"),
        pathlib.Path("docs/core/STATE_MANAGEMENT.md"),
        pathlib.Path("docs/core/THESIS.md"),
        pathlib.Path("docs/core/TIMELINE.md"),
    ]

    sections = find_mermaid_blocks(md_files)
    output = generate_output(sections)

    target = root / "mermaid_diagrams.md"
    target.write_text(output, encoding="utf-8")
    print(f"Wrote {target} with {len(sections)} diagrams")


if __name__ == "__main__":
    main()

