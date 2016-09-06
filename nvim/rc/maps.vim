let mapleader="\<Space>"
let maplocalleader="\,"

" jj is the way to Esc
imap jj <Esc>
set timeoutlen=300

" Moving between wrapped lines
nnoremap j gj
nnoremap k gk

" Moving between panes
nnoremap <C-h> <C-w>h
nnoremap <C-j> <C-w>j
nnoremap <C-k> <C-w>k
nnoremap <C-l> <C-w>l

" Switching panes around
nnoremap <M-h> <C-w>H
nnoremap <M-j> <C-w>J
nnoremap <M-k> <C-w>K
nnoremap <M-l> <C-w>L

" Moving between buffers
nmap <Leader>h :bprevious!<CR>
nmap <Leader>l :bnext!<CR>

" Closing buffers
" Don't close the pane
nmap <Leader>w :bp\|bd #<CR>
" Close the pane
nmap <Leader>q :bw<CR>

" Saving buffers
map <C-s> <ESC>:w<CR>
map <Leader>s <ESC>:wq<CR>

" Remove highlight from the last search
nnoremap <Leader>, :noh<CR>

" Alt-backspace
inoremap <M-BS> <C-W>

" Remove trailing whitespaces
autocmd BufRead,BufWrite * if ! &bin | silent! %s/\s\+$//ge | endif

" Renaming files
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

function ChromeRefresh()
  silent !chrome.refresh
  redraw
endfunction

" Refresh Chrome
nnoremap <localleader>r :call ChromeRefresh()<CR>

" Reloading configs
command Rl source ~/.config/nvim/init.vim
