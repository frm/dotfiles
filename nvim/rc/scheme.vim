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

set background=dark
colorscheme hybrid_reverse
let g:hybrid_custom_term_colors = 1

" Vim Airline
let g:airline_theme = 'hybrid'
let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#branch#enabled=1
let g:airline_powerline_fonts = 1

" Hybrid uses a different vertical separator
" Reset it to equal every other colorscheme
set fillchars+=vert:│
