" NOTE: these options are commented out because they're
" already enforeced by base.vim
" Uncomment in the future if issues arise
"
" Some servers have issues with backup files, see neoclide/coc.nvim#649.
" set nobackup
" set nowritebackup
"
" Having longer updatetime (default is 4000 ms = 4 s) leads to noticeable
" delays and poor user experience.
" set updatetime=300
"
" Always show the signcolumn, otherwise it would shift the text each time
" diagnostics appear/become resolved.
" set signcolumn=yes
"
" Don't pass messages to |ins-completion-menu|.
" set shortmess+=c
"
" Actual config starts here:

" TextEdit might fail if hidden is not set.
set hidden

" Give more space for displaying messages.
set cmdheight=2

nmap <silent> <localleader>cd <Plug>(coc-definition)
nmap <silent> <localleader>cr <Plug>(coc-references)
nmap <silent> <localleader>cs <Plug>(coc-codelens-action)
nmap <silent> <localleader>cn <Plug>(coc-rename)
nnoremap <silent> <localleader>co  :<C-u>CocFzfList outline<CR>
nnoremap <silent> <localleader>ce  :<C-u>CocFzfList diagnostics<CR>
nnoremap <silent> <localleader>cl  :<C-u>CocFzfList locations<CR>
nnoremap <silent> <localleader>cc  :<C-u>CocFzfListResume<CR>
nnoremap <silent> <localleader>cb  :<C-u>CocFzfList branches<CR>
nnoremap <silent> <localleader>ci  :<C-u>CocFzfList issues<CR>

nmap gs <Plug>(coc-git-chunkinfo)
" Important: gb is reserved for toggling git blame

function! s:check_back_space() abort
  let col = col('.') - 1
  return !col || getline('.')[col - 1]  =~# '\s'
endfunction

" Use tab for trigger completion with characters ahead and navigate.
" NOTE: Use command ':verbose imap <tab>' to make sure tab is not mapped by
" other plugin before putting this into your config.
inoremap <silent><expr> <TAB>
      \ pumvisible() ? "\<C-n>" :
      \ <SID>check_back_space() ? "\<TAB>" :
      \ coc#refresh()
inoremap <expr><S-TAB> pumvisible() ? "\<C-p>" : "\<C-h>"

" Use <c-space> to trigger completion.
inoremap <silent><expr> <c-space> coc#refresh()

" use <cr> for confirm completion, `<C-g>u` means break undo chain at current position.
" coc only does snippet and additional edit on confirm.
inoremap <expr> <TAB> pumvisible() ? "\<C-y>" : "\<C-g>u\<CR>"

" Show documentation in floating window
nnoremap <silent> K :call <SID>show_documentation()<CR>

function! s:show_documentation()
  if (index(['vim','help'], &filetype) >= 0)
    execute 'h '.expand('<cword>')
  else
    call CocAction('doHover')
  endif
endfunction

" Toggle CodeLens layer
nnoremap <silent> L :call <SID>toggle_code_lens()<CR>

function! s:toggle_code_lens()
  let l:codelens = CocAction("getConfig", "codeLens")
  let l:toggled = !(l:codelens['enable'])

  call CocAction("updateConfig", "codeLens.enable", l:toggled)
endfunction

" Toggle Git Blame Layer
nnoremap <silent> gb :call <SID>toggle_git_blame()<CR>

function! s:toggle_git_blame()
  let l:git_config = CocAction("getConfig", "git")
  let l:toggled = !(l:git_config["addGBlameToVirtualText"])

  call CocAction("updateConfig", "git.addGBlameToVirtualText", l:toggled)
endfunction
