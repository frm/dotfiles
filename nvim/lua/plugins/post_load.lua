-- LuaFormatter off

local merge = function(t1, t2)
    for k, v in pairs(t2) do
        if (type(v) == "table") and (type(t1[k] or false) == "table") then
            merge(t1[k], t2[k])
        else
            t1[k] = v
        end
    end

    return t1
end

local function unmap(mode, combo)
    vim.keymap.del(mode, combo)
end

local function map(mode, combo, mapping, opts)
    local options = merge({noremap = true}, opts or {})
    vim.keymap.set(mode, combo, mapping, options)
end

local autocmd = vim.api.nvim_create_autocmd

-----------------------------------------------------------------
-- Mason
-----------------------------------------------------------------

require("mason").setup()

-----------
--  DAPs --
-----------

require("mason-lspconfig").setup {
    ensure_installed = {
        "elixirls",
        "jsonls",
        "rubocop",
        -- "rust_analyzer", TODO: enable once the package is fixed
        "vimls",
    },
    automatic_installation = true,
}

require("mason-nvim-dap").setup({
    ensure_installed = {
        "chrome",
        "elixir",
        "js",
        "node2",
        "python",
    },
    automatic_installation = true,
})

require("neodev").setup({
  library = { plugins = { "nvim-dap-ui" }, types = true },
})


require("dapui").setup()

require("nvim-dap-virtual-text").setup()

map('n', '<localleader>db', ':lua require("dap").toggle_breakpoint()<CR>')
map('n', '<localleader>dc', ':lua require("dap").continue()<CR>')
map('n', '<localleader>do', ':lua require("dap").step_over()<CR>')
map('n', '<localleader>di', ':lua require("dap").step_into()<CR>')
map('n', '<localleader>dx', ':lua require("dap").step_out()<CR>')
map('n', '<localleader>dr', ':lua require("dap").repl.open()<CR>')

---------------------------
--  Linters & Formatters --
---------------------------

require("lsp-format").setup {}

-- TODO: lsp-format requires nvim-lsp-installer instead of mason
--       elixirls errors when autoinstalling so we need to install it
--       and configure it manually
--       to do that, we need to disable automatic_installation
require("nvim-lsp-installer").setup({
    automatic_installation = false,
})

local lsp_format_on_attach = require("lsp-format").on_attach

local eslint = require('efmls-configs.linters.eslint')
local prettier = require('efmls-configs.formatters.prettier')

local languages = {
  javascript = { eslint, prettier },
  javascriptreact = { eslint, prettier },
  typescript = { eslint, prettier },
  typescriptreact = { eslint, prettier },
}

local efmls_config = {
  filetypes = vim.tbl_keys(languages),
  settings = {
    rootMarkers = { '.git/' },
    languages = languages,
  },
  init_options = {
    documentFormatting = true,
    documentRangeFormatting = true,
  },
}

-- lspconfig.elixirls.setup {
--     cmd = { vim.fn.expand("$HOME/.local/share/nvim/lazy/elixir-ls/dist/language_server.sh") },
--     on_attach = lsp_format_on_attach,
-- }
--
-- lspconfig.efm.setup(vim.tbl_extend('force', efmls_config, {
--     on_attach = lsp_format_on_attach,
-- }))

vim.lsp.config('elixirls', {
    cmd = { vim.fn.expand("$HOME/.local/share/nvim/lazy/elixir-ls/dist/language_server.sh") },
    on_attach = lsp_format_on_attach,
})

vim.lsp.config('efm', vim.tbl_extend('force', efmls_config, {
    on_attach = lsp_format_on_attach,
}))

map('n', '<leader>t', ':Trouble diagnostics toggle<CR>')

-----------------------------------------------------------------
-- VimTmuxNavigator
-----------------------------------------------------------------

-- vim-tmux-navigator doesn't actually set :TmuxNavigateLeft for terminals
map('t', '<C-h>', '<C-\\><C-n>:TmuxNavigateLeft<CR>',  { silent = true })
map('t', '<C-l>', '<C-\\><C-n>:TmuxNavigateRight<CR>', { silent = true })

-----------------------------------------------------------------
-- Aerial
-----------------------------------------------------------------

require('aerial').setup()

-----------------------------------------------------------------
-- Telescope
-----------------------------------------------------------------

local telescope_actions = require('telescope.actions')
local telescope = require('telescope')

telescope.setup {
    defaults = {
        file_ignore_patterns = {
            "node_modules", ".git", "_build", ".elixir_ls", "deps"
        },
        mappings = {
            i = {
                ["<C-j>"] = telescope_actions.move_selection_next,
                ["<C-k>"] = telescope_actions.move_selection_previous,
                ["<C-c>"] = telescope_actions.close,
                ["<C-q>"] = telescope_actions.smart_send_to_qflist + telescope_actions.open_qflist,
                ["<M-q>"] = telescope_actions.send_to_qflist + telescope_actions.open_qflist,
            },
            n = {["<C-c>"] = telescope_actions.close}
        }
    },
    extensions = {
        fzf = {
            fuzzy = true,
            override_generic_sorter = true,
            override_file_sorter = true,
            case_mode = "smart_case",
        }
    }
}

telescope.load_extension('fzf')
telescope.load_extension('gh')
telescope.load_extension('aerial')

map('n', '<localleader>ghi', ':Telescope gh issues<CR>')
map('n', '<localleader>ghp', ':Telescope gh pull_request<CR>')
map('n', '<localleader>ghw', ':Telescope gh run<CR>')
map('n', '<localleader>o', ':Telescope aerial<CR>')

map('n', '<localleader>gb', ':FzfLua git_branches<CR>')
map('n', '<localleader>gc', ':FzfLua git_commits<CR>')

map('n', '<C-p>', ':FzfLua files<CR>')
map('n', '<localleader>gr', ':FzfLua lsp_references<CR>')
map('n', '<C-f>', ':FzfLua grep_project<CR>')
map('n', '<M-f>', ':FzfLua resume<CR>')
map('n', '<C-w><C-w>', ':FzfLua oldfiles<CR>')

-----------------------------------------------------------------
-- Wilder
-----------------------------------------------------------------

local wilder = require('wilder')

wilder.setup({ modes = { ':', '/', '?' } })

wilder.set_option('renderer', wilder.popupmenu_renderer({
  highlighter = wilder.basic_highlighter(),
}))

-----------------------------------------------------------------
-- FZF
-----------------------------------------------------------------

-- Make fzf match the vim colorscheme colors
vim.g.fzf_colors = {
    fg = { 'fg', 'Normal' },
    bg = { 'bg', 'Normal' },
    hl = { 'fg', 'Comment' },
    ['fg+'] = { 'fg', 'CursorLine', 'CursorColumn', 'Normal' },
    ['bg+'] = { 'bg', 'CursorLine', 'CursorColumn' },
    ['hl+'] = { 'fg', 'Statement' },
    info = { 'fg', 'PreProc' },
    border = { 'fg', 'Ignore' },
    prompt = { 'fg', 'Conditional' },
    pointer = { 'fg', 'Exception' },
    marker = { 'fg', 'Keyword' },
    spinner = { 'fg', 'Label' },
    header = { 'fg', 'Comment' }
}

-- Enable this if you want fzf statusline
-- make fzf status line use the vim theme colors
-- function! s:fzf_statusline()
--   highlight fzf1 ctermfg=161 ctermbg=251
--   highlight fzf2 ctermfg=23 ctermbg=251
--   highlight fzf3 ctermfg=237 ctermbg=251
--   setlocal statusline=%#fzf1#\ >\ %#fzf2#fz%#fzf3#f
-- endfunction

-- autocmd! User FzfStatusLine call <SID>fzf_statusline()

-- hide status line inside fzf
vim.cmd("autocmd! FileType fzf")
vim.cmd("autocmd  FileType fzf set laststatus=0 noshowmode noruler | autocmd BufLeave <buffer> set laststatus=2 showmode ruler")

-- Use ripgrep over grep
vim.opt.grepprg="rg --vimgrep --color=always --no-heading"

-- Enable this if you want a preview window when searching for files/regexes
-- command! -bang -nargs=* Rg
--   \ call fzf#vim#grep(
--   \   'rg --vimgrep --column --line-number --no-heading --color=always --smart-case '.shellescape(<q-args>), 1,
--   \   <bang>1 ? fzf#vim#with_preview('up:60%:wrap')
--   \           : fzf#vim#with_preview('right:50%:hidden', '?'),
--   \   <bang>1)

-- command! -bang -nargs=? -complete=dir Files
--   \ call fzf#vim#files(<q-args>, fzf#vim#with_preview('up:60%:wrap'), <bang>1)

-----------------------------------------------------------------
-- Lualine
-----------------------------------------------------------------

-- require("lualine/evil")
require("lualine/bubbles")

require("lualine").setup({
  options = {
    -- enable for auto catpuccin theme
    -- theme = "catppuccin-" .. os.getenv("CATPPUCCIN_VARIANT"),
    theme = "horizon"
  },
  sections = {
    lualine_x = { "aerial" }
  },
  tabline = {}, -- leave tabline for barbar
  extensions = {'nvim-tree'}
})

-----------------------------------------------------------------
-- Catppuccin
-----------------------------------------------------------------

require("catppuccin").setup({
  auto_integrations = true,
})

-----------------------------------------------------------------
-- Barbar
-----------------------------------------------------------------

vim.g.barbar_auto_setup = false

map('n', '<leader>1', ':BufferGoto 1<CR>',   { silent = true })
map('n', '<leader>2', ':BufferGoto 2<CR>',   { silent = true })
map('n', '<leader>3', ':BufferGoto 3<CR>',   { silent = true })
map('n', '<leader>4', ':BufferGoto 4<CR>',   { silent = true })
map('n', '<leader>5', ':BufferGoto 5<CR>',   { silent = true })
map('n', '<leader>6', ':BufferGoto 6<CR>',   { silent = true })
map('n', '<leader>7', ':BufferGoto 7<CR>',   { silent = true })
map('n', '<leader>8', ':BufferGoto 8<CR>',   { silent = true })
map('n', '<leader>9', ':BufferGoto 9<CR>',   { silent = true })
map('n', '<leader>0', ':BufferLast<CR>',     { silent = true })
map('n', '<leader>w', ':BufferClose<CR>',    { silent = true })
map('n', '<Tab>',     ':BufferNext<CR>',     { silent = true })
map('n', '<S-Tab>',   ':BufferPrevious<CR>', { silent = true })

require("barbar").setup({
    animation = true,
    exclude_ft = { 'NvimTree' },
    exclude_name = { '' },  -- exclude unnamed buffers
    auto_hide = 1,  -- auto-hide when only one buffer is open
})

-----------------------------------------------------------------
-- NvimTree
-----------------------------------------------------------------

require("nvim-tree").setup({
    sync_root_with_cwd = true,
    disable_netrw = true,
    sort_by = "case_sensitive",
    view = {
        preserve_window_proportions = true,
        side = "right",
    },
})

map('n', '<leader>n', ':NvimTreeToggle<CR>', { silent = true })
map('n', '<leader>N', ':NvimTreeFindFile<CR>', { silent = true })

vim.cmd("autocmd FileType NvimTree setlocal winhighlight=Normal:NvimTreeBg")

-----------------------------------------------------------------
-- which-key
-----------------------------------------------------------------

require("which-key").setup({
    plugins = {
        registers = false,
    }
})

-----------------------------------------------------------------
-- Splitjoin
-----------------------------------------------------------------

vim.g.splitjoin_split_mapping = ''
vim.g.splitjoin_join_mapping = ''

map('n', 'sj', ':SplitjoinSplit<CR>')

-----------------------------------------------------------------
-- TreeSitter
-----------------------------------------------------------------

require('nvim-treesitter.configs').setup {
    endwise = {
        enable = true,
    },
    highlight = {
        enable = true,
    },
    ensure_installed = {
        'awk',
        'bash',
        'c',
        'css',
        'dockerfile',
        'eex',
        'elixir',
        'erlang',
        'git_rebase',
        'gitattributes',
        'gitcommit',
        'gitignore',
        'go',
        'graphql',
        'haskell',
        'heex',
        'html',
        'javascript',
        'jq',
        'json',
        'lua',
        'luadoc',
        'make',
        'markdown',
        'markdown_inline',
        'python',
        'regex',
        'ruby',
        'rust',
        'scss',
        'solidity',
        'sql',
        'toml',
        'typescript',
        'vim',
        'vimdoc',
        'yaml'
    }
}

-----------------------------------------------------------------
-- Hop
-----------------------------------------------------------------

require('hop').setup()
local hop = require("hop")
local directions = require('hop.hint').HintDirection

vim.keymap.set('', 'f', function()
  hop.hint_char1({ direction = directions.AFTER_CURSOR, current_line_only = true })
end, { remap=true })

vim.keymap.set('', 'F', function()
  hop.hint_char1({ direction = directions.BEFORE_CURSOR, current_line_only = true })
end, { remap=true })

vim.keymap.set('', '<localleader>fs', function()
  hop.hint_char1()
end, { remap=true })

vim.keymap.set('', 't', function()
  hop.hint_char1({ direction = directions.AFTER_CURSOR, current_line_only = true, hint_offset = -1 })
end, { remap=true })

vim.keymap.set('', 'T', function()
  hop.hint_char1({ direction = directions.BEFORE_CURSOR, current_line_only = true, hint_offset = 1 })
end, { remap=true })

-----------------------------------------------------------------
-- Floaterm
-----------------------------------------------------------------

vim.g.floaterm_width = 0.9
vim.g.floaterm_height = 0.9
vim.g.floaterm_title = ''
vim.g.floaterm_autoinsert = true
vim.g.floaterm_autohide = true

map('n', '<localleader>t', ':FloatermToggle term<CR>', { silent = true })
map('t', '<Esc>', '<C-\\><C-n>', { silent = true })
map('t', '<C-e>', '<C-\\><C-n>', { silent = true })
map('t', '<C-d>', '<C-\\><C-n>:FloatermToggle term<CR>', { silent = true })

-----------------------------------------------------------------
-- ChatGPT
-----------------------------------------------------------------

map('n', '<C-t>', ':ChatGPT<CR>')
map('n', '<C-S-T>', ':ChatGPTRun<CR>')
map('n', '<C-S-A>', ':ChatGPTActAs<CR>')
map('v', '<C-t>', ':ChatGPTEditWithInstructions<CR>')

-----------------------------------------------------------------
-- VimTest
-----------------------------------------------------------------

local floaterm_new_bg = function()
    vim.cmd("FloatermNew! --autoclose=2 --width=0.3 --wintype=vsplit --name=test")
    vim.cmd("stopinsert")
    vim.cmd("wincmd p")
end

local floaterm_show_bg = function()
    vim.cmd("FloatermShow test")
    vim.cmd("stopinsert")
    vim.cmd("wincmd p")
end

local floaterm_new_or_show_bg = function()
    local bufnr = vim.fn['floaterm#terminal#get_bufnr']("test")
    local bufvar = vim.fn.getbufvar(bufnr, "floaterm_winid", -1)
    local test_term_exists = bufvar ~= -1

    if not test_term_exists then
        floaterm_new_bg()
    else
        local bufnr = bufnr or vim.fn['floaterm#terminal#get_bufnr']("test")
        local bufwinnr = vim.fn.bufwinnr(bufnr)
        local test_term_is_open = bufwinnr > -1

        if not test_term_is_open then
            floaterm_show_bg()
        end
    end
end

function _G.floaterm_test_toggle()
    local bufnr = vim.fn['floaterm#terminal#get_bufnr']("test")
    local bufvar = vim.fn.getbufvar(bufnr, "floaterm_winid", -1)
    local test_term_exists = bufvar ~= -1

    if not test_term_exists then
        floaterm_new_bg()
    else
        local bufnr = bufnr or vim.fn['floaterm#terminal#get_bufnr']("test")
        local bufwinnr = vim.fn.bufwinnr(bufnr)
        local test_term_is_open = bufwinnr > -1

        if test_term_is_open then
            vim.cmd("FloatermHide test")
        else
            floaterm_show_bg()
        end
    end
end

local vim_test_floaterm = function(cmd)
    floaterm_new_or_show_bg()
    vim.cmd("FloatermSend! --name=test " .. cmd )
end

vim.g['test#custom_strategies'] = { vim_test_floaterm = vim_test_floaterm }
vim.g['test#strategy'] = "vim_test_floaterm"
vim.g['test#preserve_screen'] = 1

map('n', '<localleader>a', ':TestSuite<CR>', { silent = true })
map('n', '<localleader>c', ':TestNearest<CR>', { silent = true })
map('n', '<localleader>f', ':TestFile<CR>', { silent = true })
map('n', '<localleader><localleader>', ':TestLast<CR>', { silent = true })
-- map('n', '<localleader>q', ':FloatermToggle test<CR>', { silent = true })
map('n', '<localleader>q', ':call v:lua.floaterm_test_toggle()<CR>')

-----------------------------------------------------------------
-- Projectionist
-----------------------------------------------------------------

map('n', '<leader>aa', ':A<CR>')
map('n', '<leader>as', ':AS<CR>')
map('n', '<leader>av', ':AV<CR>')

-----------------------------------------------------------------
-- TermFind
-----------------------------------------------------------------

require('term_find').setup({
    autocmd_pattern = 'floaterm',
    keymap_mode = 'n',
    keymap_mapping = 'gf',
    callback = function() vim.cmd("FloatermHide") end
})

-----------------------------------------------------------------
-- Diagflow
-----------------------------------------------------------------

-- vim.diagnostic.config({ virtual_lines = false })

require('diagflow').setup({
  scope = 'line',
  event = 'LspAttach',
  placement = 'top',
  toggle_event = { 'InsertEnter' },
  show_borders = true,
})

-----------------------------------------------------------------
-- mini
-----------------------------------------------------------------

-- TODO: animate is pretty but causing issues in large buffers,
-- disable for now
-- local animate = require('mini.animate')
-- animate.setup({
--   cursor = {
--     timing = animate.gen_timing.linear({ duration = 100, unit = 'total' }),
--   }
-- })

-----------------------------------------------------------------
-- Blamer
-----------------------------------------------------------------

map('n', '<localleader>gbl', ':BlamerToggle<CR>')

-----------------------------------------------------------------
-- Copilot
-----------------------------------------------------------------

vim.g.copilot_no_tab_map = true

map('i', '<C-F>', 'copilot#Accept("\\<CR>")', {
  expr = true,
  replace_keycodes = false
})

-- M-[: <Plug>(copilot-previous)
-- M-]: <Plug>(copilot-next)
-- M-\: <Plug>(copilot-suggest)')
-- M-<Space>: <Plug>(copilot-dismiss)

-- unmap existing keybindings
unmap('i', '<C-]>') -- originally <Plug>(copilot-dismiss)

map('i', '<M-Space>', '<Plug>(copilot-dismiss)')

-- LuaFormatter on
