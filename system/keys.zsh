# emacs keybindings
bindkey -e

# Fix backward-kill-word:
# http://stackoverflow.com/questions/19202521/deleting-word-like-bash-in-zsh-autoload-is-not-working
x-bash-backward-kill-word(){
    WORDCHARS='' zle backward-kill-word
}
zle -N x-bash-backward-kill-word
bindkey '^W' x-bash-backward-kill-word

x-backward-kill-word(){
    WORDCHARS='*?_-[]~\!#$%^(){}<>|`@#$%^*()+:?' zle backward-kill-word
}

zle -N x-backward-kill-word
bindkey '\e^?' x-backward-kill-word

# Fix Fn + Backspace on macOS
# See: http://superuser.com/questions/169920/binding-fn-delete-in-zsh-on-mac-os-x
bindkey "^[[3~" delete-char

# https://bbs.archlinux.org/viewtopic.php?pid=201976#p201976
autoload zkbd

[[ ! -f ${ZDOTDIR:-$HOME}/.zkbd/$TERM-$VENDOR-$OSTYPE ]] && zkbd
source ${ZDOTDIR:-$HOME}/.zkbd/$TERM-$VENDOR-$OSTYPE

[[ -n ${key[Backspace]} ]] && bindkey "${key[Backspace]}" backward-delete-char
[[ -n ${key[Insert]} ]] && bindkey "${key[Insert]}" overwrite-mode
[[ -n ${key[Home]} ]] && bindkey "${key[Home]}" beginning-of-line
[[ -n ${key[PageUp]} ]] && bindkey "${key[PageUp]}" up-line-or-history
[[ -n ${key[Delete]} ]] && bindkey "${key[Delete]}" delete-char
[[ -n ${key[End]} ]] && bindkey "${key[End]}" end-of-line
[[ -n ${key[PageDown]} ]] && bindkey "${key[PageDown]}" down-line-or-history
[[ -n ${key[Up]} ]] && bindkey "${key[Up]}" up-line-or-search
[[ -n ${key[Left]} ]] && bindkey "${key[Left]}" backward-char
[[ -n ${key[Down]} ]] && bindkey "${key[Down]}" down-line-or-search
[[ -n ${key[Right]} ]] && bindkey "${key[Right]}" forward-char
