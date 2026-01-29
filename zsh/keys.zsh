bindkey -e

# Ctrl+W / Ctrl+H: bash-style backward kill word (stop at every separator)
x-bash-backward-kill-word() {
  WORDCHARS='' zle backward-kill-word
}
zle -N x-bash-backward-kill-word
bindkey '^W' x-bash-backward-kill-word
bindkey '^H' x-bash-backward-kill-word

# Alt+Backspace: backward kill word (treat special chars as part of word)
x-backward-kill-word() {
  WORDCHARS='*?_-[]~\!#$%^(){}<>|`@#$%^*()+:?' zle backward-kill-word
}
zle -N x-backward-kill-word
bindkey '\e^?' x-backward-kill-word

# Navigation
bindkey '^[[H'    beginning-of-line        # Home (xterm)
bindkey '^[[1~'   beginning-of-line        # Home (tmux)
bindkey '^[[F'    end-of-line              # End (xterm)
bindkey '^[[4~'   end-of-line              # End (tmux)
bindkey '^[[3~'   delete-char              # Delete
bindkey '^[[5~'   up-line-or-history       # PageUp
bindkey '^[[6~'   down-line-or-history     # PageDown
bindkey '^[[1;5C' forward-word             # Ctrl+Right
bindkey '^[[1;5D' backward-word            # Ctrl+Left
bindkey '^[[Z'    reverse-menu-complete    # Shift+Tab

# Shift+Enter: insert newline without executing
x-insert-newline() { LBUFFER+=$'\n' }
zle -N x-insert-newline
bindkey '^[[13;2u' x-insert-newline

# Prefix history search with Up/Down arrows
autoload -U up-line-or-beginning-search down-line-or-beginning-search
zle -N up-line-or-beginning-search
zle -N down-line-or-beginning-search
bindkey '^[[A' up-line-or-beginning-search
bindkey '^[[B' down-line-or-beginning-search

# History expansion on Space
bindkey ' ' magic-space

# Edit command line in $EDITOR with Ctrl+X Ctrl+E
autoload -U edit-command-line
zle -N edit-command-line
bindkey '\C-x\C-e' edit-command-line
