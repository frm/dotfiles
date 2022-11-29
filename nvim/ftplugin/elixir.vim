let g:alchemist_iex_term_size = 15
let g:alchemist_iex_term_split = 'split'

map <localleader>d orequire IEx; IEx.pry<ESC>:w<CR>
map <localleader>D Orequire IEx; IEx.pry<ESC>:w<CR>
map <localleader>t <Esc>:IEx<CR>


function! AddUmbrellaProjections()
  let l:apps = split(globpath('apps', '*'), '\n')

  if filereadable("mix.exs") && isdirectory("apps")
    let l:projections = {}

    for l:app in l:apps
      let l:projections[l:app . '/lib/*.ex'] = {
            \ "skeleton": "mod",
            \ "alternate": l:app . "/test/{}_test.exs"
            \ }

      let l:projections[l:app . '/test/*_test.exs'] = {
            \ "skeleton": "mod",
            \ "alternate": l:app . "/lib/{}.ex"
            \ }
    endfor

    call projectionist#append(getcwd(), l:projections)
  endif
endfunction

function! GenerateProjectionsJSON()
  let l:apps=split(globpath('apps', '*'), '\n')

  if filereadable("mix.exs") && isdirectory("apps")
    let l:projections = []

    for l:app in l:apps
      let l:entry = '"' . l:app . '/lib/*.ex": {
            \  "skeleton": "mod",
            \  "alternate": "' . l:app . '/test/{}_test.exs"
            \}'

      call add(l:projections, l:entry)

      let l:entry = '"' . l:app . '/test/*_.exs": {
            \  "skeleton": "mod",
            \  "alternate": "' . l:app . '/lib/{}.ex"
            \}'
    endfor

    let l:projections = '{' . join(l:projections, ",") . '}'

    call writefile([l:projections], ".projections.json", "b")
  endif
endfunction

autocmd User ProjectionistDetect
\ call projectionist#append(getcwd(),
\ {
\    'lib/*.ex':  {
\       'skeleton': 'mod',
\       'alternate': 'test/{}_test.exs'
\    },
\    'test/*_test.exs':  {
\      'alternate': 'lib/{}.ex',
\      'skeleton': 'case'
\     },
\ })

autocmd User ProjectionistDetect
\ call AddUmbrellaProjections()
