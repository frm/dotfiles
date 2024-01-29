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

local function map(mode, combo, mapping, opts)
    local options = merge({noremap = true}, opts or {})
    vim.api.nvim_set_keymap(mode, combo, mapping, options)
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
        "elixirls", -- TODO: disable when lexical is working
        "jsonls",
        "rubocop",
        "rust_analyzer",
        "tsserver",
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


local dap = require('dap')

dap.adapters.mix_task = {
  type = 'executable',
  command = '/Users/frm/.bin/lexical/bin/debug_shell.sh',
  args = {}
}

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

-- See: https://github.com/nvimtools/none-ls.nvim/wiki/Formatting-on-save

local async_formatting = function(bufnr)
    bufnr = bufnr or vim.api.nvim_get_current_buf()

    vim.lsp.buf_request(
        bufnr,
        "textDocument/formatting",
        vim.lsp.util.make_formatting_params({}),
        function(err, res, ctx)
            if err then
                local err_msg = type(err) == "string" and err or err.message
                -- you can modify the log message / level (or ignore it completely)
                vim.notify("formatting: " .. err_msg, vim.log.levels.WARN)
                return
            end

            -- don't apply results if buffer is unloaded or has been modified
            if not vim.api.nvim_buf_is_loaded(bufnr) or vim.api.nvim_buf_get_option(bufnr, "modified") then
                return
            end

            if res then
                local client = vim.lsp.get_client_by_id(ctx.client_id)
                vim.lsp.util.apply_text_edits(res, bufnr, client and client.offset_encoding or "utf-16")
                vim.api.nvim_buf_call(bufnr, function()
                    vim.cmd("silent noautocmd update")
                end)
            end
        end
    )
end

local augroup = vim.api.nvim_create_augroup("LspFormatting", {})

local null_ls = require("null-ls")

null_ls.setup({
    sources = {
        -- code actions
        null_ls.builtins.code_actions.eslint_d,
        null_ls.builtins.code_actions.gitsigns,
        null_ls.builtins.code_actions.ltrs,
        null_ls.builtins.code_actions.proselint,
        null_ls.builtins.code_actions.shellcheck,
        null_ls.builtins.code_actions.ts_node_action,
        -- completions
        null_ls.builtins.completion.luasnip,
        null_ls.builtins.completion.spell,
        null_ls.builtins.completion.tags,
        -- diagnostics
        null_ls.builtins.diagnostics.actionlint,
        null_ls.builtins.diagnostics.alex,
        null_ls.builtins.diagnostics.bandit,
        null_ls.builtins.diagnostics.checkmake,
        null_ls.builtins.diagnostics.chktex,
        null_ls.builtins.diagnostics.clang_check,
        -- null_ls.builtins.diagnostics.codespell, needs pip install codespell
        null_ls.builtins.diagnostics.credo,
        null_ls.builtins.diagnostics.djlint,
        null_ls.builtins.diagnostics.dotenv_linter,
        null_ls.builtins.diagnostics.erb_lint,
        null_ls.builtins.diagnostics.eslint_d,
        null_ls.builtins.diagnostics.flake8,
        null_ls.builtins.diagnostics.gitlint,
        null_ls.builtins.diagnostics.jsonlint,
        null_ls.builtins.diagnostics.ltrs,
        null_ls.builtins.diagnostics.markdownlint,
        null_ls.builtins.diagnostics.proselint,
        null_ls.builtins.diagnostics.rubocop,
        null_ls.builtins.diagnostics.shellcheck,
        null_ls.builtins.diagnostics.solhint,
        null_ls.builtins.diagnostics.stylelint,
        null_ls.builtins.diagnostics.tsc,
        null_ls.builtins.diagnostics.zsh,

        --
        -- formatting
        null_ls.builtins.formatting.erb_format,
        null_ls.builtins.formatting.erlfmt,
        null_ls.builtins.formatting.eslint_d,
        null_ls.builtins.formatting.fixjson,
        null_ls.builtins.formatting.forge_fmt,
        null_ls.builtins.formatting.gofmt,
        null_ls.builtins.formatting.goimports,
        null_ls.builtins.formatting.htmlbeautifier,
        null_ls.builtins.formatting.lua_format,
        null_ls.builtins.formatting.mix,
        null_ls.builtins.formatting.prettierd,
        null_ls.builtins.formatting.remark,
        null_ls.builtins.formatting.rubocop,
        null_ls.builtins.formatting.rustfmt,
        null_ls.builtins.formatting.shellharden,
        null_ls.builtins.formatting.sqlformat,
        null_ls.builtins.formatting.stylelint,

        --
        -- hover
        null_ls.builtins.hover.dictionary,
        null_ls.builtins.hover.printenv
    },
    debug = false,
    on_attach = function(client, bufnr)
      if client.supports_method("textDocument/formatting") then
        vim.api.nvim_clear_autocmds({ group = augroup, buffer = bufnr })
        vim.api.nvim_create_autocmd("BufWritePost", {
          group = augroup,
          buffer = bufnr,
          callback = function()
            async_formatting(bufnr)
          end,
        })
      end
    end,
})

-----------------------------------------------------------------
-- Lexical
-----------------------------------------------------------------
-- TODO: reenable this when Lexical adds needed support for codelens and DAP
-- require("lspconfig").lexical.setup {
--   cmd = { "/Users/frm/.bin/lexical/bin/start_lexical.sh" },
-- }

-----------------------------------------------------------------
-- Replacer
-----------------------------------------------------------------

-- autocmd('FileType', {
--     pattern = 'qf',
--     command = 'lua require("replacer").run()'
-- })

-- map("n", "<localleader>qf", ':lua require("replacer").run()<cr>', {silent = true})

-----------------------------------------------------------------
-- Aerial
-----------------------------------------------------------------

require('aerial').setup()

-----------------------------------------------------------------
-- Telescope
-----------------------------------------------------------------

local telescope_actions = require('telescope.actions')
local telescope = require('telescope')

telescope.load_extension('fzf')
telescope.load_extension('gh')
telescope.load_extension('aerial')

telescope.setup {
    defaults = {
        file_ignore_patterns = {
            "node_modules", ".git", "_build", ".elixir_ls", "deps"
        },
        mappings = {
            i = {
                ["<C-j>"] = telescope_actions.move_selection_next,
                ["<C-k>"] = telescope_actions.move_selection_previous,
                ["<C-c>"] = telescope_actions.close
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

map('n', '<localleader>ghi', ':Telescope gh issues<CR>')
map('n', '<localleader>ghp', ':Telescope gh pull_request<CR>')
map('n', '<localleader>ghw', ':Telescope gh run<CR>')

map('n', '<localleader>gb', ':Telescope git_branches<CR>')
map('n', '<localleader>gc', ':Telescope git_commits<CR>')

map('n', '<localleader>o', ':Telescope aerial<CR>')
map('n', '<C-S-k>', ':Telescope commands<CR>')
map('n', '<C-p>', ':Telescope find_files<CR>')
map('n', '<C-S-p>', ':Telescope projects<CR>')
map('n', '<localleader>gr', ':Telescope lsp_references<CR>')
map('n', '<C-f>', ':Telescope live_grep<CR>')
map('n', '<C-w><C-w>', ':Telescope oldfiles<CR>')

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
  sections = {
    lualine_x = { "aerial" }
  }
})


-----------------------------------------------------------------
-- Barbar
-----------------------------------------------------------------

map('n', '<leader>1', ':BufferGoto 1<CR>', { silent = true })
map('n', '<leader>2', ':BufferGoto 2<CR>', { silent = true })
map('n', '<leader>3', ':BufferGoto 3<CR>', { silent = true })
map('n', '<leader>4', ':BufferGoto 4<CR>', { silent = true })
map('n', '<leader>5', ':BufferGoto 5<CR>', { silent = true })
map('n', '<leader>6', ':BufferGoto 6<CR>', { silent = true })
map('n', '<leader>7', ':BufferGoto 7<CR>', { silent = true })
map('n', '<leader>8', ':BufferGoto 8<CR>', { silent = true })
map('n', '<leader>9', ':BufferGoto 9<CR>', { silent = true })
map('n', '<leader>0', ':BufferLast<CR>',   { silent = true })
map('n', '<leader>w', ':BufferClose<CR>',  { silent = true })

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
-- COQ
-----------------------------------------------------------------

vim.g.coq_settings = {
    auto_start = 'shut-up',
    keymap = {
        jump_to_mark = '<C-g>',
    }
}

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
        'html',
        'javascript',
        'jq',
        'json',
        'lua',
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
-- PairGPT
-----------------------------------------------------------------

require('pair-gpt').setup()

map('v', '<leader>gw', ':PairGPTWrite<CR>')
map('v', '<leader>ge', ':PairGPTExplain<CR>')
map('v', '<leader>gr', ':PairGPTRefactor<CR>')

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
-- UltiSnips
-----------------------------------------------------------------

vim.g.UltiSnipsExpandTrigger = "<C-j>"
vim.g.UltiSnipsJumpForwardTrigger = "<C-j>"
vim.g.UltiSnipsJumpBackwardTrigger = "<C-k>"

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
-- nvim-treesitter-textsubjects
-----------------------------------------------------------------

require('nvim-treesitter.configs').setup {
    textsubjects = {
        enable = true,
        prev_selection = ',',
        keymaps = {
            ['<CR>'] = 'textsubjects-smart',
            ['<space-cr>'] = 'textsubjects-container-inner'
        },
    },
}

-----------------------------------------------------------------
-- mini
-----------------------------------------------------------------

local animate = require('mini.animate')
animate.setup({
  cursor = {
    timing = animate.gen_timing.linear({ duration = 100, unit = 'total' }),
  }
})

-----------------------------------------------------------------
-- Blamer
-----------------------------------------------------------------

map('n', '<localleader>gbl', ':BlamerToggle<CR>')
