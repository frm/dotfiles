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

