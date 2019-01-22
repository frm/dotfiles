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
Plug 'Olical/vim-enmasse'
Plug 'SirVer/ultisnips'
Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-commentary'

" Scheme
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'kristijanhusak/vim-hybrid-material'
Plug 'w0ng/vim-hybrid'
Plug 'chriskempson/base16-vim'
Plug 'mhinz/vim-startify'
Plug 'dracula/vim', { 'as': 'dracula' }

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

" Elixir
Plug 'elixir-editors/vim-elixir', { 'for': 'elixir' }
Plug 'slashmili/alchemist.vim', { 'for': 'elixir' }
Plug 'c-brenn/phoenix.vim', { 'for': 'elixir' }
Plug 'andyl/vim-textobj-elixir', { 'for': 'elixir' }

" Ruby
Plug 'vim-ruby/vim-ruby', { 'for': 'ruby' }
Plug 'tpope/vim-rails', { 'for': 'ruby' }
Plug 'tpope/vim-bundler', { 'for': 'ruby' }
Plug 'nelstrom/vim-textobj-rubyblock', { 'for': 'ruby' }
Plug 'slim-template/vim-slim', { 'for': 'slim' }

" JavaScript
Plug 'prettier/vim-prettier', {
  \ 'do': 'yarn install',
  \ 'for': ['javascript', 'typescript', 'css', 'less', 'scss', 'json', 'graphql', 'markdown', 'vue']}

Plug 'elzr/vim-json', { 'for': 'json' }
Plug 'mxw/vim-jsx', { 'for': 'javascript.jsx' }

Plug 'Quramy/tsuquyomi', { 'for': 'typescript' }
Plug 'leafgarland/typescript-vim', { 'for': 'typescript' }
Plug 'Shougo/vimproc.vim', { 'for': 'typescript', 'do': 'make' }

" Other
Plug 'rhysd/vim-crystal'
Plug 'shime/vim-livedown', { 'for': 'markdown' }
Plug 'justinmk/vim-syntax-extra', { 'for': ['c', 'cpp', 'flex'] }
Plug 'junegunn/vader.vim', { 'for': 'vim' }
Plug 'kristijanhusak/vim-carbon-now-sh'

call plug#end()

"""""""""""""""""""""
"     NERDTree      "
"""""""""""""""""""""
nnoremap <C-n> :NERDTreeToggle<CR>
nnoremap <Leader>n :NERDTreeFind<CR>
let NERDTreeIgnore=['\.pyc', '\~$', '\.swo$', '\.swp$', '\.git', '\.hg', '\.svn', '\.bzr', '\.DS_Store']
let g:NERDTreeDirArrows=1
let g:NERDTreeMouseMode=2
let g:NERDTreeShowHidden=1
let g:NERDTreeWinPos = "right"

" Close NERDTree if it's the only window open
" Note to self: this seems to have been updated, but I'm leaving the previous
" version in comment in case there are conflicts with other settings
" autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTreeType") && b:NERDTreeType == "primary") | q | endif
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTree") && b:NERDTree.isTabTree()) | q | endif

" Don't show whitespaces on NERDTree enter
autocmd FileType nerdtree setlocal nolist

"""""""""""""""""""""
"       fzf         "
"""""""""""""""""""""
nmap <C-p> :Files<CR>
nmap <C-g><C-p> :GFiles<CR>
nmap <C-f> :Ag<Space>
nmap <leader>l :Lines<CR>
nmap <leader>b :BLines<CR>
nmap <leader>h :History<CR>

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
"     fugitive      "
"""""""""""""""""""""
set diffopt+=vertical
nmap <localleader>gb :Gblame<CR>
nmap <localleader>gs :Gstatus<CR>
nmap <localleader>gd :Gdiff<CR>
nmap <localleader>gh :Gbrowse<CR>
nmap <localleader>gc :Gcommit<CR>

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
let g:localvimrc_whitelist = $HOME . '/Developer/.*'

" don't run lvimrcs in sandbox for work-related projects
if expand('%:p:h') =~ g:localvimrc_whitelist . '\(subvisual\|utrust\)'
  let g:localvimrc_sandbox = 0
endif

"""""""""""""""""""""
"      NeoTerm      "
"""""""""""""""""""""
let g:neoterm_shell = 'zsh'
let g:neoterm_default_mod='vertical'
let g:neoterm_size=70
let g:neoterm_fixedsize=70
let g:neoterm_autoscroll=1
nnoremap <silent> <localleader>l :Tclear<cr>
nnoremap <silent> <localleader>q :Ttoggle<cr>
tnoremap <silent> <C-E> <C-\><C-n>

function! HorizontalTerm()
  let g:neoterm_default_mod='horizontal'
  let g:neoterm_size=15
  let g:neoterm_fixed_size=15
  let g:neoterm_autojump=1
  let g:neoterm_autoinsert=1

  call neoterm#toggle()

  let g:neoterm_default_mod='vertical'
  let g:neoterm_size=70
  let g:neoterm_fixedsize=70
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
let g:ale_completion_enabled = 1

let g:ale_fixers = {
\   'ruby':  [],
\   'elixir':  [],
\   'typescript': ['prettier'],
\   'javascript': ['prettier'],
\   'jsx': [],
\   'css': [],
\   'scss': [],
\   'go': ['gofmt'],
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
\   'go': ['gofmt'],
\}

function! AddLinterIfFileExists(lang, linter, file, lint, fix)
  let l:current = g:ale_linters[a:lang]

  if filereadable(a:file) && index(l:current, a:linter) == -1
    if a:lint
      let g:ale_linters[a:lang] = g:ale_linters[a:lang] + [a:linter]
    endif
    if a:fix
      let g:ale_fixers[a:lang] = g:ale_fixers[a:lang] + [a:linter]
    end
  endif
endfunction

call AddLinterIfFileExists('javascript', 'eslint', '.eslintrc.json', 1, 1)
call AddLinterIfFileExists('javascript', 'eslint', '.eslintrc', 1, 1)
call AddLinterIfFileExists('javascript', 'standard', 'node_modules/.bin/standard', 1, 1)
call AddLinterIfFileExists('css', 'stylelint', '.stylelintrc', 1, 1)
call AddLinterIfFileExists('scss', 'stylelint', '.stylelintrc', 1, 1)
call AddLinterIfFileExists('css', 'stylelint', '.stylelintrc.json', 1, 1)
call AddLinterIfFileExists('scss', 'stylelint', '.stylelintrc.json', 1, 1)
call AddLinterIfFileExists('scss', 'scss-lint', '.scss-lint.yml', 1, 1)
call AddLinterIfFileExists('ruby', 'rubocop', '.rubocop.yml', 1, 1)
call AddLinterIfFileExists('elixir', 'credo', 'config/.credo.exs', 1, 0)
call AddLinterIfFileExists('elixir', 'credo', '.credo.exs', 1, 0)

function! LoadNearestFormatter()
  let l:formatters = []
  let l:directory = fnameescape(expand("%:p:h"))

  for l:fmt in findfile(".formatter.exs", l:directory . ";", -1)
    call insert(l:formatters, l:fmt)
  endfor

  call reverse(l:formatters)

  let g:ale_fixers['elixir'] = ['mix_format']

  if len(l:formatters) > 0
    let g:ale_elixir_mix_format_options = "--dot-formatter " . l:formatters[0]
  endif
endfunction

call LoadNearestFormatter()

"""""""""""""""""""""
"     Colorizer     "
"""""""""""""""""""""
let g:colorizer_auto_filetype='css,html,scss,slim,sass,less'

"""""""""""""""""""""
"    EasyMotion     "
"""""""""""""""""""""
" ff for character search
" fs for character search across buffers
nmap <localleader>ff <Plug>(easymotion-s)
nmap <localleader>fs <Plug>(easymotion-overwin-f)

"""""""""""""""""""""
"     LiveDown      "
"""""""""""""""""""""
" should markdown preview get shown automatically upon opening markdown buffer
let g:livedown_autorun = 0

" should the browser window pop-up upon previewing
let g:livedown_open = 1
let g:livedown_port = 7654
let g:livedown_browser = "chrome"


"""""""""""""""""""""
"     UltiSnips     "
"""""""""""""""""""""
let g:UltiSnipsExpandTrigger="<C-j>"
let g:UltiSnipsJumpForwardTrigger="<C-j>"
let g:UltiSnipsJumpBackwardTrigger="<C-k>"

"""""""""""""""""""""
"   Projectionist   "
"""""""""""""""""""""
map <leader>aa :A<CR>
map <leader>as :AS<CR>
map <leader>av :AV<CR>

"""""""""""""""""""""
"      Startify     "
"""""""""""""""""""""
 let g:startify_change_to_dir = 0

"""""""""""""""""""""
"   carbon.now.sh   "
"""""""""""""""""""""
vnoremap <F5> :CarbonNowSh<CR>
