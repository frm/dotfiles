call plug#begin('~/.local/share/nvim/plugged')

" IDE-style features
Plug 'scrooloose/nerdtree', { 'on': ['NERDTreeToggle', 'NERDTreeFind'] }
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/fzf.vim'
Plug 'christoomey/vim-tmux-navigator'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-rhubarb'
Plug 'airblade/vim-gitgutter'
Plug 'tpope/vim-abolish'
Plug 'chrisbra/Colorizer'

" Scheme
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'kristijanhusak/vim-hybrid-material'
Plug 'w0ng/vim-hybrid'

" Formatting
Plug 'tpope/vim-surround'
Plug 'jiangmiao/auto-pairs'
Plug 'tpope/vim-endwise'
Plug 'kana/vim-textobj-user'

" Testing
Plug 'kassio/neoterm'
Plug 'janko-m/vim-test'

" Languages & Completions
Plug 'Shougo/deoplete.nvim', { 'do': ':UpdateRemotePlugins' }
Plug 'w0rp/ale'

Plug 'elixir-editors/vim-elixir', { 'for': 'elixir' }
Plug 'slashmili/alchemist.vim', { 'for': 'elixir' }
Plug 'c-brenn/phoenix.vim', { 'for': 'elixir' }
Plug 'andyl/vim-textobj-elixir', { 'for': 'elixir' }

Plug 'vim-ruby/vim-ruby', { 'for': 'ruby' }
Plug 'tpope/vim-rails', { 'for': 'ruby' }
Plug 'nelstrom/vim-textobj-rubyblock', { 'for': 'ruby' }
Plug 'slim-template/vim-slim', { 'for': 'slim' }

Plug 'elzr/vim-json', { 'for': 'json' }

call plug#end()

"""""""""""""""""""""
"     NERDTree      "
"""""""""""""""""""""
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
autocmd FileType nerdtree setlocal nolist

"""""""""""""""""""""
"       fzf         "
"""""""""""""""""""""
nmap <C-p> :Files<CR>
nmap <C-f> :Ag<CR>

" Use ripgrep over grep
if executable('rg')
  set grepprg="rg --color never --no-heading"
endif

command! -bang -nargs=* Rg
  \ call fzf#vim#grep(
  \   'rg --column --line-number --no-heading --color=always '.shellescape(<q-args>), 1,
  \   <bang>0 ? fzf#vim#with_preview('up:60%')
  \           : fzf#vim#with_preview('right:50%:hidden', '?'),
  \   <bang>0)

"""""""""""""""""""""
"     Deoplete      "
"""""""""""""""""""""
let g:deoplete#enable_at_startup = 1

"""""""""""""""""""""
"    AutoPairs      "
"""""""""""""""""""""
let g:AutoPairsMultilineClose = 0
let g:AutoPairsOnlyWhitespace = 1

"""""""""""""""""""""
"      NeoTerm      "
"""""""""""""""""""""
let g:neoterm_shell = 'zsh'
let g:neoterm_position='vertical'
let g:neoterm_size=50
nnoremap <silent> <localleader>l :call neoterm#clear()<cr>
nnoremap <silent> <localleader>q :call neoterm#close()<cr>

"""""""""""""""""""""
"      NeoTest      "
"""""""""""""""""""""
let test#strategy = "neoterm"
nnoremap <silent> <localleader>a :TestSuite<cr>
nnoremap <silent> <localleader>c :TestNearest<cr>
nnoremap <silent> <localleader>f :TestFile<cr>
nnoremap <silent> <localleader>s :TestLast<cr>

"""""""""""""""""""""
"        Ale        "
"""""""""""""""""""""
let g:ale_linters = {
\   'javascript': ['eslint'],
\   'typescript': ['tslint'],
\   'jsx': ['eslint'],
\   'css': ['stylelint'],
\   'scss': ['scsslint'],
\   'elixir': ['credo'],
\   'ruby': ['rubocop'],
\   'html': [],
\   'markdown': [],
\}

"""""""""""""""""""""
"     Colorizer     "
"""""""""""""""""""""
let g:colorizer_auto_filetype='css,html,scss,slim,sass,less'
