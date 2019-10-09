function! s:wrap_git_command(command, ...)
  silent !clear

  let output = system("git " . a:command . " " . join(a:000, " "))

  if v:shell_error == 1
    echo output
  endif

  return output
endfunction

" TODO: Sort by arg lead
function! s:git_branch_comp(ArgLead, CmdLine, CursorPos)
  let branches = split(system("git branch"), "\n")
  call map(branches, { _idx, val -> substitute(val, ' \+', '', '') })
  call map(branches, { _idx, val -> substitute(val, '\*', '', '') })

  return branches
endfunction

" Custom git wrappers
command! -nargs=* -complete=customlist,s:git_branch_comp Gco :call s:wrap_git_command("checkout", <f-args>)
command! -nargs=* -complete=customlist,s:git_branch_comp Gcheckout :call s:wrap_git_command("checkout", <f-args>)

command! -nargs=* Gbranch :call s:wrap_git_command("branch", <f-args>)
command! -nargs=* Gb :call s:wrap_git_command("branch", <f-args>)

command! -nargs=* Ga :call s:wrap_git_command("add", <f-args>)
command! -nargs=+ Gcp :call s:wrap_git_command("cherry-pick", <f-args>)
command! -nargs=0 Gconf :call s:wrap_git_command("conf", <f-args>)

" Fugitive aliases
command! -nargs=* Gc Gcommit
command! -nargs=* Gd Gdiff
command! -nargs=* Gf Gfetch
command! -nargs=* Gm Gmerge
command! -nargs=* Gs Gstatus
