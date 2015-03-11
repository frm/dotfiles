set nocompatible    " vim not vi
filetype off        " required for Vundle

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

" let Vundle manage Vundle, required
Plugin 'gmarik/Vundle.vim'

" Plugin 'tpope/vim-fugitive'
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

call vundle#end()            " required for Vundler
filetype plugin indent on    " required for Vundler

set encoding=utf-8
scriptencoding utf-8

syntax enable
let g:solarized_termcolors=256
set background=light
colorscheme solarized

set hlsearch    " Highlights search
set incsearch   " Incremental Search: show search matches as you type

" Enable mouse support in console
set mouse=a

" Set tabsize
set tabstop=4
set shiftwidth=4

" Set backspace
set backspace=2

" Use spaces instead of tabs
set expandtab
set smarttab

" Line wrapping
set wrap
set linebreak

set autoindent

set number

" Allow arrow navigation
imap <silent> <Down> <C-o>gj
imap <silent> <Up> <C-o>gk
nmap <silent> <Down> gj
nmap <silent> <Up> gk

" Remove any trailing whitespace that is in the file
autocmd BufRead,BufWrite * if ! &bin | silent! %s/\s\+$//ge | endif

" Associate *.prolog and *.gawk with prolog and awk filetypes
au BufRead,BufNewFile *.prolog setfiletype prolog
au BufRead,BufNewFile *.gawk setfiletype awk

" Use F2 to go to paste mode
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
