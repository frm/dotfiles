call plug#begin('~/.local/share/nvim/plugged')

" IDE-style features
Plug 'scrooloose/nerdtree', { 'on': ['NERDTreeToggle', 'NERDTreeFind'] }
Plug 'Xuyuanp/nerdtree-git-plugin', { 'on': ['NERDTreeToggle', 'NERDTreeFind'] }
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/fzf.vim'
Plug 'antoinemadec/coc-fzf'
Plug 'christoomey/vim-tmux-navigator'
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-rhubarb'
Plug 'jreybert/vimagit'
Plug 'airblade/vim-gitgutter'
Plug 'tpope/vim-abolish'
Plug 'RRethy/vim-hexokinase', { 'do': 'make hexokinase' }
Plug 'easymotion/vim-easymotion'
Plug 'embear/vim-localvimrc'
Plug 'Olical/vim-enmasse'
Plug 'SirVer/ultisnips'
Plug 'tpope/vim-projectionist'
Plug 'tpope/vim-commentary'
Plug 'ryanoasis/vim-devicons'
Plug 'psliwka/vim-smoothie'

" Scheme
Plug 'kristijanhusak/vim-hybrid-material'
Plug 'w0ng/vim-hybrid'
Plug 'chriskempson/base16-vim'
Plug 'ayu-theme/ayu-vim'
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
Plug 'neoclide/coc.nvim', {'branch': 'release', 'do': { info -> InstallDeps(info) }}
Plug 'w0rp/ale'
Plug 'cespare/vim-toml', { 'for': 'toml' }

" Elixir
Plug 'elixir-editors/vim-elixir', { 'for': 'elixir' }
Plug 'c-brenn/phoenix.vim', { 'for': 'elixir' }
Plug 'andyl/vim-textobj-elixir', { 'for': 'elixir' }
Plug 'elixir-lsp/elixir-ls', { 'do': { -> g:elixirls.compile() } }

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
Plug 'sentient-lang/vim-sentient'
Plug 'itchyny/calendar.vim'
Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app & yarn install', 'for': ['markdown']  }
Plug 'junegunn/goyo.vim', { 'for': ['markdown'] }
Plug 'junegunn/limelight.vim', { 'for': ['markdown'] }
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

" disable cursorcolumn and cursorline in nerdtree
au FileType nerdtree set nocursorline
au FileType nerdtree set nocursorcolumn


"""""""""""""""""""""
"       fzf         "
"""""""""""""""""""""
nmap <C-p> :Files<CR>
nmap <C-f> :Rg<CR>
nmap <leader>h :History<CR>

" Make fzf match the vim colorscheme colors
let g:fzf_colors =
\ { 'fg':      ['fg', 'Normal'],
  \ 'bg':      ['bg', 'Normal'],
  \ 'hl':      ['fg', 'Comment'],
  \ 'fg+':     ['fg', 'CursorLine', 'CursorColumn', 'Normal'],
  \ 'bg+':     ['bg', 'CursorLine', 'CursorColumn'],
  \ 'hl+':     ['fg', 'Statement'],
  \ 'info':    ['fg', 'PreProc'],
  \ 'border':  ['fg', 'Ignore'],
  \ 'prompt':  ['fg', 'Conditional'],
  \ 'pointer': ['fg', 'Exception'],
  \ 'marker':  ['fg', 'Keyword'],
  \ 'spinner': ['fg', 'Label'],
  \ 'header':  ['fg', 'Comment'] }

" Enable this if you want fzf statusline
" make fzf status line use the vim theme colors
" function! s:fzf_statusline()
"   highlight fzf1 ctermfg=161 ctermbg=251
"   highlight fzf2 ctermfg=23 ctermbg=251
"   highlight fzf3 ctermfg=237 ctermbg=251
"   setlocal statusline=%#fzf1#\ >\ %#fzf2#fz%#fzf3#f
" endfunction

" autocmd! User FzfStatusLine call <SID>fzf_statusline()

 " hide status line inside fzf
autocmd! FileType fzf
autocmd  FileType fzf set laststatus=0 noshowmode noruler
  \| autocmd BufLeave <buffer> set laststatus=2 showmode ruler

" Use ripgrep over grep
if executable('rg')
  set grepprg="rg --vimgrep --color=always --no-heading"
endif

" Enable this if you want a preview window when searching for files/regexes
" command! -bang -nargs=* Rg
"   \ call fzf#vim#grep(
"   \   'rg --vimgrep --column --line-number --no-heading --color=always --smart-case '.shellescape(<q-args>), 1,
"   \   <bang>1 ? fzf#vim#with_preview('up:60%:wrap')
"   \           : fzf#vim#with_preview('right:50%:hidden', '?'),
"   \   <bang>1)

" command! -bang -nargs=? -complete=dir Files
"   \ call fzf#vim#files(<q-args>, fzf#vim#with_preview('up:60%:wrap'), <bang>1)

function! OpenFloatingWin()
  let height = &lines - 3
  let width = float2nr(&columns - (&columns * 2 / 10))
  let col = float2nr((&columns - width) / 2)

  "Set the position, size, etc. of the floating window.
  "The size configuration here may not be so flexible, and there's room for further improvement.
  let opts = {
        \ 'relative': 'editor',
        \ 'row': height,
        \ 'col': col,
        \ 'width': width,
        \ 'height': height
        \ }

  let buf = nvim_create_buf(v:false, v:true)
  let win = nvim_open_win(buf, v:true, opts)

  "Set Floating Window Highlighting
  call setwinvar(win, '&winhl', 'Normal:Pmenu')

  setlocal
        \ buftype=nofile
        \ nobuflisted
        \ bufhidden=hide
        \ nonumber
        \ norelativenumber
        \ signcolumn=no
        \ termguicolors
endfunction

"Let the input go up and the search list go down
let $FZF_DEFAULT_OPTS = $FZF_DEFAULT_OPTS . ' --layout=reverse'

"Open FZF and choose floating window
let g:fzf_layout = { 'window': 'call OpenFloatingWin()' }

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
if expand('%:p:h') =~ g:localvimrc_whitelist . '\(subvisual\|utrust\|frm\)'
  let g:localvimrc_sandbox = 0
endif

"""""""""""""""""""""
"      VimTest      "
"""""""""""""""""""""
let test#strategy = "neoterm"
nnoremap <silent> <localleader>a :TestSuite<cr>
nnoremap <silent> <localleader>c :TestNearest<cr>
nnoremap <silent> <localleader>f :TestFile<cr>
nnoremap <silent> <localleader><localleader> :TestLast<cr>

"""""""""""""""""""""
"      NeoTerm      "
"""""""""""""""""""""
let g:neoterm_shell = "zsh"
let g:neoterm_default_mod="vertical"
let g:neoterm_size=40
let g:neoterm_fixedsize=40
let g:neoterm_autoscroll=1
let g:neoterm_autojump=1
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
  let g:neoterm_size=40
  let g:neoterm_fixedsize=40
endfunction

nnoremap <silent> <localleader>T :call HorizontalTerm()<cr>


"""""""""""""""""""""
"     coc.nvim      "
"""""""""""""""""""""
"
" NOTE: these functions only install the dependencies
" actual config is available at plugins/coc.vim

function! InstallDeps(info)
  if a:info.status == 'installed' || a:info.force
    let extensions = [
          \ 'coc-css',
          \ 'coc-emmet',
          \ 'coc-emoji',
          \ 'coc-eslint',
          \ 'coc-highlight',
          \ 'coc-json',
          \ 'coc-markdownlint',
          \ 'coc-prettier',
          \ 'coc-python',
          \ 'coc-rls',
          \ 'coc-ruby',
          \ 'coc-snippets',
          \ 'coc-solargraph',
          \ 'coc-ultisnips',
          \ 'coc-yaml'
          \ ]
    call coc#util#install()
    call coc#util#install_extension(extensions)
  endif
endfunction

let g:elixirls = {
  \ 'path': printf('%s/%s', stdpath('data'), 'plugged/elixir-ls'),
  \ }

let g:elixirls.lsp = printf(
  \ '%s/%s',
  \ g:elixirls.path,
  \ 'release/language_server.sh')

function! g:elixirls.compile(...)
  let l:commands = join([
    \ 'mix local.hex --force',
    \ 'mix local.rebar --force',
    \ 'mix deps.get',
    \ 'mix compile',
    \ 'mix elixir_ls.release'
    \ ], '&&')

  echom '>>> Compiling elixirls'
  silent call system(l:commands)
  echom '>>> elixirls compiled'
endfunction

call coc#config('languageserver', {
  \ 'elixir': {
  \   'command': g:elixirls.lsp,
  \   'filetypes': ['elixir', 'eelixir']
  \ }
  \})

so ~/.config/nvim/rc/plugins/coc.vim

"""""""""""""""""""""
"        Ale        "
"""""""""""""""""""""
let g:ale_fix_on_save = 1
let g:ale_completion_enabled = 1
let g:ale_virtualtext_cursor = 1
let g:ale_sign_error = '→'
let g:ale_sign_warning = '→'
let g:ale_virtualtext_prefix = ''

let g:ale_fixers = {
\   'elixir': [],
\   'javascript': [],
\   'ruby':  [],
\   'go': ['gofmt'],
\ }

let g:ale_linters = {
\   'elixir': [],
\   'md': ['proselint', 'languagetool'],
\   'javascript': [],
\   'ruby': [],
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

  let g:ale_fixers['elixir'] = g:ale_fixers['elixir'] + ['mix_format']

  if len(l:formatters) > 0
    let g:ale_elixir_mix_format_options = "--dot-formatter " . l:formatters[0]
  endif
endfunction

call LoadNearestFormatter()

"""""""""""""""""""""
"    EasyMotion     "
"""""""""""""""""""""
" ff for character search
" fs for character search across buffers
nmap <localleader>ff <Plug>(easymotion-s)
nmap <localleader>fs <Plug>(easymotion-overwin-f)

"""""""""""""""""""""
"  MarkdownPreview  "
"""""""""""""""""""""
let g:mkdp_auto_start = 0
let g:mkdp_auto_close = 1
let g:mkdp_refresh_slow = 0
let g:mkdp_command_for_global = 0
let g:mkdp_open_to_the_world = 0
let g:mkdp_browser = 'Brave Browser'
let g:mkdp_page_title = '${name}'

nmap <localleader>l <Plug>MarkdownPreviewToggle

"""""""""""""""""""""
"      VimRoom      "
"""""""""""""""""""""
function! s:start_write_mode()
  let b:quitting = 0
  let b:quitting_bang = 0
  autocmd QuitPre <buffer> let b:quitting = 1
  cabbrev <buffer> q! let b:quitting_bang = 1 <bar> q!

  silent !tmux set status off
  silent !tmux list-panes -F '\#F' | grep -q Z || tmux resize-pane -Z

  set noshowmode
  set noshowcmd
  set scrolloff=999

  syntax on

  so ~/.config/nvim/rc/schemes/light.vim

  setlocal nonumber
  setlocal norelativenumber

  silent redraw!

  Limelight
  MarkdownPreview
endfunction

function! s:end_write_mode()
  set number
  set relativenumber

  so ~/.config/nvim/rc/scheme.vim

  silent !tmux set status on
  silent !tmux list-panes -F '\#F' | grep -q Z && tmux resize-pane -Z

  silent redraw!

  set showmode
  set showcmd
  set scrolloff=4

  Limelight!
  MarkdownPreviewStop

  " Quit Vim if this is the only remaining buffer
  if b:quitting && len(filter(range(1, bufnr('$')), 'buflisted(v:val)')) == 1
    if b:quitting_bang
      qa!
    else
      qa
    endif
  endif
endfunction

let g:goyo_width=90

autocmd! User GoyoEnter nested call <SID>start_write_mode()
autocmd! User GoyoLeave nested call <SID>end_write_mode()

nmap <leader>w :Goyo<CR>

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
"   carbon.now.sh   "
"""""""""""""""""""""
vnoremap <F5> :CarbonNowSh<CR>

"""""""""""""""""""""
"     SplitJoin     "
"""""""""""""""""""""
let g:splitjoin_split_mapping = ''
let g:splitjoin_join_mapping = ''

nmap sj :SplitjoinSplit<cr>
nmap sk :SplitjoinJoin<cr>

"""""""""""""""""""""
"   calendar.vim    "
"""""""""""""""""""""
let g:calendar_google_calendar = 1
let g:calendar_google_api_key = $CALENDAR_VIM_API_KEY
let g:calendar_google_client_id = $CALENDAR_VIM_CLIENT_ID
let g:calendar_google_client_secret = $CALENDAR_VIM_CLIENT_SECRET
