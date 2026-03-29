import os
import argparse
from collections import defaultdict

IGNORED_DIRS = {
    "node_modules",
    "__pycache__",
    ".git",
    "dist",
    "build",
    ".idea",
    ".vscode",
    "deno.lock"
}

def should_ignore_dir(dirname):
    return dirname in IGNORED_DIRS

def count_lines_in_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for line in f if line.strip() != "")
    except Exception:
        return 0

def walk_directory(root_path, extensions=None):
    total_lines = 0
    lines_by_ext = defaultdict(int)
    lines_by_file = {}

    for root, dirs, files in os.walk(root_path):
        # Remove diretórios ignorados
        dirs[:] = [d for d in dirs if not should_ignore_dir(d)]

        for file in files:
            filepath = os.path.join(root, file)
            ext = os.path.splitext(file)[1]

            if extensions and ext not in extensions:
                continue

            line_count = count_lines_in_file(filepath)

            if line_count > 0:
                lines_by_file[filepath] = line_count
                lines_by_ext[ext] += line_count
                total_lines += line_count

    return total_lines, lines_by_ext, lines_by_file


def main():
    parser = argparse.ArgumentParser(description="Contador de linhas de código")
    parser.add_argument("path", nargs="?", default=".", help="Caminho do projeto")
    parser.add_argument(
        "--ext",
        nargs="*",
        help="Extensões para contar (ex: .py .ts .go)"
    )

    args = parser.parse_args()

    extensions = set(args.ext) if args.ext else None

    total, by_ext, by_file = walk_directory(args.path, extensions)

    print("\n📊 Linhas por extensão:")
    for ext, count in sorted(by_ext.items()):
        print(f"{ext or '[sem extensão]'}: {count}")

    print("\n📁 Linhas por arquivo:")
    for file, count in sorted(by_file.items()):
        print(f"{file}: {count}")

    print("\n🔥 TOTAL:", total)


if __name__ == "__main__":
    main()

# python main.py . --ext .ts .js .css .scss .html .go