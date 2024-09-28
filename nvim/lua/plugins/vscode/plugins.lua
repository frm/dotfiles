-- LuaFormatter off

-- Make sure to set `mapleader` before lazy so your mappings are correct
vim.g.mapleader = " "

require("lazy").setup({
  -----------------------------------------------------------------
  -- IDE-style features
  -----------------------------------------------------------------

  -- Behaviour
  'AndrewRadev/splitjoin.vim',
  'derekprior/vim-trimmer',
  'SirVer/ultisnips',
  { 'phaazon/hop.nvim', config = function() require('hop').setup() end },

  -- Functionality
  'kristijanhusak/any-jump.vim',
  'tpope/vim-abolish',
  'tpope/vim-surround',
  'vim-test/vim-test',
  { 'ahmedkhalf/project.nvim', config = function() require('project_nvim').setup() end },
  { 'phaazon/hop.nvim', config = function() require('hop').setup() end },

  'JoosepAlviste/nvim-ts-context-commentstring',

  {
    'numToStr/Comment.nvim',
    lazy = false,
    config = function()
      require('Comment').setup()
    end
  },

  -----------------------------------------------------------------
  -- Colours
  -----------------------------------------------------------------

  'sainnhe/gruvbox-material',
  'sainnhe/everforest',
  { 'dracula/vim', name = 'dracula' },
  { "catppuccin/nvim", name = "catppuccin", priority = 1000 }
})
-- LuaFormatter on
