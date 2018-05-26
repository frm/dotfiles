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

" Remove trailing whitespaces when reading and writing to file
autocmd BufRead,BufWrite * if ! &bin | silent! %s/\s\+$//ge | endif

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
