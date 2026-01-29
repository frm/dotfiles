-- LuaFormatter off

-- Make sure to set `mapleader` before lazy so your mappings are correct
vim.g.mapleader = " "

require("lazy").setup({
  -- meta utils
  { 'echasnovski/mini.nvim', version = false },

  -- gui
  'christoomey/vim-tmux-navigator',

  {
    'nvim-lualine/lualine.nvim',
    dependencies = { 'nvim-tree/nvim-web-devicons' }
  },

  {
    'stevearc/aerial.nvim',
    dependencies = {
       "nvim-treesitter/nvim-treesitter",
       "nvim-tree/nvim-web-devicons"
    },
    config = function()
      require('aerial').setup()
    end
  },


  {
    'romgrk/barbar.nvim',
    dependencies = {
      'lewis6991/gitsigns.nvim',
      'nvim-tree/nvim-web-devicons',
    },
  },

  {
    'nvim-tree/nvim-tree.lua',
    dependencies = {'nvim-tree/nvim-web-devicons'},
    version = "*",
    lazy = false
  },

  'sphamba/smear-cursor.nvim',
  'gelguy/wilder.nvim',
  'RRethy/vim-illuminate',
  'wincent/terminus',
  'voldikss/vim-floaterm',
  { 'RRethy/vim-hexokinase', build = 'make hexokinase' },

  -- behaviour
  {
    'Wansmer/treesj',
    dependencies = { 'nvim-treesitter/nvim-treesitter' }
  },

  {
    'kevinhwang91/nvim-ufo',
    dependencies = 'kevinhwang91/promise-async'
  },

  'JoosepAlviste/nvim-ts-context-commentstring',

  {
    'numToStr/Comment.nvim',
    lazy = false,
    config = function()
      require('Comment').setup()
    end
  },

  -- shadow behaviour
  'derekprior/vim-trimmer',
  'farmergreg/vim-lastplace',
  'RRethy/nvim-treesitter-endwise',

  {
    "HiPhish/rainbow-delimiters.nvim",
    dependencies = "nvim-treesitter/nvim-treesitter",
  },

  {
    "nvim-treesitter/nvim-treesitter-textobjects",
    dependencies = "nvim-treesitter/nvim-treesitter",
  },

  -- ide-nss/functionality
  'tpope/vim-fugitive',
  'tpope/vim-rhubarb',
  'APZelos/blamer.nvim',
  'SirVer/ultisnips',
  'tpope/vim-projectionist',
  'tpope/vim-abolish',
  'tpope/vim-surround',
  'vim-test/vim-test',
  'stefandtw/quickfix-reflector.vim',
  { 'mg979/vim-visual-multi', branch = 'master' },

  {
    "embear/vim-localvimrc",
    init = function()
      vim.g.localvimrc_whitelist = "^" .. vim.fn.expand("$HOME") .. "/Developer/.*"
    end
  },

  {
     'smoka7/hop.nvim',
     version = "*",
     opts = {
       keys = 'etovxqpdygfblzhckisuran'
     }
  },

  -- Snacks.nvim
  {
    "folke/snacks.nvim",
    opts = {
      picker = {
        enabled = true,
        layout = {
          layout = {
            backdrop = false,
          },
        },
        win = {
          input = {
            keys = {
              ["<C-v>"] = { "edit_vsplit", mode = { "i", "n" } },
              ["<C-x>"] = { "edit_split", mode = { "i", "n" } },
              ["<C-u>"] = { function() vim.api.nvim_set_current_line("") end, mode = { "i", "n" } },
            },
          },
        },
      },
    },
    keys = {
      -- Files
      { "<C-p>", function() Snacks.picker.files() end, desc = "Find files" },
      { "<C-f>", function() Snacks.picker.resume({ source = "grep" }) end, desc = "Grep" },

      -- Git
      { "<localleader>gb", function() Snacks.picker.git_branches() end, desc = "Git branches" },
      { "<localleader>gc", function() Snacks.picker.git_log() end, desc = "Git commits" },

      -- LSP
      { "<localleader>gr", function() Snacks.picker.lsp_references() end, desc = "LSP references" },
      { "<localleader>o", function() Snacks.picker.lsp_symbols() end, desc = "LSP symbols" },

      -- GitHub
      { "<localleader>ghi", function() Snacks.picker.git_issues() end, desc = "GitHub issues" },
      { "<localleader>ghp", function() Snacks.picker.git_prs() end, desc = "GitHub PRs" },
    },
  },

  {
    "rachartier/tiny-code-action.nvim",
    dependencies = {
      { "nvim-lua/plenary.nvim" },
      { "folke/snacks.nvim" },
    },
    event = "LspAttach",
    opts = {
      picker = "snacks",
    },
    keys = {
      { "<localleader>ga", function() require("tiny-code-action").code_action() end, mode = { "n", "v" }, desc = "Code Action" },
    },
  },

  -- Languages

  'lucidstack/hex.vim',
  'tjdevries/nlua.nvim',

  {
    'MeanderingProgrammer/render-markdown.nvim',
    dependencies = { 'nvim-treesitter/nvim-treesitter', 'nvim-tree/nvim-web-devicons' },
    ---@module 'render-markdown'
    ---@type render.md.UserConfig
    opts = {},
  },

  -- AI

  'github/copilot.vim',

  {
    "coder/claudecode.nvim",
    config = true,
    keys = {
      { "<leader>a", nil, desc = "AI/Claude Code" },
      { "<leader>ac", "<cmd>ClaudeCode<cr>", desc = "Toggle Claude" },
      { "<leader>af", "<cmd>ClaudeCodeFocus<cr>", desc = "Focus Claude" },
      { "<leader>ar", "<cmd>ClaudeCode --resume<cr>", desc = "Resume Claude" },
      { "<leader>aC", "<cmd>ClaudeCode --continue<cr>", desc = "Continue Claude" },
      { "<leader>am", "<cmd>ClaudeCodeSelectModel<cr>", desc = "Select Claude model" },
      { "<leader>ab", "<cmd>ClaudeCodeAdd %<cr>", desc = "Add current buffer" },
      { "<leader>as", "<cmd>ClaudeCodeSend<cr>", mode = "v", desc = "Send to Claude" },
      {
        "<leader>as",
        "<cmd>ClaudeCodeTreeAdd<cr>",
        desc = "Add file",
        ft = { "NvimTree", "neo-tree", "oil", "minifiles", "netrw" },
      },
      -- Diff management
      { "<leader>aA", "<cmd>ClaudeCodeDiffAccept<cr>", desc = "Accept diff" },
      { "<leader>aD", "<cmd>ClaudeCodeDiffDeny<cr>", desc = "Deny diff" },
    },
    opts = {
      diff_opts = {
        auto_close_on_accept = true,
        vertical_split = false,
      },
      terminal = {
        snacks_win_opts = {
          keys = {
            claude_quit = {
              "<C-q>",
              function(self) self:hide() end,
              mode = "t",
              desc = "Hide Claude terminal"
            },
            claude_zoom = {
              "<C-w>z",
              function() require('plugins.ai').zoom() end,
              mode = { "t", "n", "i" },
              desc = "Toggle zoom"
            },
          },
        },
      },
    },
  },

  {
  'johnseth97/codex.nvim',
    lazy = true,
    cmd = { 'Codex', 'CodexToggle' },
    keys = {
      {
        '<leader>cc',
        function() require('plugins.codex').toggle() end,
        desc = 'Toggle Codex',
        mode = { 'n', 't' }
      },
      {
        '<leader>cs',
        function() require('plugins.codex').send() end,
        desc = 'Send to Codex',
        mode = 'v'
      },
      {
        '<C-w>z',
        function() require('plugins.ai').zoom() end,
        desc = 'Toggle zoom',
        mode = 't'
      },
    },
    opts = {
      keymaps = {
        toggle = nil,
        quit = '<C-q>',
      },
      model       = 'gpt-5.2-codex',
      border      = 'rounded',
      width       = 0.3,
      height      = 0.3,
      autoinstall = false,
      panel       = true,
      use_buffer  = false,
    },
  },

  'neovim/nvim-lspconfig',

  'hrsh7th/nvim-cmp',
  'hrsh7th/cmp-nvim-lsp',
  'hrsh7th/cmp-buffer',
  'hrsh7th/cmp-path',
  'quangnguyen30192/cmp-nvim-ultisnips',

  {
    "rachartier/tiny-inline-diagnostic.nvim",
    event = "LspAttach",
    priority = 1000,
    config = function()
        require("tiny-inline-diagnostic").setup({
            options = {
                add_messages = {
                    display_count = true,
                },
                multilines = {
                    enabled = true,
                },
                show_source = {
                    enabled = false,
                },
                enable_on_insert = false,
            },
          })

       -- Disable Neovim's default virtual text diagnostics
        vim.diagnostic.config({ virtual_text = false, signs = false })
    end,
  },


  { 'nvim-treesitter/nvim-treesitter', build = ':TSUpdate' },

  'williamboman/mason.nvim',
  'williamboman/mason-lspconfig.nvim',
  'creativenull/efmls-configs-nvim',
  'mfussenegger/nvim-dap',
  'jay-babu/mason-nvim-dap.nvim',
  { "folke/neodev.nvim", opts = {} }, -- required for nvim-dap-ui
  { "nvim-neotest/nvim-nio" }, -- required for nvim-dap-ui
  'rcarriga/nvim-dap-ui',
  'theHamsta/nvim-dap-virtual-text',
  {
    "folke/which-key.nvim",
    event = "VeryLazy",
    init = function()
      vim.o.timeout = true
      vim.o.timeoutlen = 300
    end,
    opts = {}
  },

  -----------------------------------------------------------------
  -- Colours
  -----------------------------------------------------------------

  'sainnhe/gruvbox-material',
  'sainnhe/everforest',
  { 'dracula/vim', name = 'dracula' },
  { "catppuccin/nvim", name = "catppuccin", priority = 1000 },
  'lunarvim/horizon.nvim'
})
-- LuaFormatter on
