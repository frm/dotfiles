syntax enable

" Fix for background using tmux on Linux
if &term =~ '256color'
  " disable Background Color Erase (BCE) so that color schemes
  " render properly when inside 256-color tmux and GNU screen.
  " see also http://snk.tuxfamily.org/log/vim-256color-bce.html
  set t_ut=
endif

let g:solarized_termcolors=256
let base16colorspace=256
set background=dark
colorscheme base16-eighties
"colorscheme solarized
