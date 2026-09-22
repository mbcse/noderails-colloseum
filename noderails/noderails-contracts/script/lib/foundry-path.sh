# Prefer ~/.foundry/bin (Cursor/VS Code tasks often omit it from PATH).
foundry_prepend_path() {
    local bin_dir=""
    if [[ -n "${FOUNDRY_BIN:-}" && -x "${FOUNDRY_BIN}" ]]; then
        bin_dir="$(cd "$(dirname "${FOUNDRY_BIN}")" && pwd)"
    elif [[ -x "${HOME}/.foundry/bin/forge" ]]; then
        bin_dir="${HOME}/.foundry/bin"
    fi
    if [[ -n "$bin_dir" ]]; then
        export PATH="${bin_dir}:${PATH}"
    fi
}

foundry_forge_bin() {
    if [[ -n "${FOUNDRY_BIN:-}" && -x "${FOUNDRY_BIN}" ]]; then
        echo "${FOUNDRY_BIN}"
        return
    fi
    if command -v forge >/dev/null 2>&1; then
        command -v forge
        return
    fi
    echo "forge"
}
