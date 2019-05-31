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
   return printf(
   \ 'warn: %d, err: %d',
   \ l:all_non_errors,
   \ l:all_errors
   \)
 endfunction

function! ParseCiStatus(out)
  let l:states = {
    \ 'success': "ci passed",
    \ 'failure': "ci failed",
    \ 'neutral': "ci yet to run",
    \ 'error': "ci errored",
    \ 'cancelled': "ci cancelled",
    \ 'action_required': "ci requires action",
    \ 'pending': "ci running",
    \ 'timed_out': "ci timed out",
    \ 'no status': "no ci",
  \ }

  return l:states[a:out] . ", "
endfunction

function! OnCiStatus(job_id, data, event) dict
  if a:event == "stdout" && a:data[0] != ''
    let g:ci_status = ParseCiStatus(a:data[0])
    call timer_start(30000, 'CiStatus')
  endif
endfunction

function! CiStatus(timer_id)
  let l:callbacks = {
  \ 'on_stdout': function('OnCiStatus'),
  \ 'on_stderr': function('OnCiStatus'),
  \ }

  call jobstart('hub ci-status', l:callbacks)
endfunction

let s:in_git = system("git rev-parse --git-dir 2> /dev/null")

if s:in_git == 0
  call CiStatus(0)
endif

let g:ci_status = ""

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
set statusline+=\ %{LinterStatus()}, " Show errors and warnings from ALE
set statusline+=\ %{g:ci_status} " Show errors and warnings from ALE
set statusline+=col:\ %c
set statusline+=\ \ \  " Empty space

" Force the correct separator on all vim themes
set fillchars+=vert:│
