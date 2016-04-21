call plug#begin('~/.config/nvim/plugged')
"
" Movement
Plug 'scrooloose/nerdtree'
Plug 'easymotion/vim-easymotion'
Plug 'ctrlpvim/ctrlp.vim'

" Tooling
Plug 'tpope/vim-fugitive'

" Language
Plug 'elixir-lang/vim-elixir'
Plug 'slim-template/vim-slim'
Plug 'tpope/vim-rails'

" Language Helpers
Plug 'tpope/vim-endwise'
Plug 'jiangmiao/auto-pairs'
Plug 'Shougo/deoplete.nvim'
Plug 'hdima/python-syntax'
Plug 'ternjs/tern_for_vim'

" Vim looks
Plug 'bling/vim-airline'
Plug 'airblade/vim-gitgutter'
Plug 'ryanoasis/vim-devicons'

call plug#end()

" ------------- NERDTree
nnoremap <C-n> :NERDTreeToggle<CR>
nnoremap <C-j> :NERDTreeFind<CR>

" Using custom arrows with NERDTree
let g:NERDTreeDirArrows=1

" Close NERDTree if it's the only window open
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif

" Don't show whitespaces on NERDTree enter
autocmd FileType nerdtree setlocal listchars=""
autocmd BufReadPre * call WhiteSpaceHighlight()

" ------------- Vim Airline
let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#branch#enabled=1

" Use Powerline fonts
let g:airline_powerline_fonts = 1

" Preventing airline from hiding with NerdTreeToggle
set laststatus=2

" ------------- DevIcons
let g:webdevicons_enable_unite = 0
let g:webdevicons_enable_vimfiler = 0
let g:webdevicons_enable_flagship_statusline = 0
let g:WebDevIconsUnicodeGlyphDoubleWidth = 0
let g:WebDevIconsNerdTreeAfterGlyphPadding = ''

" ------------- Ctrl-P
" Fuzzy search by filename
let g:ctrlp_by_filename = 1

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

" Running deoplete
let g:deoplete#enable_at_startup = 1
