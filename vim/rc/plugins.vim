
filetype off        " required for Vundle

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

" let Vundle manage Vundle, required
Plugin 'VundleVim/Vundle.vim'

" Completion
Plugin 'Shougo/neocomplete.vim'

" General Syntax
Plugin 'scrooloose/syntastic'
Plugin 'justinmk/vim-syntax-extra'

" NERDTree
Plugin 'scrooloose/nerdtree'

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

" Colors
Plugin 'chriskempson/base16-vim'
Plugin 'altercation/vim-colors-solarized'
Plugin 'morhetz/gruvbox'


call vundle#end()            " required for Vundler
filetype plugin indent on    " required for Vundler


" neocomplcache plugin
let g:neocomplcache_enable_at_startup = 1

" NERDTree
" leader+n toggles NERDTree
map <Leader>n :NERDTreeToggle<CR>
map <Leader>m :NERDTreeFind<CR>

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

" Old EasyMotion keybinding
map <Leader> <Plug>(easymotion-prefix)

" Activate Neocomplete
let g:neocomplete#enable_at_startup = 1