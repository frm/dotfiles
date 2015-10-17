" Associate *.prolog and *.gawk with prolog and awk filetypes
au BufRead,BufNewFile *.prolog setfiletype prolog
au BufRead,BufNewFile *.gawk setfiletype awk

" Allow every file ending with .slim to be highlighted
autocmd BufNewFile,BufRead *.slim set ft=slim
