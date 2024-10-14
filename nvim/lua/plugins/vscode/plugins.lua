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
  {
     'smoka7/hop.nvim',
     version = "*",
     opts = {
       keys = 'etovxqpdygfblzhckisuran'
     }
  },

  -- Functionality
  'kristijanhusak/any-jump.vim',
  'tpope/vim-abolish',
  'tpope/vim-surround',

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
