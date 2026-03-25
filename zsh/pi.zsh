# Pi popup keybindings
# Loaded only when PI_POPUP is set (terminal popups from pi layers)

# Ctrl+Z detaches instead of suspending
x-pi-popup-detach() { tmux detach-client }
zle -N x-pi-popup-detach
bindkey '^Z' x-pi-popup-detach
