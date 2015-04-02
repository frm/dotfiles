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
Plugin 'Lokaltog/vim-easymotion'
Plugin 'vim-ruby/vim-ruby'
Plugin 'tpope/vim-markdown'
Plugin 'Shougo/neocomplcache.vim'
Plugin 'kien/rainbow_parentheses.vim'
Plugin 'altercation/vim-colors-solarized'
Plugin 'justinmk/vim-syntax-extra'
Plugin 'chriskempson/base16-vim'
Plugin 'bling/vim-airline'
Plugin 'airblade/vim-gitgutter'
Plugin 'tpope/vim-fugitive'

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

set hlsearch
set incsearch

set tabstop=4
set shiftwidth=4
set backspace=2

set expandtab
set smarttab

set wrap
set linebreak

set autoindent

set relativenumber

" Arrow navigation
imap <silent> <Down> <C-o>gj
imap <silent> <Up> <C-o>gk
nmap <silent> <Down> gj
nmap <silent> <Up> gk

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

" NerdTree
autocmd vimenter * NERDTree     " autostart NerdTree
let g:NERDTreeDirArrows=1

" Autostart NerdTree when no files are present
autocmd StdinReadPre * let s:std_in=1
autocmd VimEnter * if argc() == 0 && !exists("s:std_in") | NERDTree | endif

" Close NerdTree if it's the only window open
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif

" Ctrl+n closes NerdTree
map <C-n> :NERDTreeToggle<CR>

" Set initial focus to vim instead of NerdTree
autocmd VimEnter * wincmd l
autocmd BufNew   * wincmd l

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

