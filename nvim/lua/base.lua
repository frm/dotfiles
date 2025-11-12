-- Disable netrw
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

vim.opt.wrap = true

vim.opt.autoread = true
vim.opt.backup = false
vim.opt.writebackup = false
vim.opt.swapfile = false
vim.opt.undodir = vim.fn.expand("$HOME/.config/nvim/undo")
vim.opt.undofile = true

vim.opt.relativenumber = true
vim.opt.number = true

vim.opt.incsearch = true
vim.opt.inccommand = "nosplit"

-- 1 tab = 2 cols
vim.opt.tabstop = 2
vim.opt.softtabstop = 2
vim.opt.shiftwidth = 2

-- Spaces for tabs
vim.opt.expandtab = true
vim.opt.smarttab = true

-- Highlight whitespaces
vim.opt.list = true
vim.opt.listchars = ""
vim.opt.listchars:append("tab:>-")
vim.opt.listchars:append("trail:•")
vim.opt.listchars:append("nbsp:•")

-- Fix horizontal and vertical splits
vim.opt.splitbelow = true
vim.opt.splitright = true

-- Number of lines between cursor and scroll
vim.opt.scrolloff = 4

-- Highlight current cursor column
vim.opt.cursorcolumn = true
vim.opt.cursorline = true

-- Set sane J in normal mode
vim.opt.formatoptions:append("j")

vim.opt.lazyredraw = true

-- Completion issues
vim.opt.shortmess:append("c")
vim.opt.signcolumn = "yes"
vim.opt.updatetime = 300

-- Allow manual folding
vim.opt.foldlevel = 99
vim.opt.foldmethod = "indent"

-- Set ctags file
vim.opt.tags = ".git/tags"

-- Set python locations
vim.g.python_host_prog = "/usr/local/bin/python2.7"
vim.g.python3_host_prog = os.getenv("HOME") .. "/.mise/shims/python3.12"
vim.g.loaded_perl_provider = 0
