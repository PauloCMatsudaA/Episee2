import os
import re
import ast
import tokenize
import io
import sys

SKIP_DIRS = {'node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', 'build', '.expo', '.next', 'coverage'}
PY_EXTS   = {'.py'}
JS_EXTS   = {'.js', '.ts', '.tsx', '.jsx'}
CSS_EXTS  = {'.css'}
ALL_EXTS  = PY_EXTS | JS_EXTS | CSS_EXTS

def remove_python(source):
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return _remove_hash_only(source)

    docstring_positions = set()
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Expr)
            and isinstance(node.value, ast.Constant)
            and isinstance(node.value.value, str)
        ):
            docstring_positions.add((node.lineno, node.col_offset))

    result = []
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(source).readline))
        last_lineno, last_col = -1, 0
        for tok in tokens:
            ttype, tstr, (srow, scol), (erow, ecol), _ = tok
            if srow > last_lineno:
                last_col = 0
            if scol > last_col:
                result.append(" " * (scol - last_col))
            if ttype == tokenize.COMMENT:
                pass
            elif ttype == tokenize.STRING and (srow, scol) in docstring_positions:
                pass
            else:
                result.append(tstr)
            last_lineno, last_col = erow, ecol
        out = "".join(result)
    except Exception:
        return _remove_hash_only(source)

    return _clean_blank_lines(out)

def _remove_hash_only(source):
    lines = [re.sub(r'#.*$', '', line).rstrip() for line in source.splitlines()]
    return _clean_blank_lines("\n".join(lines))

def remove_js(source):
    result = []
    i, n = 0, len(source)
    in_sq = in_dq = in_tpl = False

    while i < n:
        c = source[i]
        not_in_str = not in_sq and not in_dq and not in_tpl

        if not_in_str and source[i:i+2] == '/*':
            end = source.find('*/', i + 2)
            i = n if end == -1 else end + 2
            continue

        if not_in_str and source[i:i+2] == '//':
            end = source.find('\n', i)
            i = n if end == -1 else end
            continue

        if c == "'" and not in_dq and not in_tpl:
            in_sq = not in_sq
        elif c == '"' and not in_sq and not in_tpl:
            in_dq = not in_dq
        elif c == '`' and not in_sq and not in_dq:
            in_tpl = not in_tpl

        if c == '\\' and (in_sq or in_dq or in_tpl):
            result.append(c)
            i += 1
            if i < n:
                result.append(source[i])
            i += 1
            continue

        result.append(c)
        i += 1

    return _clean_blank_lines("".join(result))

def remove_css(source):
    out = re.sub(r'/\*.*?\*/', '', source, flags=re.DOTALL)
    return _clean_blank_lines(out)

def _clean_blank_lines(text):
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        if line.strip() == "" and cleaned and cleaned[-1].strip() == "":
            continue
        cleaned.append(line)
    result = "\n".join(cleaned).strip()
    return result + "\n" if result else "\n"

def process_repo(root_path):
    changed, errors = [], []

    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in ALL_EXTS:
                continue
            fpath = os.path.join(root, fname)
            rel   = os.path.relpath(fpath, root_path)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                    original = f.read()

                if ext in PY_EXTS:
                    cleaned = remove_python(original)
                elif ext in JS_EXTS:
                    cleaned = remove_js(original)
                else:
                    cleaned = remove_css(original)

                if cleaned != original:
                    with open(fpath, 'w', encoding='utf-8') as f:
                        f.write(cleaned)
                    changed.append(rel)
                    print(f"  \u2713  {rel}")
            except Exception as e:
                errors.append((rel, str(e)))
                print(f"  \u2717  {rel} -- {e}")

    print(f"\n{'='*50}")
    print(f"Files changed : {len(changed)}")
    print(f"Errors        : {len(errors)}")
    if errors:
        print("\nFiles with errors (not modified):")
        for rel, msg in errors:
            print(f"  {rel}: {msg}")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    target = os.path.abspath(target)
    if not os.path.isdir(target):
        print(f"Error: '{target}' is not a directory.")
        sys.exit(1)
    print(f"Cleaning comments in: {target}\n")
    process_repo(target)
