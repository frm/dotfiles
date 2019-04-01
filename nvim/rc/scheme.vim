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

" Vim Airline
let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#branch#enabled=1
let g:airline_powerline_fonts = 1

" Force the correct separator on all vim themes
set fillchars+=vert:│
