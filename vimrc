filetype off                  " required

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/vundle/
call vundle#rc()
" alternatively, pass a path where Vundle should install bundles
"let path = '~/some/path/here'
"call vundle#rc(path)

" let Vundle manage Vundle, required
Bundle 'gmarik/vundle'

" The following are examples of different formats supported.
" Keep bundle commands between here and filetype plugin indent on.
" scripts on GitHub repos
Bundle 'tpope/vim-fugitive'
Bundle 'Lokaltog/vim-easymotion'
Bundle 'tpope/vim-rails.git'
" The sparkup vim script is in a subdirectory of this repo called vim.
" Pass the path to set the runtimepath properly.
Bundle 'rstacruz/sparkup', {'rtp': 'vim/'}
" scripts from http://vim-scripts.org/vim/scripts.html
Bundle 'L9'
Bundle 'FuzzyFinder'
" scripts not on GitHub
Bundle 'git://git.wincent.com/command-t.git'
" git repos on your local machine (i.e. when working on your own plugin)
"Bundle 'file:///home/gmarik/path/to/plugin'
" ...

" CtrlP
Bundle 'kien/ctrlp.vim.git'
" Syntastic
Bundle 'scrooloose/syntastic.git'
" Conque Shell
Bundle 'oplatek/Conque-Shell.git'
" NERDTree
Bundle 'scrooloose/nerdtree.git'
" EasyMotion
Bundle 'Lokaltog/vim-easymotion.git'

filetype plugin indent on     " required
" To ignore plugin indent changes, instead use:
"filetype plugin on
"
" Brief help
" :BundleList          - list configured bundles
" :BundleInstall(!)    - install (update) bundles
" :BundleSearch(!) foo - search (or refresh cache first) for foo
" :BundleClean(!)      - confirm (or auto-approve) removal of unused bundles
"
" see :h vundle for more details or wiki for FAQ
" NOTE: comments after Bundle commands are not allowed.
" Put your stuff after this line

" Set color scheme -- check available schemes in /usr/share/vim/vim73/colors
color slate

" Choose the background color
set background=dark

" Preventing the arrow keys compatibility problem
set nocompatible

" Show line numbers
set number

" Enable clicking with the mouse to move around in the editor
set mouse=a

" Show cursor
set ruler

" Enable autoindentation in lines after opening a bracket
set smartindent
set autoindent

" Aparently, improves tabbing -- Allow smart tab option
set smarttab

" Telling Vim how much spaces a tab is
set tabstop=4
set shiftwidth=4

" Using line wrapping
set wrap
set linebreak

" Make backspace function like a regular program
set backspace=2

" Enable syntax highlight
syntax on

" Make the navigation keys work like any other program
imap <silent> <Down> <C-o>gj
imap <silent> <Up> <C-o>gk
nmap <silent> <Down> gj
nmap <silent> <Up> gk

" Allow to hide code sections
set foldmethod=manual

" Highlight search
set hlsearch

" Ask for confirmation for unsaved changes
set confirm

" Better command-line completion
set wildmenu

" AutoComplete Parentheses
inoremap ( ()<Esc>:call BC_AddChar(")")<CR>i
inoremap { {<CR>}<Esc>:call BC_AddChar("}")<CR><Esc>kA<CR>
inoremap [ []<Esc>:call BC_AddChar("]")<CR>i
inoremap " ""<Esc>:call BC_AddChar("\"")<CR>i
" jump out of parenthesis
inoremap <C-j> <Esc>:call search(BC_GetChar(), "W")<CR>a

function! BC_AddChar(schar)
 if exists("b:robstack")
 let b:robstack = b:robstack . a:schar
 else
 let b:robstack = a:schar
 endif
endfunction

function! BC_GetChar()
 let l:char = b:robstack[strlen(b:robstack)-1]
 let b:robstack = strpart(b:robstack, 0, strlen(b:robstack)-1)
 return l:char
endfunction


" ### CtrlP Settings
let g:ctrlp_map = '<c-p>'
let g:ctrlp_cmd = 'CtrlP'
let g:ctrlp_working_path_mode = 'ra'

" ### NERDTree Settings
"
" Run NERDTree on vim startup
autocmd vimenter * NERDTree
" Run NERDTree on vim startup with no files specified
autocmd vimenter * if !argc() | NERDTree | endif
" Ctrl+N to toggle NERDTree
map <C-n> :NERDTreeToggle<CR>
" Close NERDTree if only window left open
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif
" Autofocus on vim instead of NERDTree
autocmd VimEnter * wincmd l
autocmd BufNew   * wincmd l

" ### Copy-Paste Settings
vmap <silent> ,y y:new<CR>:call setline(1,getregtype())<CR>o<Esc>P:wq! ~/.reg.txt<CR>
nmap <silent> ,y :new<CR>:call setline(1,getregtype())<CR>o<Esc>P:wq! ~/.reg.txt<CR>
map <silent> ,p :sview ~/.reg.txt<CR>"zdddG:q!<CR>:call setreg('"', @", @z)<CR>p
map <silent> ,P :sview ~/.reg.txt<CR>"zdddG:q!<CR>:call setreg('"', @", @z)<CR>P
