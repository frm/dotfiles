-- LuaFormatter off

-- Make sure to set `mapleader` before lazy so your mappings are correct
vim.g.mapleader = " "

require("lazy").setup({
  -----------------------------------------------------------------
  -- IDE-style features
  -----------------------------------------------------------------

  -- GUI
  'christoomey/vim-tmux-navigator',

  {
    'nvim-lualine/lualine.nvim',
    dependencies = { 'nvim-tree/nvim-web-devicons' }
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

  { 'echasnovski/mini.nvim', version = false },

  {
    'gelguy/wilder.nvim',
    config = function()
      require('wilder').setup({ modes = { ':', '/', '?' } })
    end
  },

  -- Behaviour
  'AndrewRadev/splitjoin.vim',
  'derekprior/vim-trimmer',
  'farmergreg/vim-lastplace',
  'gabrielpoca/term_find.nvim',
  'SirVer/ultisnips',
  'RRethy/vim-illuminate',
  'RRethy/nvim-treesitter-endwise',

  {
    'kevinhwang91/nvim-ufo',
    dependencies = 'kevinhwang91/promise-async'
  },

  {
    "nvim-treesitter/nvim-treesitter-textobjects",
    dependencies = "nvim-treesitter/nvim-treesitter",
  },

  {
    "HiPhish/rainbow-delimiters.nvim",
    dependencies = "nvim-treesitter/nvim-treesitter",
  },

  -- Functionality
  'tpope/vim-fugitive',
  'tpope/vim-rhubarb',
  'APZelos/blamer.nvim',
  'tpope/vim-projectionist',
  'kristijanhusak/any-jump.vim',
  'tpope/vim-abolish',
  'tpope/vim-surround',
  'vim-test/vim-test',
  'voldikss/vim-floaterm',
  'wincent/terminus',
  'stefandtw/quickfix-reflector.vim',
  { 'mg979/vim-visual-multi', branch = 'master' },
  { 'RRethy/vim-hexokinase', build = 'make hexokinase' },
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

  { 'junegunn/fzf', build = './install --all' },
  'junegunn/fzf.vim',

  {
    'stevearc/aerial.nvim',
    dependencies = {
       "nvim-treesitter/nvim-treesitter",
       "nvim-tree/nvim-web-devicons"
    },
  },

  {
     'nvim-telescope/telescope.nvim',
     dependencies = {
       'nvim-lua/popup.nvim',
       'nvim-lua/plenary.nvim',
       'nvim-telescope/telescope-github.nvim',
       'nvim-telescope/telescope-ui-select.nvim',
       {
         'nvim-telescope/telescope-fzf-native.nvim',
         build = 'cmake -S. -Bbuild -DCMAKE_BUILD_TYPE=Release -DCMAKE_POLICY_VERSION_MINIMUM=3.5 && cmake --build build --config Release'
       },
     },
  },

  -- in theory we don't need this because of nvim-telescope +
  -- nvim-telescope-fzf-native but in practice, live_grep is really slow there
  -- so for that let's use fzf lua directly
  {
    "ibhagwan/fzf-lua",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    opts = {}
  },


  'JoosepAlviste/nvim-ts-context-commentstring',

  {
    'numToStr/Comment.nvim',
    lazy = false,
    config = function()
      require('Comment').setup()
    end
  },

  -----------------------------------------------------------------
  -- Language support
  -----------------------------------------------------------------

  -- Languages

  'sheerun/vim-polyglot',
  'elixir-editors/vim-elixir',

  -- TODO: See plugins/post_load#lsp-format
  {
    'elixir-lsp/elixir-ls',
    build =  'MIX_ENV=prod mix deps.get && MIX_ENV=prod mix compile && MIX_ENV=prod mix elixir_ls.release2 -o dist',
  },
  'lucidstack/hex.vim',
  'tjdevries/nlua.nvim',

  {
    'MeanderingProgrammer/render-markdown.nvim',
    dependencies = { 'nvim-treesitter/nvim-treesitter', 'nvim-tree/nvim-web-devicons' },
    ---@module 'render-markdown'
    ---@type render.md.UserConfig
    opts = {},
  },

  -- AI Pair programming

  'github/copilot.vim',
  {
    "jackMort/ChatGPT.nvim",
      event = "VeryLazy",
      config = function()
        require("chatgpt").setup()
      end,
      dependencies = {
        "MunifTanjim/nui.nvim",
        "nvim-lua/plenary.nvim",
        "folke/trouble.nvim",
        "nvim-telescope/telescope.nvim"
      }
  },

  {
    "coder/claudecode.nvim",
    dependencies = { "folke/snacks.nvim" },
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
  },


  -- LSP + COQ & Treesitter

  {
    'neovim/nvim-lspconfig',
    lazy = false,
    dependencies = {
      'williamboman/nvim-lsp-installer',
      { "ms-jpq/coq_nvim", branch = "coq" },
      { "ms-jpq/coq.artifacts", branch = "artifacts" },
      { 'ms-jpq/coq.thirdparty', branch = "3p" }
    },
    init = function()
      vim.g.coq_settings = {
        auto_start = 'shut-up',
        keymap = {
            jump_to_mark = '<C-g>',
        }
      }
    end,
    config = function()
      require("nvim-lsp-installer").setup { automatic_installation = true }

      require("coq_3p") {
        { src = "nvimlua", short_name = "nLUA" },
        { src = "repl", sh = "zsh" },
        { src = "bc", short_name = "MATH" },
        { src = "cow", trigger = "!cow" }
      }
    end
  },

  -- Currently trying out diagflow.nvim, might re-enable this in the future
  -- use {
  --     "https://git.sr.ht/~whynothugo/lsp_lines.nvim",
  --     config = function()
  --         vim.diagnostic.config({virtual_text = true})
  --         require("lsp_lines").setup()
  --     end
  -- }

  'dgagn/diagflow.nvim',

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
  'lukas-reineke/lsp-format.nvim',
  {
    "folke/trouble.nvim",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    cmd = "Trouble",
    keys = {
      {
        "<leader>xx",
        "<cmd>Trouble diagnostics toggle<cr>",
        desc = "Diagnostics (Trouble)",
      },
      {
        "<localleader>xx",
        "<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
        desc = "Buffer Diagnostics (Trouble)",
      },
      {
        "<localleader>xl",
        "<cmd>Trouble diagnostics toggle filter.buf=0 focus=false win.position=right<cr>",
        desc = "Buffer Diagnostics on the right (Trouble)",
      },
      {
        "<leader>xl",
        "<cmd>Trouble diagnostics toggle focus=false win.position=right<cr>",
        desc = "Diagnostics on the right (Trouble)",
      },
      {
        "<leader>xs",
        "<cmd>Trouble symbols toggle focus=false<cr>",
        desc = "Symbols (Trouble)",
      },
      {
        "<localleader>xs",
        "<cmd>Trouble symbols toggle filter.buf=0 focus=false<cr>",
        desc = "Buffer Symbols (Trouble)",
      },
    },
    opts={},
  },
  {
    "folke/which-key.nvim",
    event = "VeryLazy",
    init = function()
      vim.o.timeout = true
      vim.o.timeoutlen = 300
    end,
    opts = {}
  },

  -- TODO: enable when they add debugging support and code lens
  -- {
  --   'lexical-lsp/lexical',
  --   build = 'mix deps.get && INDEXING_ENABLED=true mix package && mv _build/dev/package/lexical ~/.bin'
  -- },

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
