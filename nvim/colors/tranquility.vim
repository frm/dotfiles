" Tranquility Theme: {{{
"
" https://github.com/justmendes/tranquility.vim
"
" Copyright 2019, All rights reserved
"
" @author Fernando Mendes <fernando@mendes.codes>
"
" Based on Dracula theme, with minor code changes:
"
" https://github.com/zenorocha/dracula-theme
"
" Copyright 2016, All rights reserved
"
" Code licensed under the MIT license
" http://zenorocha.mit-license.org
"
" @author Trevor Heins <@heinst>
" @author Éverton Ribeiro <nuxlli@gmail.com>
" @author Derek Sifford <dereksifford@gmail.com>
" @author Zeno Rocha <hi@zenorocha.com>
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

let s:fg          = ['#F2EAE1', 254]

let s:bglighter   = ['#574830',   3]
let s:bglight     = ['#33302B',   4]
let s:bg          = ['#0B0906',   0]

let s:subtle      = ['#33302B', 238]

let s:selection   = ['#44475A', 239]
let s:comment     = ['#6272A4',  61]
let s:purple      = ['#995D81', 125]
let s:green       = ['#6A8D73',   2]
let s:orange      = ['#D7A467', 137]
let s:lightbrown  = ['#D4B490',  12]
let s:red         = ['#FF8E72', 203]
let s:beige       = ['#EBCFAB',   5]
let s:darkbrown   = ['#AA8D67',  11]
let s:lightgray   = ['#B3A08B', 180]

let s:none        = ['NONE', 'NONE']

let g:tranquility_palette = {
      \ 'fg': s:fg,
      \ 'bg': s:bg,
      \ 'selection': s:selection,
      \ 'comment': s:comment,
      \ 'purple': s:purple,
      \ 'orange': s:orange,
      \ 'lightbrown': s:lightbrown,
      \ 'red': s:red,
      \ 'beige': s:beige,
      \ 'darkbrown': s:darkbrown,
      \ 'lightgray': s:lightgray,
      \
      \ 'bglighter': s:bglighter,
      \ 'bglight': s:bglight,
      \ 'subtle': s:subtle,
      \}

if has('nvim')
  let g:terminal_color_0  = '#33302B'
  let g:terminal_color_1  = '#AA8D67'
  let g:terminal_color_2  = '#6A8D73'
  let g:terminal_color_3  = '#B3A08B'
  let g:terminal_color_4  = '#EBCFAB'
  let g:terminal_color_5  = '#FF8E72'
  let g:terminal_color_6  = '#995D81'
  let g:terminal_color_7  = '#F2EAE1'
  let g:terminal_color_8  = '#6272A4'
  let g:terminal_color_9  = '#C4A781'
  let g:terminal_color_10 = '#84A78D'
  let g:terminal_color_11 = '#CDBAA5'
  let g:terminal_color_12 = '#FFE9C5'
  let g:terminal_color_13 = '#FFA88C'
  let g:terminal_color_14 = '#B3779B'
  let g:terminal_color_15 = '#FFFFFF'
endif

if has('terminal')
  let g:terminal_ansi_colors = [
      \ '#33302B', '#AA8D67', '#6A8D73', '#B3A08B',
      \ '#EBCFAB', '#FF8E72', '#995D81', '#F2EAE1',
      \ '#6272A4', '#C4A781', '#84A78D', '#CDBAA5',
      \ '#FFE9C5', '#FFA88C', '#B3779B', '#FFFFFF'
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

call s:h('TranquilityFg', s:fg)
call s:h('TranquilityFgUnderline', s:fg, s:none, [s:attrs.underline])
call s:h('TranquilityFgBold', s:fg, s:none, [s:attrs.bold])

call s:h('TranquilityComment', s:comment)
call s:h('TranquilityCommentBold', s:comment, s:none, [s:attrs.bold])

call s:h('TranquilitySelection', s:none, s:selection)

call s:h('TranquilitySubtle', s:subtle)

call s:h('TranquilityPurple', s:purple)
call s:h('TranquilityPurpleItalic', s:purple, s:none, [s:attrs.italic])

call s:h('TranquilityGreen', s:green)
call s:h('TranquilityOrange', s:orange)
call s:h('TranquilityOrangeBold', s:orange, s:none, [s:attrs.bold])
call s:h('TranquilityOrangeItalic', s:orange, s:none, [s:attrs.italic])
call s:h('TranquilityOrangeItalicUnderline', s:orange, s:none, [s:attrs.italic, s:attrs.underline])

call s:h('TranquilityLightBrown', s:lightbrown)
call s:h('TranquilityLightBrownBold', s:lightbrown, s:none, [s:attrs.bold])
call s:h('TranquilityLightBrownItalic', s:lightbrown, s:none, [s:attrs.italic])
call s:h('TranquilityLightBrownBoldItalic', s:lightbrown, s:none, [s:attrs.bold, s:attrs.italic])
call s:h('TranquilityLightBrownInverse', s:bg, s:lightbrown)

call s:h('TranquilityRed', s:red)
call s:h('TranquilityRedItalic', s:red, s:none, [s:attrs.italic])

call s:h('TranquilityBeige', s:beige)
call s:h('TranquilityBeigeBold', s:beige, s:none, [s:attrs.bold])
call s:h('TranquilityBeigeItalic', s:beige, s:none, [s:attrs.italic])

call s:h('TranquilityDarkBrown', s:darkbrown)
call s:h('TranquilityDarkBrownInverse', s:fg, s:darkbrown)

call s:h('TranquilityLightGray', s:lightgray)
call s:h('TranquilityLightGrayItalic', s:lightgray, s:none, [s:attrs.italic])

call s:h('TranquilityError', s:red, s:none, [], s:red)

call s:h('TranquilityErrorLine', s:none, s:none, [s:attrs.undercurl], s:red)
call s:h('TranquilityWarnLine', s:none, s:none, [s:attrs.undercurl], s:lightbrown)
call s:h('TranquilityInfoLine', s:none, s:none, [s:attrs.undercurl], s:purple)

call s:h('TranquilityTodo', s:purple, s:none, [s:attrs.bold, s:attrs.inverse])
call s:h('TranquilitySearch', s:orange, s:none, [s:attrs.inverse])
call s:h('TranquilityBoundary', s:comment, s:bglight)
call s:h('TranquilityLink', s:purple, s:none, [s:attrs.underline])

call s:h('TranquilityDiffChange', s:lightbrown, s:none)
call s:h('TranquilityDiffText', s:bg, s:lightbrown)
call s:h('TranquilityDiffDelete', s:red, s:bglight)
call s:h('TranquilityDiffAdd', s:green, s:bglight)

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
call s:h('WildMenu', s:bg, s:beige, [s:attrs.bold])
call s:h('CursorLine', s:none, s:subtle)

hi! link ColorColumn  TranquilityBgLight
hi! link CursorColumn TranquilityBgLight
hi! link CursorLineNr TranquilityLightGray
hi! link DiffAdd      TranquilityDifAdd
hi! link DiffAdded    DiffAdd
hi! link DiffChange   TranquilityDiffChange
hi! link DiffDelete   TranquilityDiffDelete
hi! link DiffRemoved  DiffDelete
hi! link DiffText     TranquilityDiffText
hi! link Directory    TranquilityBeigeBold
hi! link ErrorMsg     TranquilityDarkBrownInverse
hi! link FoldColumn   TranquilitySubtle
hi! link Folded       TranquilityBoundary
hi! link IncSearch    TranquilityLightBrownInverse
hi! link LineNr       TranquilityLightBrown
hi! link MoreMsg      TranquilityFgBold
hi! link NonText      TranquilitySubtle
hi! link Pmenu        TranquilityBgLight
hi! link PmenuSbar    TranquilityBgLight
hi! link PmenuSel     TranquilitySelection
hi! link PmenuThumb   TranquilitySelection
hi! link Question     TranquilityFgBold
hi! link Search       TranquilitySearch
hi! link SignColumn   TranquilityComment
hi! link TabLine      TranquilityBoundary
hi! link TabLineFill  TranquilityBgLighter
hi! link TabLineSel   Normal
hi! link Title        TranquilityOrangeBold
hi! link VertSplit    TranquilityBoundary
hi! link Visual       TranquilitySelection
hi! link VisualNOS    Visual
hi! link WarningMsg   TranquilityLightBrownInverse

" }}}
" Syntax: {{{

" Required as some plugins will overwrite
call s:h('MatchParen', s:orange, s:none, [s:attrs.underline])
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

hi! link Constant TranquilityBeige
hi! link String TranquilityLightGray
hi! link Character TranquilityRed
hi! link Number Constant
hi! link Boolean Constant
hi! link Float Constant

hi! link Identifier TranquilityFg
hi! link Function TranquilityOrange

hi! link Statement TranquilityRed
hi! link Conditional TranquilityRed
hi! link Repeat TranquilityRed
hi! link Label TranquilityRed
hi! link Operator TranquilityRed
hi! link Keyword TranquilityRed
hi! link Exception TranquilityRed

hi! link PreProc TranquilityRed
hi! link Include TranquilityRed
hi! link Define TranquilityRed
hi! link Macro TranquilityRed
hi! link PreCondit TranquilityRed
hi! link StorageClass TranquilityRed
hi! link Structure TranquilityRed
hi! link Typedef TranquilityRed

hi! link Type TranquilityPurpleItalic

hi! link Delimiter TranquilityFg

hi! link Special TranquilityRed
hi! link SpecialComment TranquilityPurpleItalic
hi! link Tag TranquilityPurple
hi! link helpHyperTextJump TranquilityLink
hi! link helpCommand TranquilityBeige
hi! link helpExample TranquilityOrange
hi! link helpBacktick Special

"}}}

" vim: fdm=marker ts=2 sts=2 sw=2:
