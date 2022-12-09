let mapleader="\<space>"
let maplocalleader=','

imap jk <Esc>
set timeoutlen=300

" Better pane movement
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l

" Better pane switching
nnoremap <M-h> <C-w>H
nnoremap <M-j> <C-w>J
nnoremap <M-k> <C-w>K
nnoremap <M-l> <C-w>L

" Swap lines
nnoremap mj :m +1<CR>
nnoremap mk :m -2<CR>

" Clear search results
nnoremap <localleader><leader> :noh<CR>

" Ctrl+S save
nnoremap <C-s> :write<CR>
inoremap <C-s> <Esc>:write<CR>a

nnoremap <localleader>s :s/\v
nnoremap <localleader>ss :%s/\v
nnoremap <localleader>S :S/
nnoremap <localleader>SS :%S/

vnoremap <localleader>s "hy:s/\v<C-r>h/
vnoremap <localleader>ss "hy:%s/\v<C-r>h/
vnoremap <localleader>S "hy:S/<C-r>h/
vnoremap <localleader>SS "hy:%S/<C-r>h/

" Remove trailing whitespaces when reading and writing to file
autocmd BufRead,BufWrite * if ! &bin | silent! %s/\s\+$//ge | endif

function! Lock()
  let lock = '/System/Library/CoreServices/Menu\ Extras/User.menu/Contents/Resources/CGSession -suspend'
  exec ':silent !' . lock
endfunction

nnoremap <leader>L :call Lock()<CR>

" Rename the current file
function! Rename()
  let current = expand('%')
  let new_file = input('New name: ', current)
  if new_file != current && new_file != ''
    exec ':saveas ' . new_file
    exec ':silent !rm ' . current
    redraw!
  endif
endfunction
map <Leader>r :call Rename()<CR>

" Refresh the browser
nnoremap <localleader>r :silent !browser.refresh<CR>

function! MakeExecutable()
  let confirmation = confirm("Make this file executable?", "&Yes\n&No")

  if confirmation
    exec '!chmod +x %'
    redraw!
  endif
endfunction
nnoremap <C-x> :call MakeExecutable()<CR>

function! ColourTest()
  exec 'so $VIMRUNTIME/syntax/hitest.vim'
endfunction

let g:hidden_line_numbers=1
nnoremap <localleader>n :call SetNumber()<CR>

function! SetNumber()
  if g:hidden_line_numbers
    exec "hi CursorLineNr guifg=" . g:terminal_color_1
    exec "hi CursorLineNr guibg=" . g:terminal_color_0
    exec "hi LineNr guifg=" . g:terminal_color_8
    exec "hi LineNr guibg=" . g:terminal_color_0

    let g:hidden_line_numbers=0
  else
    exec "hi CursorLineNr guifg=" . g:terminal_color_0
    exec "hi CursorLineNr guibg=" . g:terminal_color_0
    exec "hi LineNr guifg=" . g:terminal_color_0
    exec "hi LineNr guibg=" . g:terminal_color_0

    let g:hidden_line_numbers=1
  endif
endfunction
