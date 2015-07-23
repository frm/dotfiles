set nocompatible    " vim not vi
filetype off        " required for Vundle

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

" let Vundle manage Vundle, required
Plugin 'gmarik/Vundle.vim'

" Plugin 'rstacruz/sparkup', {'rtp': 'vim/'}

" http://vimawesome.com/plugin/surround-vim
" Plugin 'tpope/vim-surround'

" http://vimawesome.com/plugin/rails-vim
" Plugin 'tpope/vim-rails'

Plugin 'scrooloose/syntastic'
Plugin 'scrooloose/nerdtree'
Plugin 'ryanoasis/vim-devicons'
Plugin 'easymotion/vim-easymotion'
Plugin 'vim-ruby/vim-ruby'
Plugin 'tpope/vim-markdown'
Plugin 'Shougo/neocomplcache.vim'
Plugin 'kien/rainbow_parentheses.vim'
Plugin 'altercation/vim-colors-solarized'
Plugin 'justinmk/vim-syntax-extra'
Plugin 'bling/vim-airline'
Plugin 'airblade/vim-gitgutter'
Plugin 'tpope/vim-fugitive'
Plugin 'kien/ctrlp.vim'
Plugin 'rking/ag.vim'
Plugin 'chriskempson/base16-vim'
Plugin 'morhetz/gruvbox'

call vundle#end()            " required for Vundler
filetype plugin indent on    " required for Vundler

set encoding=utf-8
scriptencoding utf-8

syntax enable
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

" Arrow navigation
"imap <silent> <Down> <C-o>gj
"imap <silent> <Up> <C-o>gk
"nmap <silent> <Down> gj
"nmap <silent> <Up> gk
" Be a man!

" Cycling through buffers
exe "set <M-b>=\<Esc>b"
exe "set <M-n>=\<Esc>n"
nmap <M-b> :bprevious<CR>
nmap <M-n> :bnext<CR>

" Remove trailing whitespaces
autocmd BufRead,BufWrite * if ! &bin | silent! %s/\s\+$//ge | endif

" Associate *.prolog and *.gawk with prolog and awk filetypes
au BufRead,BufNewFile *.prolog setfiletype prolog
au BufRead,BufNewFile *.gawk setfiletype awk

set pastetoggle=<F2>

" Yanking between vim sessions
vmap <silent> ,y y:new<CR>:call setline(1,getregtype())<CR>o<Esc>P:wq! ~/.vim/.reg.txt<CR>
nmap <silent> ,y :new<CR>:call setline(1,getregtype())<CR>o<Esc>P:wq! ~/.vim/.reg.txt<CR>
map <silent> ,p :sview ~/.vim/.reg.txt<CR>"zdddG:q!<CR>:call setreg('"', @", @z)<CR>p
map <silent> ,P :sview ~/.vim/.reg.txt<CR>"zdddG:q!<CR>:call setreg('"', @", @z)<CR>P

" neocomplcache plugin
let g:neocomplcache_enable_at_startup = 1

" NERDTree
" Ctrl+n toggles NERDTree
map <C-n> :NERDTreeToggle<CR>

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

" Mapping ag.vim to Ctrl + A
nnoremap <C-a> :Ag<Space>

" Old EasyMotion keybinding
map <Leader> <Plug>(easymotion-prefix)
