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

" Close buffer but not the pane
nmap <Leader>w :bp\|bd #<CR>
" Close buffer and the pane
nmap <Leader>q :bw<CR>

" Saving buffers
map <C-s> <ESC>:w<CR>

nmap <leader>s :%s/\v
nmap <leader>a :s/\v

" Remove highlight from the last search
nnoremap <Leader>, :noh<CR>

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

" Refresh Chrome
function ChromeRefresh()
  silent !chrome.refresh
  redraw
endfunction

nnoremap <localleader>r :call ChromeRefresh()<CR>

" Reloading configs
command Rl source ~/.config/nvim/init.vim
