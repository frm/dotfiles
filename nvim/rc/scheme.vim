syntax enable

" Neovim runs in true color mode,
" which means iTerm2 falls back to default pallette.
" See https://github.com/chriskempson/base16-vim/issues/69
" and https://github.com/chriskempson/base16-vim/issues/111
if has("termguicolors")
  set termguicolors
endif

let g:enable_bold_font=1
let g:enable_italic_font = 1

let g:mnds_theme=$MNDS_THEME

if g:mnds_theme == "light"
  so ~/.config/nvim/rc/schemes/light.vim
else
  so ~/.config/nvim/rc/schemes/dark.vim
endif

function! LinterStatus() abort
   let l:counts = ale#statusline#Count(bufnr(''))
   let l:all_errors = l:counts.error + l:counts.style_error
   let l:all_non_errors = l:counts.total - l:all_errors
   return l:counts.total == 0 ? '' : printf(
   \ 'W:%d E:%d',
   \ l:all_non_errors,
   \ l:all_errors
   \)
endfunction

" Don't show the tabline on top
set showtabline=0

set laststatus=2
set statusline=
set statusline+=\  " Empty space
set statusline+=%< " Where to truncate line
set statusline+=%f " Path to the file in the buffer, as typed or relative to current directory
set statusline+=%{&modified?'\ +':''}
set statusline+=%{&readonly?'\ ':''}
set statusline+=%= " Separation point between left and right aligned items
set statusline+=\ %{LinterStatus()} " Show errors and warnings from ALE
set statusline+=\ %3p%% " Percentage through file in lines as in |CTRL-G|
set statusline+=\  " Empty space

" Force the correct separator on all vim themes
set fillchars+=vert:│
