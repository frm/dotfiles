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
-- Mini Starter
-----------------------------------------------------------------

local starter = require('mini.starter')

starter.setup({
    query_updaters = 'abdefhijklmorsuvwxyz0123456789_-.',
    evaluate_single = true,
    items = {
        function()
            local oldfiles = vim.v.oldfiles
            local cwd = vim.fn.getcwd() .. '/'
            local filtered = {}

            for _, path in ipairs(oldfiles) do
                if #filtered >= 5 then break end
                if path:find(cwd, 1, true) and not path:find('%.git/') and vim.fn.filereadable(path) == 1 then
                    local name = path:sub(#cwd + 1)
                    table.insert(filtered, {
                        name = name,
                        action = 'edit ' .. path,
                        section = 'Recent files',
                    })
                end
            end

            return filtered
        end,

        { name = 't. File tree',    action = 'NvimTreeToggle',                 section = 'Actions' },
        { name = 'p. Find file',   action = 'lua Snacks.picker.files()',      section = 'Actions' },
        { name = 'n. New file',     action = 'enew',                           section = 'Actions' },
        { name = 'g. Grep',         action = 'lua Snacks.picker.grep()',       section = 'Actions' },

        { name = 'cc. Claude Code', action = function() require('lazy').load({ plugins = { 'claudecode.nvim' } }); vim.cmd('ClaudeCode') end, section = 'AI' },
        { name = 'co. Codex',       action = function() require('plugins.custom.codex').toggle() end, section = 'AI' },

        { name = 'q. Quit',         action = 'qa',                            section = 'Quit' },
    },

    content_hooks = {
        starter.gen_hook.adding_bullet('  '),
        starter.gen_hook.indexing('all', { 'Actions', 'AI', 'Quit' }),
        starter.gen_hook.aligning('center', 'center'),
    },

    footer = '',
})

-- mini.starter maps <C-p>/<C-n> for item navigation, which shadows
-- Snacks keybindings. Override them on the starter buffer.
autocmd('User', {
    pattern = 'MiniStarterOpened',
    callback = function(args)
        local buf = args.buf
        vim.keymap.set('n', '<C-p>', function() Snacks.picker.files() end, { buffer = buf })
        vim.keymap.set('n', '<C-f>', function() Snacks.picker.resume({ source = "grep" }) end, { buffer = buf })
        vim.keymap.set('n', 't', function() vim.cmd('NvimTreeToggle') end, { buffer = buf })
        vim.keymap.set('n', 'p', function() Snacks.picker.files() end, { buffer = buf })
        vim.keymap.set('n', 'g', function() Snacks.picker.grep() end, { buffer = buf })
        vim.keymap.set('n', 'n', function() vim.cmd('enew') end, { buffer = buf })
        vim.keymap.set('n', 'cc', function() require('lazy').load({ plugins = { 'claudecode.nvim' } }); vim.cmd('ClaudeCode') end, { buffer = buf })
        vim.keymap.set('n', 'co', function() require('plugins.custom.codex').toggle() end, { buffer = buf })
        vim.keymap.set('n', 'q', function() vim.cmd('qa') end, { buffer = buf })
    end,
})

-----------------------------------------------------------------
-- Mason
-----------------------------------------------------------------

require("mason").setup()

require("mason-tool-installer").setup({
    ensure_installed = {
        "prettierd",
        "eslint_d",
    },
})

-----------
--  DAPs --
-----------

-- mason-lspconfig setup is done after nvim-cmp config below
-- to ensure capabilities are defined first

require("mason-nvim-dap").setup({
    ensure_installed = {
        "elixir",
        "js",
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
map('n', '<localleader>du', ':lua require("dapui").toggle()<CR>')

---------------------------
--  Completion (nvim-cmp)
---------------------------

local cmp = require('cmp')
local cmp_ultisnips_mappings = require('cmp_nvim_ultisnips.mappings')

cmp.setup({
  snippet = {
    expand = function(args)
      vim.fn["UltiSnips#Anon"](args.body)
    end,
  },
  mapping = cmp.mapping.preset.insert({
    ['<C-Space>'] = cmp.mapping.complete(),
    ['<CR>'] = cmp.mapping.confirm({ select = true }),
    ['<Tab>'] = cmp.mapping(function(fallback)
      -- Accept Copilot suggestion if visible
      if vim.fn['copilot#GetDisplayedSuggestion']().text ~= '' then
        vim.api.nvim_feedkeys(vim.fn['copilot#Accept'](), 'n', true)
      elseif cmp.visible() then
        cmp.select_next_item()
      else
        cmp_ultisnips_mappings.expand_or_jump_forwards(fallback)
      end
    end, { 'i', 's' }),
    ['<S-Tab>'] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_prev_item()
      else
        cmp_ultisnips_mappings.jump_backwards(fallback)
      end
    end, { 'i', 's' }),
  }),
  sources = cmp.config.sources({
    { name = 'nvim_lsp' },
    { name = 'ultisnips' },
    { name = 'buffer' },
    { name = 'path' },
  }),
})

---------------------------
--  LSP Configuration
---------------------------

local capabilities = require('cmp_nvim_lsp').default_capabilities()

-- Set up LSP keybindings via LspAttach autocmd
autocmd('LspAttach', {
    callback = function(args)
        local bufnr = args.buf
        vim.keymap.set('n', '<C-]>', vim.lsp.buf.definition, { buffer = bufnr })
    end,
})

-----------------------------------------------------------------
-- Conform (formatting)
-----------------------------------------------------------------

local conform = require("conform")

conform.setup({
  formatters_by_ft = {
    javascript = { "prettierd" },
    javascriptreact = { "prettierd" },
    typescript = { "prettierd" },
    typescriptreact = { "prettierd" },
    json = { "prettierd" },
    css = { "prettierd" },
    html = { "prettierd" },
    markdown = { "prettierd" },
  },
})

-- Format on save with smear cursor handling
autocmd("BufWritePre", {
  callback = function(args)
    -- Disable smear cursor during format to prevent visible cursor jump
    local smear = require("smear_cursor")
    local was_enabled = smear.enabled
    smear.enabled = false

    -- lsp_fallback = true means: use conform if available, otherwise use LSP
    conform.format({ bufnr = args.buf, timeout_ms = 3000, lsp_fallback = true })

    smear.enabled = was_enabled
  end,
})

-----------------------------------------------------------------
-- nvim-lint (linting)
-----------------------------------------------------------------

local lint = require("lint")

lint.linters_by_ft = {
  javascript = { "eslint_d" },
  javascriptreact = { "eslint_d" },
  typescript = { "eslint_d" },
  typescriptreact = { "eslint_d" },
}

-- Lint on save and when leaving insert mode
autocmd({ "BufWritePost", "InsertLeave", "BufReadPost" }, {
  callback = function()
    lint.try_lint()
  end,
})

local lspconfig = require('lspconfig')

-- Setup mason-lspconfig with handlers
require("mason-lspconfig").setup({
    ensure_installed = {
        "elixirls",
        "jsonls",
        "rubocop",
        "vimls",
    },
    automatic_installation = true,
    handlers = {
        -- Default handler for all servers
        function(server_name)
            lspconfig[server_name].setup({
                capabilities = capabilities,
            })
        end,
    },
})


-----------------------------------------------------------------
-- VimTmuxNavigator
-----------------------------------------------------------------

-- vim-tmux-navigator doesn't actually set :TmuxNavigate* for terminals
map('t', '<C-h>', '<C-\\><C-n>:TmuxNavigateLeft<CR>',  { silent = true })
map('t', '<C-j>', '<C-\\><C-n>:TmuxNavigateDown<CR>',  { silent = true })
map('t', '<C-k>', '<C-\\><C-n>:TmuxNavigateUp<CR>',    { silent = true })
map('t', '<C-l>', '<C-\\><C-n>:TmuxNavigateRight<CR>', { silent = true })

-----------------------------------------------------------------
-- Wilder
-----------------------------------------------------------------

local wilder = require('wilder')

wilder.setup({ modes = { ':', '/', '?' } })

wilder.set_option('renderer', wilder.popupmenu_renderer({
  highlighter = wilder.basic_highlighter(),
}))

-- Use ripgrep over grep
vim.opt.grepprg="rg --vimgrep --color=always --no-heading"

-----------------------------------------------------------------
-- Lualine
-----------------------------------------------------------------

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
-- smear
-----------------------------------------------------------------
require("smear_cursor").setup({
    stiffness = 0.5,
    trailing_stiffness = 0.49,
    never_draw_over_target = false
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
-- TreeSJ
-----------------------------------------------------------------

local tsj = require('treesj')

tsj.setup({
    use_default_keymaps = false,
    max_join_length = 250,
})

vim.keymap.set('n', 'sj', function()
    require('treesj').toggle({ split = { recursive = true } })
end)

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
-- Blamer
-----------------------------------------------------------------

map('n', '<localleader>gbl', ':BlamerToggle<CR>')

-----------------------------------------------------------------
-- Copilot
-----------------------------------------------------------------

vim.g.copilot_no_tab_map = true

-- Tab accepts Copilot (handled in nvim-cmp mapping above)
-- M-[: <Plug>(copilot-previous)
-- M-]: <Plug>(copilot-next)
-- M-\: <Plug>(copilot-suggest)')

-- unmap existing keybindings
unmap('i', '<C-]>') -- originally <Plug>(copilot-dismiss)

map('i', '<M-Space>', '<Plug>(copilot-dismiss)')

-- LuaFormatter on
