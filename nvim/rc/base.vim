set encoding=utf-8
scriptencoding utf-8

" TODO: try this later
" Behavior when switching buffers
set switchbuf=useopen

" No backups after overwritting
set nobackup

" Horizontal spilt bottom
set splitbelow

" Vertical split right
set splitright

" History size
set history=10000

" Highlight search matches after the search has been done
" set hlsearch

" Search ignores case unless the pattern is all uppercase
set ignorecase smartcase

" Tab is 2 columns
set tabstop=2
set softtabstop=2
set shiftwidth=2 " for >> and <<

" Convert tabs to spaces
set expandtab
set smarttab

set autoindent

" Backspace to the start of the line
set backspace=indent,eol,start

" Briefly jump to matching parenthesis
set showmatch

" Wrapping lines
set wrap
set linebreak

" Always show relative numbers
set relativenumber

" Using mouse and scroll
" (note: this is already the default)
" set mouse=a

" Automatically read file if it was changed outside of vim
set autoread

" Highlight whitespaces
set list
set listchars=""
set listchars+=tab:>\
set listchars+=trail:•
set listchars+=extends:#
set listchars+=nbsp:•
