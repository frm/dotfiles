# Neovim Configuration

Personal neovim setup with lazy.nvim plugin management, custom color scheme tweaks, and language-specific settings.

## Structure

```
nvim/
  init.lua              Entry point — loads modules in order
  lua/
    pkgmngr.lua         Bootstraps lazy.nvim plugin manager
    base.lua            Core vim options (tabs, numbers, splits, undo, etc.)
    keybindings.lua     Global keybindings (leader=Space, localleader=Comma)
    plugins.lua         Plugin list for lazy.nvim (terminal mode)
    plugins/
      config.lua        Plugin configuration (terminal mode)
      cursor/           VS Code mode — separate plugin list + config for vscode-neovim
      custom/           Local plugins not managed by lazy.nvim
    colours.lua         Color scheme (horizon) + highlight overrides
    tabfix.lua          Tab behavior fixes
    lualine/            Custom lualine themes (bubbles, evil)
  ftplugin/             Per-filetype settings (elixir, go, js, markdown, ruby, rust, tex)
  UltiSnips/            Snippet definitions per language
  pythonx/              Python snippet helpers used by UltiSnips
  colors/               Custom color schemes (tranquility variants, mountaineer)
  autoload/airline/     Custom airline themes (legacy, mostly unused)
  bin/                  Helper scripts (nvim-wait)
  nvim.init             Shell init — adds bin/ to PATH
```

## Loading Order

`init.lua` loads modules in this order:
1. `pkgmngr` — bootstraps lazy.nvim
2. `base` — core options
3. `keybindings` — global mappings
4. `plugins` + `plugins/config` (or `plugins/cursor/*` if running inside VS Code)
5. `colours` — color scheme and highlight overrides
6. `tabfix`

## Key Conventions

**Plugin management:**
- All plugins are declared in `lua/plugins.lua` as a lazy.nvim spec table.
- Plugin configuration goes in `lua/plugins/config.lua`, not inline in the spec.
- Custom/local plugins go in `lua/plugins/custom/` as standalone Lua modules with a `.setup()` function.
- `nvim-treesitter` is pinned to the `main` branch (the post-0.12 rewrite). Setup uses `require('nvim-treesitter').install(...)` and a `FileType` autocmd that calls `vim.treesitter.start()`. The legacy `require('nvim-treesitter.configs').setup{...}` API is gone — do not reintroduce it.

**Keybindings:**
- Leader is Space, local leader is Comma.
- Global bindings in `lua/keybindings.lua` using the `map(mode, combo, mapping)` helper.
- Plugin-specific bindings in `lua/plugins/config.lua`.
- `jk` exits insert mode.

**Color scheme:**
- Currently using `horizon` with extensive highlight overrides in `colours.lua`.
- Overrides are applied via a `ColorScheme` autocmd so they survive scheme reloads.
- Language-specific highlight fixes (e.g. Elixir atoms, operators) are in the same autocmd.

**Filetype settings:**
- Per-filetype config goes in `ftplugin/<language>.vim` (vimscript, not Lua — these are standard nvim ftplugin files).

**Snippets:**
- UltiSnips snippet files in `UltiSnips/<language>.snippets`.
- Python helpers in `pythonx/` for complex snippet logic.

**VS Code mode:**
- When running as vscode-neovim, `init.lua` loads `plugins/cursor/` instead of the regular plugins. This is a minimal set — no UI plugins, no LSP, just keybindings and text manipulation.

## When Modifying

- Don't change loading order in `init.lua` without understanding dependencies.
- New plugins go in `plugins.lua` (spec) + `plugins/config.lua` (configuration).
- New keybindings for plugins go in `plugins/config.lua`, not `keybindings.lua`.
- Color overrides go in the `ColorScheme` autocmd in `colours.lua`.
- Don't remove commented-out color scheme blocks in `colours.lua` — they're kept as quick-switch references.
