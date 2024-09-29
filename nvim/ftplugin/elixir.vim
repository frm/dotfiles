map <localleader>d orequire IEx; IEx.pry<ESC>:w<CR>
map <localleader>D Orequire IEx; IEx.pry<ESC>:w<CR>

function! AddUmbrellaProjections()
  let l:apps = split(globpath('apps', '*'), '\n')

  if filereadable("mix.exs") && isdirectory("apps")
    let l:projections = {}

    for l:app in l:apps
      let l:projections[l:app . '/lib/*.ex'] = {
            \ "skeleton": "defm",
            \ "alternate": l:app . "/test/{}_test.exs"
            \ }

      let l:projections[l:app . '/test/*_test.exs'] = {
            \ "skeleton": "deft",
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
            \  "skeleton": "defm",
            \  "alternate": "' . l:app . '/test/{}_test.exs"
            \}'

      call add(l:projections, l:entry)

      let l:entry = '"' . l:app . '/test/*_.exs": {
            \  "skeleton": "deft",
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
\       'skeleton': 'defm',
\       'alternate': 'test/{}_test.exs'
\    },
\    'test/*_test.exs':  {
\      'alternate': 'lib/{}.ex',
\      'skeleton': 'deft'
\     },
\ })

autocmd User ProjectionistDetect
\ call AddUmbrellaProjections()
