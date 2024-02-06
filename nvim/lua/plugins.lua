-- LuaFormatter off

-- Make sure to set `mapleader` before lazy so your mappings are correct
vim.g.mapleader = " "

require("lazy").setup({
  -----------------------------------------------------------------
  -- IDE-style features
  -----------------------------------------------------------------

  -- GUI
  'christoomey/vim-tmux-navigator',
  -- use 'vimpostor/vim-tpipeline'
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
    tag = 'nightly'
  },

  { 'echasnovski/mini.nvim', version = false },

  {
    'gelguy/wilder.nvim',
    config = function()
      require('wilder').setup({ modes = { ':', '/', '?' } })
    end
  },

  {
    "startup-nvim/startup.nvim",
    requires = {"nvim-telescope/telescope.nvim", "nvim-lua/plenary.nvim"},
    config = function()
      require"startup".setup({ theme = "dashboard" })
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
    'anuvyklack/pretty-fold.nvim',
     config = function()
       require('pretty-fold').setup()
     end
  },

  {
    "nvim-treesitter/nvim-treesitter-textobjects",
    dependencies = "nvim-treesitter/nvim-treesitter",
  },
  'RRethy/nvim-treesitter-textsubjects',

  -- Functionality
  'tpope/vim-fugitive',
  'tpope/vim-rhubarb',
  'APZelos/blamer.nvim',
  'tpope/vim-projectionist',
  'kristijanhusak/any-jump.vim',
  'embear/vim-localvimrc',
  'tpope/vim-abolish',
  'tpope/vim-surround',
  'vim-test/vim-test',
  'voldikss/vim-floaterm',
  'wincent/terminus',
  -- use 'gabrielpoca/replacer.nvim'
  'stefandtw/quickfix-reflector.vim',
  { 'mg979/vim-visual-multi', branch = 'master' },
  { 'RRethy/vim-hexokinase', build = 'make hexokinase' },
  { 'ahmedkhalf/project.nvim', config = function() require('project_nvim').setup() end },
  { 'phaazon/hop.nvim', config = function() require('hop').setup() end },

  { 'junegunn/fzf', build = './install --all' },
  'junegunn/fzf.vim',

  {
    'stevearc/aerial.nvim',
    dependencies = {
       "nvim-treesitter/nvim-treesitter",
       "nvim-tree/nvim-web-devicons"
    },
  },

  { 'nvim-telescope/telescope-fzf-native.nvim', build = 'CFLAGS=-march=native make' },

  {
     'nvim-telescope/telescope.nvim',
     dependencies = {
       'nvim-lua/popup.nvim',
       'nvim-lua/plenary.nvim',
       'nvim-telescope/telescope-github.nvim',
       'nvim-telescope/telescope-ui-select.nvim',
       'nvim-telescope/telescope-fzf-native.nvim'
     },
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
  'tjdevries/nlua.nvim',

  -- AI Pair programming

  'github/copilot.vim',

  {
    'naps62/pair-gpt.nvim',
    build = 'cargo install --git https://github.com/naps62/pair-gpt.nvim',
  },

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

  -- LSP & Treesitter

  {
    'neovim/nvim-lspconfig',
    dependencies = { 'williamboman/nvim-lsp-installer' },
    config = function()
      require("nvim-lsp-installer").setup { automatic_installation = true }
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
  'mfussenegger/nvim-dap',
  'jay-babu/mason-nvim-dap.nvim',
  { "folke/neodev.nvim", opts = {} }, -- required for nvim-dap-ui
  'rcarriga/nvim-dap-ui',
  'theHamsta/nvim-dap-virtual-text',
  'nvimtools/none-ls.nvim',

  {
    "folke/which-key.nvim",
    event = "VeryLazy",
    init = function()
      vim.o.timeout = true
      vim.o.timeoutlen = 300
    end,
    opts = {}
  },

  { 'ms-jpq/coq_nvim', branch = 'coq' },
  { 'ms-jpq/coq.artifacts', branch = 'artifacts' },

  {
      'ms-jpq/coq.thirdparty',
      dependencies = { 'ms-jpq/coq_nvim', 'ms-jpq/coq.artifacts' },
      build = ':COQdeps',
      config = function()
          require("coq_3p") {
              { src = "nvimlua", short_name = "nLUA" },
              { src = "copilot", short_name = "COP", accept_key = "<c-f>" }
          }
      end
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
  { "catppuccin/nvim", name = "catppuccin", priority = 1000 }
})
-- LuaFormatter on
