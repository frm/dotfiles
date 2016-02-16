syntax enable

" Highlights current line
set cursorline

" Number of lines between cursor and scroll
set scrolloff=4

" Fix for background using tmux on Linux
if &term =~ '256color'
  " disable Background Color Erase (BCE) so that color schemes
  " render properly when inside 256-color tmux and GNU screen.
  " see also http://snk.tuxfamily.org/log/vim-256color-bce.html
  set t_ut=
endif

set t_Co=256

" Color Plugins
" Colors
Plugin 'chriskempson/base16-vim'
Plugin 'altercation/vim-colors-solarized'
Plugin 'morhetz/gruvbox'

set background=dark
colorscheme tomorrow-night
"color slate
let base16colorspace=256
