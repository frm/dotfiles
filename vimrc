" Vundle stuff
set nocompatible              " be iMproved, required
filetype off                  " required

set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

Plugin 'gmarik/Vundle.vim'
Plugin 'tpope/vim-fugitive'
Plugin 'L9'
Plugin 'rstacruz/sparkup', {'rtp': 'vim/'}
Plugin 'kien/ctrlp.vim.git'
Plugin 'scrooloose/syntastic.git'
Plugin 'oplatek/Conque-Shell.git'
Plugin 'scrooloose/nerdtree.git'
Plugin 'Lokaltog/vim-easymotion.git'
Plugin 'tpope/vim-rails.git'
Plugin 'bling/vim-airline'
Plugin 'bling/vim-bufferline'
Plugin 'airblade/vim-gitgutter'
Plugin 'majutsushi/tagbar'
Plugin 'Raimondi/delimitMate'

" All of your Plugins must be added before the following line
call vundle#end()            " required
filetype plugin indent on    " required



" My stuff
"
" Set color scheme -- check available schemes in /usr/share/vim/vim73/colors
color slate

" Choose the background color
set background=dark

" Preventing the arrow keys compatibility problem
set nocompatible

" Show line numbers
set number
set relativenumber

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

" Better tab control
nnoremap <C-t> :tabnew <CR>
nnoremap <S-tab> :tabprevious<CR>
nnoremap <C-tab> :tabnext<CR>

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

" ### VIM Airline Settings
let g:airline_enable_branch=1					" Enables git branch
let g:airline#extensions#tabline#enabled=1		
let g:airline#extensions#tabline#left_sep = ' '
let g:airline#extensions#tabline#left_alt_sep = '|'
let g:airline_branch_prefix="\uf020"			" Octicons

