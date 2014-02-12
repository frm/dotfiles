#MB_DIR = My Bash Directory
export MB_DIR="$HOME/local/bash"

# Loading execs from ~/local/bin
export PATH="$HOME/local/bin:${PATH}"

# Loading personal commands
source $MB_DIR/aliases
source $MB_DIR/cmds
source $MB_DIR/editor

# Loading interactive environment
source $MB_DIR/git-prompt.sh
source $MB_DIR/i_env