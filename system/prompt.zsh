# ls colors
export CLICOLOR=1
export LSCOLORS="ExFxCxDxBxegedabagacad"

# Enable prompt themes
setopt PROMPT_SUBST

autoload -U colors && colors
autoload -U promptinit
autoload -Uz compinit && compinit

# Use base16
BASE16_SCHEME="tomorrow-night"
BASE16_SHELL="$HOME/.config/base16-shell/scripts/base16-$BASE16_SCHEME.sh"
[[ -s $BASE16_SHELL ]] && . $BASE16_SHELL

# Customize geometry
GEOMETRY_COLOR_GIT_DIRTY=9
GEOMETRY_COLOR_GIT_BRANCH=6
GEOMETRY_COLOR_EXIT_VALUE=9
GEOMETRY_COLOR_DIR=242
GEOMETRY_SYMBOL_EXIT_VALUE="▲"
