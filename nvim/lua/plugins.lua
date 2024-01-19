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
    dependencies = { 'kyazdani42/nvim-web-devicons' }
  },

  {'romgrk/barbar.nvim', dependencies = {'kyazdani42/nvim-web-devicons'}},

  {
    'nvim-tree/nvim-tree.lua',
    dependencies = {'nvim-tree/nvim-web-devicons'},
    tag = 'nightly'
  },

  -- Behaviour
  'AndrewRadev/splitjoin.vim',
  'derekprior/vim-trimmer',
  'farmergreg/vim-lastplace',
  'gabrielpoca/term_find.nvim',
  'SirVer/ultisnips',
  'RRethy/vim-illuminate',
  'RRethy/nvim-treesitter-endwise',

  -- Functionality
  'tpope/vim-fugitive',
  'tpope/vim-rhubarb',
  'tpope/vim-projectionist',
  'kristijanhusak/any-jump.vim',
  {'phaazon/hop.nvim', config = function() require('hop').setup() end},
  'embear/vim-localvimrc',
  'gcmt/wildfire.vim',
  'tpope/vim-abolish',
  'tpope/vim-commentary',
  'tpope/vim-surround',
  'vim-test/vim-test',
  'voldikss/vim-floaterm',
  'wincent/terminus',
  -- use 'gabrielpoca/replacer.nvim'
  'stefandtw/quickfix-reflector.vim',
  {'mg979/vim-visual-multi', branch = 'master'},
  {'RRethy/vim-hexokinase', make = 'make hexokinase'},

  {'junegunn/fzf', make = 'install --all'},
  'junegunn/fzf.vim',

  {'nvim-telescope/telescope-fzf-native.nvim', make = 'make' },

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

  -----------------------------------------------------------------
  -- Language support
  -----------------------------------------------------------------

  -- Languages

  'kana/vim-textobj-user',
  'sheerun/vim-polyglot',
  'elixir-editors/vim-elixir',
  'tjdevries/nlua.nvim',
  { 'andyl/vim-textobj-elixir', dependencies = {'kana/vim-textobj-user'} },

  -- AI Pair programming

  'github/copilot.vim',
  {'naps62/pair-gpt.nvim', make = 'cargo install --git https://github.com/naps62/pair-gpt.nvim' },

  -- LSP & Treesitter

  {
    'neovim/nvim-lspconfig',
    dependencies = {'williamboman/nvim-lsp-installer'},
    config = function()
        require("nvim-lsp-installer").setup {automatic_installation = true}
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

  {
    'dgagn/diagflow.nvim',
    config = function()
      require('diagflow').setup()
    end
  },


  {'nvim-treesitter/nvim-treesitter', make = ':TSUpdate'},

  {
    "williamboman/mason.nvim",
    "williamboman/mason-lspconfig.nvim",
  },

  'folke/which-key.nvim',

  { 'JoosepAlviste/nvim-ts-context-commentstring' },

  {'ms-jpq/coq_nvim', branch = 'coq'},
  {'ms-jpq/coq.artifacts', branch = 'artifacts'},

  {
      'ms-jpq/coq.thirdparty',
      dependencies = {'ms-jpq/coq_nvim'},
      config = function()
          require("coq_3p") {
              {src = "nvimlua", short_name = "nLUA"},
              {src = "copilot", short_name = "COP", accept_key = "<c-f>"}
          }
      end
  },

  -----------------------------------------------------------------
  -- Colours
  -----------------------------------------------------------------

  'sainnhe/gruvbox-material',
  'sainnhe/everforest'
})
