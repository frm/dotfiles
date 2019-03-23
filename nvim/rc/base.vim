set wrap

set autoread
set nobackup
set noswapfile
set nowritebackup
set undodir=~/.config/nvim/undo
set undofile

set relativenumber
set number

set incsearch
set inccommand=nosplit

" 1 tab = 2 cols
set tabstop=2
set softtabstop=2
set shiftwidth=2

" Spaces for tabs
set expandtab
set smarttab

" Highlight whitespaces
set list
set listchars=""
set listchars+=tab:>-
set listchars+=trail:•
set listchars+=nbsp:•

" Fix horizontal and vertical splits
set splitbelow
set splitright

" Number of lines between cursor and scroll
set scrolloff=4

" Highlight current cursor column
set cursorcolumn
set cursorline

" Set sane J in normal mode
set formatoptions+=j

" Set python locations
let g:python_host_prog = "/usr/local/bin/python2.7"
let g:python3_host_prog = "/Users/frm/.asdf/shims/python3.6"
