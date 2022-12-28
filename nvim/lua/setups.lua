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

-----------------------------------------------------------------
-- Mason
-----------------------------------------------------------------

require("mason").setup()

require("mason-lspconfig").setup {
    ensure_installed = {
        "elixirls",
        "tsserver",
        "rust_analyzer",
        "sumneko_lua",
        "jsonls",
        "remark_ls",
        "solang",
        "vimls",
    },
    automatic_installation = true,
}

-----------------------------------------------------------------
-- Telescope
-----------------------------------------------------------------

local telescope_actions = require('telescope.actions')
local telescope = require('telescope.builtin')

require('telescope').setup {
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

require('telescope').load_extension('fzf')
require('telescope').load_extension('gh')

map('n', '<C-p>', ':Telescope find_files<CR>')
map('n', '<C-f>', ':Telescope live_grep<CR>')
map('n', '<localleader>ghi', ':Telescope gh issues<CR>')
map('n', '<localleader>ghp', ':Telescope gh pull_request<CR>')
map('n', '<localleader>ghw', ':Telescope gh run<CR>')

-----------------------------------------------------------------
-- Lualine
-----------------------------------------------------------------

require('lualine').setup({
    options = {
        disabled_filetypes = { 'packer', 'NvimTree' }
    },
    sections = {
        lualine_a = {'mode'},
        lualine_b = {'branch', 'diff', 'diagnostics'},
        lualine_c = {'filename'},
        lualine_x = {'encoding', 'filetype'},
        lualine_y = {'progress'},
        lualine_z = {'location'}
    },
    inactive_sections = {
        lualine_a = {},
        lualine_b = {},
        lualine_c = {'filename'},
        lualine_x = {'location'},
        lualine_y = {},
        lualine_z = {}
    },
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
map('n', '<leader>N', ':NvimTreeFindFileToggle<CR>', { silent = true })

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

map('n', '<localleader>t', ':FloatermToggle<CR>', { silent = true })
map('t', '<Esc>', '<C-\\><C-n>', { silent = true })
map('t', '<C-d>', '<C-\\><C-n>:FloatermToggle<CR>', { silent = true })

-----------------------------------------------------------------
-- PairGPT
-----------------------------------------------------------------

map('v', '<localleader>gw', ':PairGPTWrite<CR>')
map('v', '<localleader>ge', ':PairGPTExplain<CR>')
map('v', '<localleader>gr', ':PairGPTRefactor<CR>')

-----------------------------------------------------------------
-- VimTest
-----------------------------------------------------------------

local custom_floaterm = function(cmd)
    vim.cmd("FloatermNew --autoclose=0 --autohide=0 --width=0.4 --wintype=vsplit --disposable=false --name=test " .. cmd )
end

vim.g['test#custom_strategies'] = { splitft = custom_floaterm }
vim.g['test#strategy'] = "splitft"
map('n', '<localleader>a', ':TestSuite<CR>', { silent = true })
map('n', '<localleader>c', ':TestNearest<CR>', { silent = true })
map('n', '<localleader>f', ':TestFile<CR>', { silent = true })
map('n', '<localleader><localleader>', ':TestLast<CR>', { silent = true })
map('n', '<localleader>q', ':FloatermToggle test<CR>', { silent = true })

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
