filetype off " required by Vundle

" set the runtime path to include Vundle and initialize
set rtp+=~/.config/nvim/bundle/Vundle.vim
call vundle#rc('~/.config/nvim/bundle')

" let Vundle manage Vundle, required
Plugin 'VundleVim/Vundle.vim'

" Vim looks
Plugin 'bling/vim-airline'
Plugin 'airblade/vim-gitgutter'

" Movement
Plugin 'scrooloose/nerdtree'
Plugin 'easymotion/vim-easymotion'
Plugin 'ctrlpvim/ctrlp.vim'

" Language
Plugin 'elixir-lang/vim-elixir'

" Language Helpers
Plugin 'tpope/vim-endwise'
Plugin 'jiangmiao/auto-pairs'

call vundle#end()            " required
filetype plugin indent on    " required

" ------------- NERDTree
nnoremap <C-n> :NERDTreeToggle<CR>
nnoremap <C-j> :NERDTreeFind<CR>

" Using custom arrows with NERDTree
let g:NERDTreeDirArrows=1

" Close NERDTree if it's the only window open
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif

" ------------- Vim Airline
let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#branch#enabled=1

" Use Powerline fonts
let g:airline_powerline_fonts = 1

" Preventing airline from hiding with NerdTreeToggle
set laststatus=2

" ------------- Ctrl-P
" Fuzzy search by filename
" let g:ctrlp_by_filename = 1

" Starting Ctrl-P in the git directory if no specific one is provided
let g:ctrlp_working_path_mode = 'ra'

" ------------- Goyo
nnoremap <C-g> :Goyo<Cr>

" ------------- EasyMotion

" s for one character search
" S for double character search
nmap s <Plug>(easymotion-s)
nmap S <Plug>(easymotion-s2)

" replacing vim default search
nmap / <Plug>(easymotion-sn)
omap / <Plug>(easymotion-tn)
nmap n <Plug>(easymotion-next)
nmap N <Plug>(easymotion-prev)
