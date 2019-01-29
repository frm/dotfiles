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

" Clear search results
nnoremap <localleader><leader> :noh<CR>

" Mimic Alt-backspace
inoremap <M-BS> <C-W>

" Ctrl+S save
nnoremap <C-s> :write<CR>
inoremap <C-s> <Esc>:write<CR>a

nnoremap <localleader>ss :s/\v
nnoremap <localleader>sv :Subvert/
nnoremap <localleader>sa :%s/\v
nnoremap <localleader>sd :%Subvert/

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
