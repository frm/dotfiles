set encoding=utf-8
scriptencoding utf-8


" allow unsaved background buffers
set hidden

" Horizontal split to the bottom
set splitbelow

" Vertical split to the right
set splitright

" remember more commands
set history=10000

set hlsearch
set incsearch
" ignores case when searching except when pattern is all uppercase
set ignorecase smartcase

set tabstop=2
set softtabstop=2
set shiftwidth=2
set backspace=1

set expandtab
set smarttab
set autoindent

" briefly jump to matching parenthesis
set showmatch

set wrap
set linebreak

set relativenumber

set ttyfast

" Using mouse and scroll
set mouse=a

" highlights current line
set cursorline

set switchbuf=useopen

set shell=zsh

" change number of lines between cursor and scroll
set scrolloff=3

" no backups after overwritting
set nobackup

" backspacing to the start of line
set backspace=indent,eol,start

" setting menu for command line completion and command status
set showcmd
set wildmenu

" autoread file when changed outside vim
set autoread
