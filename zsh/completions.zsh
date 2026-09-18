# Ensure Homebrew's zsh function directory is available. The shell's built-in
# fpath can point at an old Cellar version after zsh upgrades, which breaks
# autoloaded functions like compinit/_main_complete.
fpath=(
  "$(brew --prefix)/share/zsh/functions"
  "$(brew --prefix)/share/zsh/site-functions"
  "$(brew --prefix)/share/zsh-completions"
  $fpath
)

# Homebrew leaves its share dirs group-writable, which compaudit rejects
for dir in \
  "$(brew --prefix)/share" \
  "$(brew --prefix)/share/zsh" \
  "$(brew --prefix)/share/zsh/functions" \
  "$(brew --prefix)/share/zsh/site-functions" \
  "$(brew --prefix)/share/zsh-completions"; do
  [[ -d $dir && -w $dir ]] && chmod g-w,o-w "$dir" 2>/dev/null
done
unset dir

autoload -Uz compinit

# Smarter compinit load
if [[ ! -f ~/.zcompdump || "$(date +'%j')" != "$(/usr/bin/stat -f '%Sm' -t '%j' ~/.zcompdump 2>/dev/null)" ]]; then
  compinit
else
  compinit -C
fi

# Tab completion from both ends
setopt completeinword

# Case-insensitive tab completion
zstyle ':completion:*' matcher-list 'm:{a-zA-Z-_}={A-Za-z_-}' 'r:|=*' 'l:|=* r:|=*'

setopt nocasematch

# pasting with tabs doesn't perform completion
zstyle ':completion:*' insert-tab pending

# Use menu selection instead of tab cycle
zstyle ':completion:*:*:*:*:*' menu select

# list-colors when completing
zstyle ':completion:*' list-colors "${(@s.:.)LS_COLORS}"
zstyle ':completion:*:*:kill:*:processes' list-colors '=(#b) #([0-9]#) ([0-9a-z-]#)*=01;34=0=01'
