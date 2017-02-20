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

let g:enable_bold_font = 2

set background=dark
let g:base_16_shell='~/.config/base16-shell/scripts/'
let base16colorspace=256
colorscheme base16-tomorrow-night
" colorscheme base16-default-dark

" Vim Airline
let g:airline_theme = 'hybrid'
let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#branch#enabled=1
let g:airline_powerline_fonts = 1

" Preventing airline from hiding with NerdTreeToggle
set laststatus=2
