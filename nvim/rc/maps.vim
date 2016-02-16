let mapleader="\<Space>"

" Moving between wrapped lines
nnoremap j gj
nnoremap k gk

" Moving between buffers
nmap <Leader>h :bprevious<CR>
nmap <Leader>l :bnext<CR>

" Closing buffers
nmap <Leader>w :bw<CR>

" Switching between the last two buffers
nmap <Leader>j :b#<CR>

" Remove highlight from the last search
nnoremap <Leader>, :noh<CR>

" jj is the way to Esc
imap jj <Esc>
set timeoutlen=300

" Reloading configs
command Rl source ~/.config/nvim/init.vim

" Remove trailing whitespaces
autocmd BufRead,BufWrite * if ! &bin | silent! %s/\s\+$//ge | endif

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

" Mapping ag
nnoremap <Leader>a :Ag<Space>

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

" Saving buffers
map <Leader>s <ESC>:w<CR>
map <Leader>S <ESC>:wq<CR>
