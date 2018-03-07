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
Plug 'easymotion/vim-easymotion'
Plug 'embear/vim-localvimrc'

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
Plug 'AndrewRadev/splitjoin.vim'

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
Plug 'prettier/vim-prettier', {
  \ 'do': 'yarn install',
  \ 'for': ['javascript', 'typescript', 'css', 'less', 'scss', 'json', 'graphql', 'markdown', 'vue']}

Plug 'shime/vim-livedown', { 'for': 'markdown' }

Plug 'justinmk/vim-syntax-extra', { 'for': ['c', 'cpp', 'flex'] }

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
set runtimepath+=~/.local/shared/nvim/plugged/deoplete.nvim/
let g:deoplete#enable_at_startup = 1

"""""""""""""""""""""
"    AutoPairs      "
"""""""""""""""""""""
let g:AutoPairsMultilineClose = 0
let g:AutoPairsOnlyWhitespace = 1

"""""""""""""""""""""
"    LocalVimRc     "
"""""""""""""""""""""
let g:localvimrc_ask = 0

"""""""""""""""""""""
"      NeoTerm      "
"""""""""""""""""""""
let g:neoterm_shell = 'zsh'
let g:neoterm_position='vertical'
let g:neoterm_size=50
let g:neoterm_fixedsize=50
let g:neoterm_autoscroll=1
nnoremap <silent> <localleader>l :call neoterm#clear()<cr>
nnoremap <silent> <localleader>q :Ttoggle<cr>
tnoremap <silent> <C-E> <C-\><C-n>

function! HorizontalTerm()
  let g:neoterm_position='horizontal'
  let g:neoterm_size=15
  let g:neoterm_fixed_size=15
  let g:neoterm_autojump=1
  let g:neoterm_autoinsert=1

  call neoterm#toggle()

  let g:neoterm_position='vertical'
  let g:neoterm_size=50
  let g:neoterm_fixedsize=50
endfunction

nnoremap <silent> <localleader>T :call HorizontalTerm()<cr>

"""""""""""""""""""""
"      VimTest      "
"""""""""""""""""""""
let test#strategy = "neoterm"
nnoremap <silent> <localleader>a :TestSuite<cr>
nnoremap <silent> <localleader>c :TestNearest<cr>
nnoremap <silent> <localleader>f :TestFile<cr>
nnoremap <silent> <localleader><localleader> :TestLast<cr>

"""""""""""""""""""""
"        Ale        "
"""""""""""""""""""""
let g:airline#extensions#ale#enabled = 1
let g:ale_sign_error = '→'
let g:ale_sign_warning = '→'
let g:ale_fix_on_save = 1

let g:ale_fixers = {
\   'ruby':  [],
\   'elixir':  ['mix_format'],
\   'typescript': ['prettier'],
\   'javascript': ['prettier'],
\ }

let g:ale_linters = {
\   'javascript': ['prettier'],
\   'typescript': ['prettier'],
\   'jsx': [],
\   'css': [],
\   'scss': [],
\   'elixir': [],
\   'ruby': [],
\   'html': [],
\   'markdown': [],
\}

function! AddLinterIfFileExists(lang, linter, file, lint, fix)
  let l:current = g:ale_linters[a:lang]

  if filereadable(a:file) && index(l:current, a:linter) == -1
    if a:lint
      let g:ale_linters[a:lang] = g:ale_linters.javascript + [a:linter]
    endif
    if a:fix
      let g:ale_fixers[a:lang] = g:ale_linters.javascript + [a:linter]
    end
  endif
endfunction

call AddLinterIfFileExists('javascript', 'eslint', '.eslintrc.json', 1, 1)
call AddLinterIfFileExists('javascript', 'standard', 'node_modules/.bin/standard', 1, 1)
call AddLinterIfFileExists('css', 'stylelint', '.stylelintrc', 1, 0)
call AddLinterIfFileExists('scss', 'stylelint', '.stylelintrc', 1, 0)
call AddLinterIfFileExists('scss', 'scss-lint', '.scss-lint.yml', 1, 0)
call AddLinterIfFileExists('ruby', 'rubocop', '.rubocop.yml', 1, 1)
call AddLinterIfFileExists('elixir', 'credo', 'config/.credo.exs', 1, 0)
call AddLinterIfFileExists('elixir', 'credo', '.credo.exs', 1, 0)

"""""""""""""""""""""
"     Colorizer     "
"""""""""""""""""""""
let g:colorizer_auto_filetype='css,html,scss,slim,sass,less'

"""""""""""""""""""""
"    EasyMotion     "
"""""""""""""""""""""
" s for character search
" fs for character search across buffers
nmap <localleader>s <Plug>(easymotion-s)
nmap <localleader>fs <Plug>(easymotion-overwin-f)

"""""""""""""""""""""
"     LiveDown      "
"""""""""""""""""""""
" should markdown preview get shown automatically upon opening markdown buffer
let g:livedown_autorun = 0

" should the browser window pop-up upon previewing
let g:livedown_open = 1

" the port on which Livedown server will run
let g:livedown_port = 7654

" the browser to use
let g:livedown_browser = "firefox"
