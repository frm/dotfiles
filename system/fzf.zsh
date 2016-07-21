# fzf config
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# fzf search
export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git --ignore "*.png" --ignore "*.jpg" -g ""'
