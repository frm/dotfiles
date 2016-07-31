" Associate *.prolog and *.gawk with prolog and awk filetypes
au BufRead,BufNewFile *.prolog setfiletype prolog
au BufRead,BufNewFile *.gawk setfiletype awk
au BufRead,BufNewFile *.ignore setfiletype shell

" Allow every file ending with .slim to be highlighted
autocmd BufNewFile,BufRead *.slim set ft=slim

" Filetype syntax highlighting
function! NERDTreeHighlightFile(extension, fg, bg, guifg, guibg)
exec 'autocmd FileType nerdtree highlight ' . a:extension .' ctermbg='. a:bg .' ctermfg='. a:fg .' guibg='. a:guibg .' guifg='. a:guifg
exec 'autocmd FileType nerdtree syn match ' . a:extension .' #^\s\+.*'. a:extension .'$#'
endfunction

" TODO: update for base16 colors
call NERDTreeHighlightFile('jade', 'green', 'none', 'green', '#151515')
call NERDTreeHighlightFile('ini', 'yellow', 'none', 'yellow', '#151515')
call NERDTreeHighlightFile('md', 'blue', 'none', '#3366FF', '#151515')
call NERDTreeHighlightFile('yml', 'yellow', 'none', 'yellow', '#151515')
call NERDTreeHighlightFile('config', 'yellow', 'none', 'yellow', '#151515')
call NERDTreeHighlightFile('conf', 'yellow', 'none', 'yellow', '#151515')
call NERDTreeHighlightFile('json', 'yellow', 'none', 'yellow', '#151515')
call NERDTreeHighlightFile('html', 'yellow', 'none', 'yellow', '#151515')
call NERDTreeHighlightFile('styl', 'cyan', 'none', 'cyan', '#151515')
call NERDTreeHighlightFile('css', 'cyan', 'none', 'cyan', '#151515')
call NERDTreeHighlightFile('coffee', 'Red', 'none', 'red', '#151515')
call NERDTreeHighlightFile('rb', 'Red', 'none', 'red', '#151515')
call NERDTreeHighlightFile('js', 'yellow', 'none', '#f5871f', '#151515')
call NERDTreeHighlightFile('php', 'Magenta', 'none', '#8959a8', '#151515')
call NERDTreeHighlightFile('ds_store', 'Gray', 'none', '#4d4d4c', '#151515')
call NERDTreeHighlightFile('gitconfig', 'Gray', 'none', '#4d4d4c', '#151515')
call NERDTreeHighlightFile('gitignore', 'Gray', 'none', '#4d4d4c', '#151515')
call NERDTreeHighlightFile('bashrc', 'Gray', 'none', '#4d4d4c', '#151515')
call NERDTreeHighlightFile('bashprofile', 'Gray', 'none', '#4d4d4c', '#151515')
