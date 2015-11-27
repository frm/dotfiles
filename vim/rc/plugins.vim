filetype off        " required for Vundle

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

" let Vundle manage Vundle, required
Plugin 'VundleVim/Vundle.vim'

" Completion
Plugin 'Valloric/YouCompleteMe'

" General Syntax
Plugin 'scrooloose/syntastic'
Plugin 'justinmk/vim-syntax-extra'

" NERDTree
Plugin 'scrooloose/nerdtree'

Plugin 'bling/vim-airline'
Plugin 'tpope/vim-fugitive'
Plugin 'airblade/vim-gitgutter'

Plugin 'kien/rainbow_parentheses.vim'
Plugin 'easymotion/vim-easymotion'
Plugin 'kien/ctrlp.vim'

Plugin 'junegunn/goyo.vim'

" Language specific
Plugin 'othree/yajs.vim'
Plugin 'othree/javascript-libraries-syntax.vim'

Plugin 'elixir-lang/vim-elixir'
Plugin 'mattreduce/vim-mix'

Plugin 'vim-ruby/vim-ruby'
Plugin 'slim-template/vim-slim'

Plugin 'tpope/vim-rails'
Plugin 'tpope/vim-bundler'

Plugin 'tpope/vim-endwise'


call vundle#end()            " required for Vundler
filetype plugin indent on    " required for Vundler

" NERDTree
" leader+n toggles NERDTree
nnoremap <C-n> :NERDTreeToggle<CR>
nnoremap <C-m> :NERDTreeFind<CR>

" Using custom arrows with NERDTree
let g:NERDTreeDirArrows=1

" Close NERDTree if it's the only window open
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif

" Vim airline
let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#branch#enabled=1

" Using  Powerline
let g:airline_powerline_fonts = 1

" Preventing airline from hiding with NerdTreeToggle
set laststatus=2

" Fuzzy search by filename
let g:ctrlp_by_filename = 1

" Mapping Goyo
nnoremap <C-g> :Goyo<Cr>

" Easymotion
" s for one character search
" S for double character search
nmap s <Plug>(easymotion-s)
nmap S <Plug>(easymotion-s2)
" replacing vim default search
nmap / <Plug>(easymotion-sn)
omap / <Plug>(easymotion-tn)
nmap n <Plug>(easymotion-next)
nmap N <Plug>(easymotion-prev)

