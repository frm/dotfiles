let mapleader="\<Space>"

nnoremap j gj
nnoremap k gk

nmap <Leader>b :bprevious<CR>
nmap <Leader>n :bnext<CR>
nmap <Leader>w :bw<CR>

" Remove highlight
nnoremap <leader>, :noh<cr>

set pastetoggle=<F2>

" Remapping Esc
imap jj <Esc>
set timeoutlen=300

command Rl source ~/.vimrc

" Remove trailing whitespaces
autocmd BufRead,BufWrite * if ! &bin | silent! %s/\s\+$//ge | endif

" Thoughtbot's ag on vim
if executable('ag')
  " Use ag over grep
  set grepprg=ag\ --nogroup\ --nocolor

  " Use ag in CtrlP for listing files. Lightning fast and respects .gitignore
  let g:ctrlp_user_command = 'ag %s -l --nocolor -g ""'

  " ag is fast enough that CtrlP doesn't need to cache
  let g:ctrlp_use_caching = 0

  " Ag command
  command -nargs=+ -complete=file -bar Ag silent! grep! <args>|cwindow|redraw!
endif

" Mapping ag function to Ctrl + G
nnoremap <Leader>f :Ag<Space>

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

" Switching between the last two files
nmap <Tab> :b#<CR>

" Saving
map <leader>s <ESC>:w<CR>
map <leader>S <ESC>:wq<CR>
