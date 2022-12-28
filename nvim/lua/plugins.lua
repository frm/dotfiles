require('packer', {git = {clone_timeout = 120}}).startup(function()
  use 'wbthomason/packer.nvim'

  -----------------------------------------------------------------
  -- IDE-style features
  -----------------------------------------------------------------

  -- GUI
  use 'christoomey/vim-tmux-navigator'
  -- use 'vimpostor/vim-tpipeline'
  use {
    'nvim-lualine/lualine.nvim',
    requires = { 'kyazdani42/nvim-web-devicons' }
  }
  use {'romgrk/barbar.nvim', requires = {'kyazdani42/nvim-web-devicons'}}

  use {
    'nvim-tree/nvim-tree.lua',
    requires = {'nvim-tree/nvim-web-devicons'},
    tag = 'nightly'
  }

  -- Behaviour
  use 'AndrewRadev/splitjoin.vim'
  use 'derekprior/vim-trimmer'
  use 'farmergreg/vim-lastplace'
  use 'gabrielpoca/term_find.nvim'
  use 'SirVer/ultisnips'
  use 'RRethy/vim-illuminate'
  use 'RRethy/nvim-treesitter-endwise'

  -- Functionality
  use 'tpope/vim-fugitive'
  use 'tpope/vim-projectionist'
  use 'kristijanhusak/any-jump.vim'
  use {'phaazon/hop.nvim', config = function() require('hop').setup() end}
  use 'embear/vim-localvimrc'
  use 'gcmt/wildfire.vim'
  use 'tpope/vim-abolish'
  use 'tpope/vim-commentary'
  use 'tpope/vim-surround'
  use 'vim-test/vim-test'
  use 'voldikss/vim-floaterm'
  use 'wincent/terminus'
  use 'gabrielpoca/replacer.nvim'
  use {'mg979/vim-visual-multi', branch = 'master'}
  use 'RRethy/vim-hexokinase'

  use {'junegunn/fzf', run = './install --all'}
  use 'junegunn/fzf.vim'
  use {'nvim-telescope/telescope-fzf-native.nvim', run = 'make' }

  use {
      'nvim-telescope/telescope.nvim',
      requires = {
        'nvim-lua/popup.nvim',
        'nvim-lua/plenary.nvim',
        'nvim-telescope/telescope-github.nvim',
        'nvim-telescope/telescope-ui-select.nvim',
      },
  }

  -----------------------------------------------------------------
  -- Language support
  -----------------------------------------------------------------

  -- Languages

  use 'sheerun/vim-polyglot'
  use 'elixir-editors/vim-elixir'
  use 'tjdevries/nlua.nvim'
  use {'andyl/vim-textobj-elixir', requires = 'kana/vim-textobj-user'}

  -- AI Pair programming

  use 'github/copilot.vim'
  use {'naps62/pair-gpt.nvim', run = 'cargo install --git https://github.com/naps62/pair-gpt.nvim' }

  -- LSP & Treesitter

  use {
    'neovim/nvim-lspconfig',
    requires = {'williamboman/nvim-lsp-installer'},
    config = function()
        require("nvim-lsp-installer").setup {automatic_installation = true}
    end
  }
  use {
      "https://git.sr.ht/~whynothugo/lsp_lines.nvim",
      config = function()
          vim.diagnostic.config({virtual_text = false})
          require("lsp_lines").setup()
      end
  }


  use {'nvim-treesitter/nvim-treesitter', run = ':TSUpdate'}

  use {
    "williamboman/mason.nvim",
    "williamboman/mason-lspconfig.nvim",
  }

  use 'folke/which-key.nvim'

  use {
      'JoosepAlviste/nvim-ts-context-commentstring',
      config = function()
          require('nvim-treesitter.configs').setup {
              ensure_installed = {"elixir", "javascript", "typescript", "rust"},
              highlight = {enable = true},
              context_commentstring = {enable = true}
          }
      end
  }

  use {'ms-jpq/coq_nvim', branch = 'coq'}
  use {'ms-jpq/coq.artifacts', branch = 'artifacts'}

  use {
      'ms-jpq/coq.thirdparty',
      requires = {'ms-jpq/coq_nvim'},
      config = function()
          require("coq_3p") {
              {src = "nvimlua", short_name = "nLUA"},
              {src = "copilot", short_name = "COP", accept_key = "<c-f>"}
          }
      end
  }

  -----------------------------------------------------------------
  -- Colours
  -----------------------------------------------------------------

  use 'sainnhe/gruvbox-material'
  use 'sainnhe/everforest'
end)
