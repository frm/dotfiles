function! DoRemote(arg)
  UpdateRemotePlugins
endfunction

call plug#begin('~/.config/nvim/plugged')
"
" Movement
Plug 'scrooloose/nerdtree'
Plug 'easymotion/vim-easymotion'
Plug 'christoomey/vim-tmux-navigator'

" Tooling
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-surround'
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/fzf.vim'
Plug 'junegunn/goyo.vim'

" Language
Plug 'slim-template/vim-slim'
Plug 'tpope/vim-rails'
Plug 'pangloss/vim-javascript'
Plug 'rust-lang/rust.vim'

" Elixir
Plug 'elixir-lang/vim-elixir'
Plug 'thinca/vim-ref'

" Language Helpers
Plug 'tpope/vim-endwise'
Plug 'eapache/auto-pairs'
Plug 'Shougo/deoplete.nvim', { 'do': function('DoRemote') }
Plug 'hdima/python-syntax'

" Vim looks
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'airblade/vim-gitgutter'
Plug 'ryanoasis/vim-devicons'

call plug#end()

" ------------- NERDTree
nnoremap <C-n> :NERDTreeToggle<CR>
nnoremap <Leader>n :NERDTreeFind<CR>

" Using custom arrows with NERDTree
let g:NERDTreeDirArrows=1

" Close NERDTree if it's the only window open
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif

" Don't show whitespaces on NERDTree enter
autocmd FileType nerdtree setlocal listchars=""

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

" ------------- fzf
nmap <C-p> :Files<CR>
nmap <C-f> :Ag<CR>
nmap <Leader>p :BTags <CR>
nmap <Leader>P :Tags <CR>

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
