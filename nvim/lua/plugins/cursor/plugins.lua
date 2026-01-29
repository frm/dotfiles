-- LuaFormatter off

-- Make sure to set `mapleader` before lazy so your mappings are correct
vim.g.mapleader = " "

require("lazy").setup({
  -----------------------------------------------------------------
  -- IDE-style features
  -----------------------------------------------------------------

  -- Behaviour
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
  'tpope/vim-abolish',
  'tpope/vim-surround',
  -- tpope is still the og but I can't use it with cursor since it doesn't
  -- handle interaction dialogs well. when an alternate doesn't exist, it hangs
  -- and I can't create it
  -- run my own version with a :A*C commands that automatically create the alternate
  -- remove this once cursor fixes interaction windows input with neovim or tpope
  -- accepts automatic creation somehow
  { dir = "~/Developer/frm/vim-projectionist" },

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
