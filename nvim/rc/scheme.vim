syntax enable

set termguicolors

let g:enable_bold_font=1
let g:enable_italic_font = 1

let g:tranquility_bold = 1
let g:tranquility_italic = 1

let g:mnds_theme=$MNDS_THEME

if g:mnds_theme == "light"
  so ~/.config/nvim/rc/schemes/light.vim
else
  so ~/.config/nvim/rc/schemes/dark.vim
endif

function! StatusLineLinter() abort
   let l:counts = ale#statusline#Count(bufnr(''))
   let l:all_errors = l:counts.error + l:counts.style_error
   let l:all_non_errors = l:counts.total - l:all_errors
   return printf(
   \ 'warn: %d, err: %d',
   \ l:all_non_errors,
   \ l:all_errors
   \)
 endfunction

function! StatusLineBranch()
  let l:branch = FugitiveHead()

  return printf(
    \ ' (%s)',
    \ l:branch
    \ )
endfunction

" Don't show the tabline on top
set showtabline=0

set laststatus=2
set statusline=
set statusline+=\ \ \  " Empty space
set statusline+=%< " Where to truncate line
set statusline+=%f " Path to the file in the buffer, as typed or relative to current directory
set statusline+=%{&modified?'\ +':''}
set statusline+=%{&readonly?'\ ':''}
set statusline+=%= " Separation point between left and right aligned items
set statusline+=%{StatusLineBranch()} " Git branch
set statusline+=\ %{StatusLineLinter()}, " Show errors and warnings from ALE
set statusline+=\ col:\ %c
set statusline+=\ \ \  " Empty space

" Force the correct separator on all vim themes
set fillchars+=vert:│
