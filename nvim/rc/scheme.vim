syntax enable

set termguicolors

set background=dark
let g:gruvbox_italic=1

colorscheme mountaineer

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
    \ '  %s ',
    \ l:branch
    \ )
endfunction

function! StatusLineErrors()
  let info = get(b:, 'coc_diagnostic_info', {})

  if empty(info) | return '' | endif

  if info['error']
    return '· ' . info['error'] . ' '
  endif

  return ''
endfunction

function! StatusLineWarnings()
  let info = get(b:, 'coc_diagnostic_info', {})

  if empty(info) | return '' | endif

  if info['warning']
    return '· ' . info['warning'] . ' '
  endif

  return ''
endfunction

" Don't show the tabline on top
set showtabline=0

set laststatus=2

set statusline=
set statusline+=%#StatusLineEntryBold#
set statusline+=\ \  " Empty space
set statusline+=%< " Where to truncate line
set statusline+=\ %f " Path to the file in the buffer, as typed or relative to current directory
set statusline+=%#StatusLineEntry#
set statusline+=\ on
set statusline+=%#StatusLineEntryBold#
set statusline+=%{StatusLineBranch()} " Git branch
set statusline+=%#StatusLineEntry#
set statusline+=%{&modified?'+':'\ '}
set statusline+=%{&readonly?'':'\ '}
set statusline+=%#StatusLineEntryInverted#
set statusline+=\  " Empty space
set statusline+=%#StatusLineErrorBold#%{StatusLineErrors()}%#StatusLineEntryInverted#
set statusline+=%#StatusLineWarningBold#%{StatusLineWarnings()}%#StatusLineEntryInverted#
set statusline+=%= " Separation point between left and right aligned items
set statusline+=%#StatusLineEntryBoldInverted#
set statusline+=\ c:\ %c

" Force the correct separator on all vim themes
set fillchars+=vert:│
