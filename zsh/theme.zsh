autoload -U add-zsh-hook
add-zsh-hook precmd prompt_render

prompt_render() {
  PROMPT="%F{239}%2~%f "
}
