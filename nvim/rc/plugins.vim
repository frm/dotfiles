function! DoRemote(arg)
  UpdateRemotePlugins
endfunction

let g:python_host_prog = '/Users/frm/.pyenv/versions/neovim2/bin/python'
let g:python3_host_prog = '/Users/frm/.pyenv/versions/neovim3/bin/python'

call plug#begin('~/.config/nvim/plugged')

" Ruby Toolkit
Plug 'slim-template/vim-slim'
Plug 'tpope/vim-rails'
Plug 'tpope/vim-bundler'
Plug 'kassio/neoterm'

" Elixir
Plug 'elixir-lang/vim-elixir', { 'for': 'elixir' }
Plug 'slashmili/alchemist.vim', { 'for': 'elixir' }
" Plug 'c-brenn/phoenix.vim', { 'for': 'elixir' }

" Scheme
Plug 'chriskempson/base16-vim'
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'

" All the rest
Plug 'pangloss/vim-javascript', { 'for': ['javascript', 'javascript.jsx'] }
Plug 'mxw/vim-jsx', { 'for': ['javascript', 'javascript.jsx'] }
Plug 'ternjs/tern_for_vim', { 'for': ['javascript', 'javasacript.jsx'] }
Plug 'rust-lang/rust.vim', { 'for': 'rust' }
Plug 'hdima/python-syntax', { 'for': 'python' }
Plug 'Valloric/MatchTagAlways', { 'for': ['html', 'xml'] }
" Plug 'thinca/vim-ref'
Plug 'janko-m/vim-test'
" Plug 'AndrewRadev/splitjoin.vim'
Plug 'tpope/vim-endwise'
Plug 'eapache/auto-pairs'
" Plug 'gcmt/wildfire.vim'
Plug 'junegunn/goyo.vim', { 'for': 'markdown' }
Plug 'Valloric/YouCompleteMe'
Plug 'neomake/neomake'
" Plug 'tpope/vim-sleuth'

Plug 'airblade/vim-gitgutter'
Plug 'tpope/vim-fugitive'
" Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-surround'
Plug 'easymotion/vim-easymotion'
Plug 'christoomey/vim-tmux-navigator'
" Plug 'wellle/tmux-complete.vim'
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/fzf.vim'
Plug 'scrooloose/nerdtree', { 'on':  ['NERDTreeToggle', 'NERDTreeFind'] }

call plug#end()

" NERDTree
nnoremap <C-n> :NERDTreeToggle<CR>
nnoremap <Leader>n :NERDTreeFind<CR>
let NERDTreeIgnore=['\.pyc', '\~$', '\.swo$', '\.swp$', '\.git', '\.hg', '\.svn', '\.bzr']
let g:NERDTreeDirArrows=1
let g:NERDTreeMouseMode=2
let g:NERDTreeShowHidden=1
let g:NERDTreeWinPos = "right"

" Close NERDTree if it's the only window open
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif

" Don't show whitespaces on NERDTree enter
autocmd FileType nerdtree setlocal listchars=""

" fzf
nmap <C-p> :Files<CR>
nmap <C-f> :Ag<CR>
nmap <leader>f :Tags <CR>
nmap <leader>b :BTags <CR>

" EasyMotion
" s for one character search
" S for double character search
nmap <localleader>s <Plug>(easymotion-s)
nmap <localleader>S <Plug>(easymotion-s2)

" replacing vim default search
nmap / <Plug>(easymotion-sn)
omap / <Plug>(easymotion-tn)
nmap n <Plug>(easymotion-next)
nmap N <Plug>(easymotion-prev)

" Deoplete
let g:deoplete#enable_at_startup = 1

" Neoterm
let g:neoterm_shell = 'zsh'
let g:neoterm_position='vertical'
let g:neoterm_size=50
nnoremap <silent> <localleader>l :call neoterm#clear()<cr>
nnoremap <silent> <localleader>q :call neoterm#close()<cr>

" Neotest
let test#strategy = "neoterm"
nnoremap <silent> <localleader>a :TestSuite<cr>
nnoremap <silent> <localleader>c :TestNearest<cr>
nnoremap <silent> <localleader>f :TestFile<cr>
nnoremap <silent> <localleader>, :TestLast<cr>

" Neomake
let g:neomake_ruby_enabled_makers = ['rubocop']
let g:neomake_css_enabled_makers = ['scss_lint']
let g:neomake_javascript_enabled_makers = ['eslint']
let g:neomake_elixir_enabled_makers = ['credo']

autocmd! BufWritePost * Neomake
map <localleader>n :Neomake<CR>

highlight NeomakeErrorSign ctermfg=1 ctermbg=8
highlight NeomakeWarningSign ctermfg=3 ctermbg=8

let g:neomake_error_sign={'text': '▶', 'texthl': 'NeomakeErrorSign'}
let g:neomake_warning_sign={'text': '▶', 'texthl': 'NeomakeErrorSign'}

let g:ycm_server_python_interpreter="/Users/frm/.pyenv/versions/neovim3/bin/python"
