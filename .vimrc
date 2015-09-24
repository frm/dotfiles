set nocompatible    " vim not vi
filetype off        " required for Vundle

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

" let Vundle manage Vundle, required
Plugin 'gmarik/Vundle.vim'

" Completion
Plugin 'Shougo/neocomplete.vim'

" General Syntax
Plugin 'scrooloose/syntastic'
Plugin 'justinmk/vim-syntax-extra'

" NERDTree
Plugin 'scrooloose/nerdtree'
" Plugin 'ryanoasis/vim-devicons'

Plugin 'bling/vim-airline'
Plugin 'airblade/vim-gitgutter'

Plugin 'kien/rainbow_parentheses.vim'
Plugin 'easymotion/vim-easymotion'
Plugin 'kien/ctrlp.vim'

Plugin 'junegunn/goyo.vim'

" Language specific
Plugin 'vim-ruby/vim-ruby'
Plugin 'slim-template/vim-slim'
Plugin 'othree/yajs.vim'
Plugin 'othree/javascript-libraries-syntax.vim'
Plugin 'plasticboy/vim-markdown'
Plugin 'godlygeek/tabular' " dependency for vim-markdown

" Colors
Plugin 'chriskempson/base16-vim'
Plugin 'altercation/vim-colors-solarized'
Plugin 'morhetz/gruvbox'

call vundle#end()            " required for Vundler
filetype plugin indent on    " required for Vundler

set encoding=utf-8
scriptencoding utf-8

syntax enable

" Fix for background using tmux on Linux
if &term =~ '256color'
  " disable Background Color Erase (BCE) so that color schemes
  " render properly when inside 256-color tmux and GNU screen.
  " see also http://snk.tuxfamily.org/log/vim-256color-bce.html
  set t_ut=
endif

let g:solarized_termcolors=256
let base16colorspace=256
set background=dark
colorscheme base16-tomorrow
"colorscheme solarized

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

let mapleader="\<Space>"

" Cycling through buffers
"exe "set <M-b>=\<Esc>b"
"exe "set <M-n>=\<Esc>n"
"exe "set <M-w>=\<Esc>w"
"nmap <M-b> :bprevious<CR>
"nmap <M-n> :bnext<CR>
"nmap <M-w> :bw<CR>
nmap <Leader>b :bprevious<CR>
nmap <Leader>n :bnext<CR>
nmap <Leader>w :bw<CR>

" Remove highlight
nnoremap <leader>, :noh<cr>


" Remove trailing whitespaces
autocmd BufRead,BufWrite * if ! &bin | silent! %s/\s\+$//ge | endif

" Associate *.prolog and *.gawk with prolog and awk filetypes
au BufRead,BufNewFile *.prolog setfiletype prolog
au BufRead,BufNewFile *.gawk setfiletype awk

set pastetoggle=<F2>

" neocomplcache plugin
let g:neocomplcache_enable_at_startup = 1

" NERDTree
" Ctrl+n toggles NERDTree
map <C-n> :NERDTreeToggle<CR>
map <C-m> :NERDTreeFind<CR>

" Using custom arrows with NERDTree
let g:NERDTreeDirArrows=1

" Close NERDTree if it's the only window open
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif

" Autostart NERDTree
"autocmd vimenter * NERDTree

" Autostart NERDTree when no files are present
"autocmd StdinReadPre * let s:std_in=1
"autocmd VimEnter * if argc() == 0 && !exists("s:std_in") | NERDTree | endif

" Set initial focus to vim instead of NERDTree
"autocmd VimEnter * wincmd l
"autocmd BufNew   * wincmd l

" Vim airline
let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#branch#enabled=1

" Airline unicode font
"if !exists('g:airline_symbols')
"    let g:airline_symbols = {}
"endif

"let g:airline_left_sep = '»'
"let g:airline_left_sep = '▶'
"let g:airline_right_sep = '«'
"let g:airline_right_sep = '◀'
"let g:airline_symbols.linenr = '␊'
"let g:airline_symbols.linenr = '␤'
"let g:airline_symbols.linenr = '¶'
"let g:airline_symbols.branch = '⎇'
"let g:airline_symbols.paste = 'ρ'
"let g:airline_symbols.paste = 'Þ'
"let g:airline_symbols.paste = '∥'
"let g:airline_symbols.whitespace = 'Ξ'

" Using Monaco for Powerline
let g:airline_powerline_fonts = 1

" Preventing airline from hiding with NerdTreeToggle
set laststatus=2

" Fuzzy search by filename
let g:ctrlp_by_filename = 1


" Thoughtbot's ag on vim
if executable('ag')
  " Use ag over grep
  set grepprg=ag\ --nogroup\ --nocolor

  " Use ag in CtrlP for listing files. Lightning fast and respects .gitignore
  let g:ctrlp_user_command = 'ag %s -l --nocolor -g ""'

  " ag is fast enough that CtrlP doesn't need to cache
  let g:ctrlp_use_caching = 0

  " Ag command
  command -nargs=+ -complete=file -bar Ag silent! grep! <args>|cwindow|redraw!
endif

" Mapping ag.vim to Ctrl + G
nnoremap <C-f> :Ag<Space>

" Mapping Goyo
nnoremap <C-g> :Goyo<Cr>

" Old EasyMotion keybinding
map <Leader> <Plug>(easymotion-prefix)

" Activate Neocomplete
let g:neocomplete#enable_at_startup = 1
