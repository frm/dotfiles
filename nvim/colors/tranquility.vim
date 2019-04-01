" Tranquility Theme: {{{
scriptencoding utf8
" }}}

" Configuration: {{{

if v:version > 580
  highlight clear
  if exists('syntax_on')
    syntax reset
  endif
endif

let g:colors_name = 'tranquility'

if !(has('termguicolors') && &termguicolors) && !has('gui_running') && &t_Co != 256
  finish
endif

" Palette: {{{2

let s:fg        = ['#f2eae1', 255]

let s:bglighter = ['#574830', 238]
let s:bglight   = ['#33302B', 237]
let s:bg        = ['#0b0906', 236]
let s:bgdark    = ['#33302B', 235]
let s:bgdarker  = ['#574830', 234]

let s:subtle    = ['#33302B', 238]

let s:selection = ['#44475A', 239]
let s:comment   = ['#6272A4',  61]
let s:cyan      = ['#995D81', 117]
let s:green     = ['#d7a467',  84]
let s:orange    = ['#d4b490', 215]
let s:pink      = ['#ff8e72', 212]
let s:purple    = ['#ebcfab', 141]
let s:red       = ['#aa8d67', 203]
let s:yellow    = ['#b3a08b', 228]

let s:none      = ['NONE', 'NONE']

let g:tranquility_palette = {
      \ 'fg': s:fg,
      \ 'bg': s:bg,
      \ 'selection': s:selection,
      \ 'comment': s:comment,
      \ 'cyan': s:cyan,
      \ 'green': s:green,
      \ 'orange': s:orange,
      \ 'pink': s:pink,
      \ 'purple': s:purple,
      \ 'red': s:red,
      \ 'yellow': s:yellow,
      \
      \ 'bglighter': s:bglighter,
      \ 'bglight': s:bglight,
      \ 'bgdark': s:bgdark,
      \ 'bgdarker': s:bgdarker,
      \ 'subtle': s:subtle,
      \}

if has('nvim')
  let g:terminal_color_0  = '#21222C'
  let g:terminal_color_1  = '#FF5555'
  let g:terminal_color_2  = '#50FA7B'
  let g:terminal_color_3  = '#F1FA8C'
  let g:terminal_color_4  = '#BD93F9'
  let g:terminal_color_5  = '#FF79C6'
  let g:terminal_color_6  = '#8BE9FD'
  let g:terminal_color_7  = '#F8F8F2'
  let g:terminal_color_8  = '#6272A4'
  let g:terminal_color_9  = '#FF6E6E'
  let g:terminal_color_10 = '#69FF94'
  let g:terminal_color_11 = '#FFFFA5'
  let g:terminal_color_12 = '#D6ACFF'
  let g:terminal_color_13 = '#FF92DF'
  let g:terminal_color_14 = '#A4FFFF'
  let g:terminal_color_15 = '#FFFFFF'
endif

if has('terminal')
  let g:terminal_ansi_colors = [
      \ '#21222C', '#FF5555', '#50FA7B', '#F1FA8C',
      \ '#BD93F9', '#FF79C6', '#8BE9FD', '#F8F8F2',
      \ '#6272A4', '#FF6E6E', '#69FF94', '#FFFFA5',
      \ '#D6ACFF', '#FF92DF', '#A4FFFF', '#FFFFFF'
      \]
endif

" }}}2
" User Configuration: {{{2

if !exists('g:tranquility_bold')
  let g:tranquility_bold = 1
endif

if !exists('g:tranquility_italic')
  let g:tranquility_italic = 1
endif

if !exists('g:tranquility_underline')
  let g:tranquility_underline = 1
endif

if !exists('g:tranquility_undercurl') && g:tranquility_underline != 0
  let g:tranquility_undercurl = 1
endif

if !exists('g:tranquility_inverse')
  let g:tranquility_inverse = 1
endif

if !exists('g:tranquility_colorterm')
  let g:tranquility_colorterm = 1
endif

"}}}2
" Script Helpers: {{{2

let s:attrs = {
      \ 'bold': g:tranquility_bold == 1 ? 'bold' : 0,
      \ 'italic': g:tranquility_italic == 1 ? 'italic' : 0,
      \ 'underline': g:tranquility_underline == 1 ? 'underline' : 0,
      \ 'undercurl': g:tranquility_undercurl == 1 ? 'undercurl' : 0,
      \ 'inverse': g:tranquility_inverse == 1 ? 'inverse' : 0,
      \}

function! s:h(scope, fg, ...) " bg, attr_list, special
  let l:fg = copy(a:fg)
  let l:bg = get(a:, 1, ['NONE', 'NONE'])

  let l:attr_list = filter(get(a:, 2, ['NONE']), 'type(v:val) == 1')
  let l:attrs = len(l:attr_list) > 0 ? join(l:attr_list, ',') : 'NONE'

  " Falls back to coloring foreground group on terminals because
  " nearly all do not support undercurl
  let l:special = get(a:, 3, ['NONE', 'NONE'])
  if l:special[0] !=# 'NONE' && l:fg[0] ==# 'NONE' && !has('gui_running')
    let l:fg[0] = l:special[0]
    let l:fg[1] = l:special[1]
  endif

  let l:hl_string = [
        \ 'highlight', a:scope,
        \ 'guifg=' . l:fg[0], 'ctermfg=' . l:fg[1],
        \ 'guibg=' . l:bg[0], 'ctermbg=' . l:bg[1],
        \ 'gui=' . l:attrs, 'cterm=' . l:attrs,
        \ 'guisp=' . l:special[0],
        \]

  execute join(l:hl_string, ' ')
endfunction

function! s:Background()
  if g:tranquility_colorterm || has('gui_running')
    return s:bg
  else
    return s:none
  endif
endfunction

"}}}2
" Tranquility Highlight Groups: {{{2

call s:h('TranquilityBgLight', s:none, s:bglight)
call s:h('TranquilityBgLighter', s:none, s:bglighter)
call s:h('TranquilityBgDark', s:none, s:bgdark)
call s:h('TranquilityBgDarker', s:none, s:bgdarker)

call s:h('TranquilityFg', s:fg)
call s:h('TranquilityFgUnderline', s:fg, s:none, [s:attrs.underline])
call s:h('TranquilityFgBold', s:fg, s:none, [s:attrs.bold])

call s:h('TranquilityComment', s:comment)
call s:h('TranquilityCommentBold', s:comment, s:none, [s:attrs.bold])

call s:h('TranquilitySelection', s:none, s:selection)

call s:h('TranquilitySubtle', s:subtle)

call s:h('TranquilityCyan', s:cyan)
call s:h('TranquilityCyanItalic', s:cyan, s:none, [s:attrs.italic])

call s:h('TranquilityGreen', s:green)
call s:h('TranquilityGreenBold', s:green, s:none, [s:attrs.bold])
call s:h('TranquilityGreenItalic', s:green, s:none, [s:attrs.italic])
call s:h('TranquilityGreenItalicUnderline', s:green, s:none, [s:attrs.italic, s:attrs.underline])

call s:h('TranquilityOrange', s:orange)
call s:h('TranquilityOrangeBold', s:orange, s:none, [s:attrs.bold])
call s:h('TranquilityOrangeItalic', s:orange, s:none, [s:attrs.italic])
call s:h('TranquilityOrangeBoldItalic', s:orange, s:none, [s:attrs.bold, s:attrs.italic])
call s:h('TranquilityOrangeInverse', s:bg, s:orange)

call s:h('TranquilityPink', s:pink)
call s:h('TranquilityPinkItalic', s:pink, s:none, [s:attrs.italic])

call s:h('TranquilityPurple', s:purple)
call s:h('TranquilityPurpleBold', s:purple, s:none, [s:attrs.bold])
call s:h('TranquilityPurpleItalic', s:purple, s:none, [s:attrs.italic])

call s:h('TranquilityRed', s:red)
call s:h('TranquilityRedInverse', s:fg, s:red)

call s:h('TranquilityYellow', s:yellow)
call s:h('TranquilityYellowItalic', s:yellow, s:none, [s:attrs.italic])

call s:h('TranquilityError', s:red, s:none, [], s:red)

call s:h('TranquilityErrorLine', s:none, s:none, [s:attrs.undercurl], s:red)
call s:h('TranquilityWarnLine', s:none, s:none, [s:attrs.undercurl], s:orange)
call s:h('TranquilityInfoLine', s:none, s:none, [s:attrs.undercurl], s:cyan)

call s:h('TranquilityTodo', s:cyan, s:none, [s:attrs.bold, s:attrs.inverse])
call s:h('TranquilitySearch', s:green, s:none, [s:attrs.inverse])
call s:h('TranquilityBoundary', s:comment, s:bgdark)
call s:h('TranquilityLink', s:cyan, s:none, [s:attrs.underline])

call s:h('TranquilityDiffChange', s:orange, s:none)
call s:h('TranquilityDiffText', s:bg, s:orange)
call s:h('TranquilityDiffDelete', s:red, s:bgdark)

" }}}2

" }}}
" User Interface: {{{

set background=dark

" Required as some plugins will overwrite
call s:h('Normal', s:fg, s:Background())
call s:h('StatusLine', s:none, s:bglighter, [s:attrs.bold])
call s:h('StatusLineNC', s:none, s:bglight)
call s:h('StatusLineTerm', s:none, s:bglighter, [s:attrs.bold])
call s:h('StatusLineTermNC', s:none, s:bglight)
call s:h('WildMenu', s:bg, s:purple, [s:attrs.bold])
call s:h('CursorLine', s:none, s:subtle)

hi! link ColorColumn  TranquilityBgDark
hi! link CursorColumn TranquilityBgDark
hi! link CursorLineNr TranquilityYellow
hi! link DiffAdd      TranquilityGreen
hi! link DiffAdded    DiffAdd
hi! link DiffChange   TranquilityDiffChange
hi! link DiffDelete   TranquilityDiffDelete
hi! link DiffRemoved  DiffDelete
hi! link DiffText     TranquilityDiffText
hi! link Directory    TranquilityPurpleBold
hi! link ErrorMsg     TranquilityRedInverse
hi! link FoldColumn   TranquilitySubtle
hi! link Folded       TranquilityBoundary
hi! link IncSearch    TranquilityOrangeInverse
hi! link LineNr       TranquilityOrange
hi! link MoreMsg      TranquilityFgBold
hi! link NonText      TranquilitySubtle
hi! link Pmenu        TranquilityBgDark
hi! link PmenuSbar    TranquilityBgDark
hi! link PmenuSel     TranquilitySelection
hi! link PmenuThumb   TranquilitySelection
hi! link Question     TranquilityFgBold
hi! link Search       TranquilitySearch
hi! link SignColumn   TranquilityComment
hi! link TabLine      TranquilityBoundary
hi! link TabLineFill  TranquilityBgDarker
hi! link TabLineSel   Normal
hi! link Title        TranquilityGreenBold
hi! link VertSplit    TranquilityBoundary
hi! link Visual       TranquilitySelection
hi! link VisualNOS    Visual
hi! link WarningMsg   TranquilityOrangeInverse

" }}}
" Syntax: {{{

" Required as some plugins will overwrite
call s:h('MatchParen', s:green, s:none, [s:attrs.underline])
call s:h('Conceal', s:comment, s:bglight)

" Neovim uses SpecialKey for escape characters only. Vim uses it for that, plus whitespace.
if has('nvim')
  hi! link SpecialKey TranquilityRed
else
  hi! link SpecialKey TranquilitySubtle
endif

hi! link Comment TranquilityComment
hi! link Underlined TranquilityFgUnderline
hi! link Todo TranquilityTodo

hi! link Error TranquilityError
hi! link SpellBad TranquilityErrorLine
hi! link SpellLocal TranquilityWarnLine
hi! link SpellCap TranquilityInfoLine
hi! link SpellRare TranquilityInfoLine

hi! link Constant TranquilityPurple
hi! link String TranquilityYellow
hi! link Character TranquilityPink
hi! link Number Constant
hi! link Boolean Constant
hi! link Float Constant

hi! link Identifier TranquilityFg
hi! link Function TranquilityGreen

hi! link Statement TranquilityPink
hi! link Conditional TranquilityPink
hi! link Repeat TranquilityPink
hi! link Label TranquilityPink
hi! link Operator TranquilityPink
hi! link Keyword TranquilityPink
hi! link Exception TranquilityPink

hi! link PreProc TranquilityPink
hi! link Include TranquilityPink
hi! link Define TranquilityPink
hi! link Macro TranquilityPink
hi! link PreCondit TranquilityPink
hi! link StorageClass TranquilityPink
hi! link Structure TranquilityPink
hi! link Typedef TranquilityPink

hi! link Type TranquilityCyanItalic

hi! link Delimiter TranquilityFg

hi! link Special TranquilityPink
hi! link SpecialComment TranquilityCyanItalic
hi! link Tag TranquilityCyan
hi! link helpHyperTextJump TranquilityLink
hi! link helpCommand TranquilityPurple
hi! link helpExample TranquilityGreen
hi! link helpBacktick Special

"}}}

" vim: fdm=marker ts=2 sts=2 sw=2:
