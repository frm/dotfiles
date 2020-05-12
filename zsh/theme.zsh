# LS_COLORS with no bold
# export LS_COLORS="rs=0:di=34:ln=36:mh=00:pi=33:so=35:do=35:bd=33;01:cd=33;01:or=31;01:su=41:sg=43:ca=41:tw=42:ow=42:st=44:ex=32:*.tar=31:*.tgz=31:*.arj=31:*.taz=31:*.lzh=31:*.lzma=31:*.tlz=31:*.txz=31:*.zip=31:*.z=31:*.Z=31:*.dz=31:*.gz=31:*.lz=31:*.xz=31:*.bz2=31:*.bz=31:*.tbz=31:*.tbz2=31:*.tz=31:*.deb=31:*.rpm=31:*.jar=31:*.war=31:*.ear=31:*.sar=31:*.rar=31:*.ace=31:*.zoo=31:*.cpio=31:*.7z=31:*.rz=31:*.jpg=35:*.jpeg=35:*.gif=35:*.bmp=35:*.pbm=35:*.pgm=35:*.ppm=35:*.tga=35:*.xbm=35:*.xpm=35:*.tif=35:*.tiff=35:*.png=35:*.svg=35:*.svgz=35:*.mng=35:*.pcx=35:*.mov=35:*.mpg=35:*.mpeg=35:*.m2v=35:*.mkv=35:*.webm=35:*.ogm=35:*.mp4=35:*.m4v=35:*.mp4v=35:*.vob=35:*.qt=35:*.nuv=35:*.wmv=35:*.asf=35:*.rm=35:*.rmvb=35:*.flc=35:*.avi=35:*.fli=35:*.flv=35:*.gl=35:*.dl=35:*.xcf=35:*.xwd=35:*.yuv=35:*.cgm=35:*.emf=35:*.axv=35:*.anx=35:*.ogv=35:*.ogx=35:*.aac=36:*.au=36:*.flac=36:*.mid=36:*.midi=36:*.mka=36:*.mp3=36:*.mpc=36:*.ogg=36:*.ra=36:*.wav=36:*.axa=36:*.oga=36:*.spx=36:*.xspf=36:"

# BASE16_SHELL=$HOME/.config/base16-shell/
# [ -n "$PS1" ] && [ -s $BASE16_SHELL/profile_helper.sh ] && eval "$($BASE16_SHELL/profile_helper.sh)"

# Customize geometry

# geometry_prompt_path_render_override() {
#   local colorized_prompt_symbol="%$symbol_width{%(?.$GEOMETRY_PROMPT.$GEOMETRY_EXIT_VALUE)%}"
#   echo " \n$var_geometry_colorized_prompt_dir $colorized_prompt_symbol"
# }

# geometry_prompt_git_render_override() {
#   local git_stashes=$(git rev-parse --quiet --verify refs/stash 2>&1 > /dev/null && echo -e "$GEOMETRY_GIT_STASHES")
#   local git_prompt="$(prompt_geometry_git_branch) $(prompt_geometry_git_status) $(prompt_geometry_git_symbol) ${var_geometry_git_conflicts} ${git_stashes}"


#   echo -e $git_prompt \
#     | sed -e 's/^[[:space:]]*//' \
#     | sed -e 's/[[:space:]]*$//' \
#     | sed -e 's/[[:space:]][[:space:]]*/ /g'
# }

# git config
GEOMETRY_GIT_COLOR_DIRTY=1
GEOMETRY_GIT_COLOR_BRANCH=6
GEOMETRY_GIT_COLOR_STASHES=5
GEOMETRY_GIT_SYMBOL_DIRTY="⑇"
GEOMETRY_GIT_SYMBOL_CLEAN="⑉"
GEOMETRY_GIT_SYMBOL_CONFLICTS_SOLVED="⑉"
GEOMETRY_GIT_SYMBOL_CONFLICTS_UNSOLVED="⑆"
GEOMETRY_GIT_SYMBOL_STASHES="⑈"
GEOMETRY_GIT_SYMBOL_BARE="⑊"
GEOMETRY_GIT_SYMBOL_REBASE="\uE0A0"
GEOMETRY_GIT_SHOW_STASHES=true
GEOMETRY_GIT_SHOW_CONFLICTS=true

GEOMETRY_PATH_SYMBOL_HOME="%2~"
GEOMETRY_PATH_COLOR=242

GEOMETRY_STATUS_SYMBOL="\n|⇝"
GEOMETRY_STATUS_SYMBOL_ERROR="\n⑊"
GEOMETRY_STATUS_SYMBOL_ROOT="\n|⇏"
GEOMETRY_STATUS_SYMBOL_ROOT_ERROR="\n|⇏"
GEOMETRY_STATUS_COLOR=2
GEOMETRY_STATUS_COLOR_ERROR=9
GEOMETRY_STATUS_COLOR_ROOT=207
GEOMETRY_STATUS_COLOR_ROOT_ERROR=9

GEOMETRY_TIME_COLOR_LONG=1
GEOMETRY_TIME_COLOR_NEUTRAL=15
GEOMETRY_TIME_COLOR_SHORT=2

geometry_git_override() {
  local git_prompt="$(_branch) $(_status) $(_symbol) $(_conflicts) $(_stashes)"

  echo -e $git_prompt \
    | sed -e 's/^[[:space:]]*//' \
    | sed -e 's/[[:space:]]*$//' \
    | sed -e 's/[[:space:]][[:space:]]*/ /g'
}
#
# GEOMETRY_PROMPT_PLUGINS_PRIMARY=(path)
# GEOMETRY_PROMPT_PLUGINS_SECONDARY=(git)

# GEOMETRY_ENV="development"
# source $HOME/Developer/geometry/$GEOMETRY_ENV/geometry.zsh

GEOMETRY_ENV="jedahan"
source $HOME/Developer/geometry/$GEOMETRY_ENV/geometry.zsh

BREW_ZSH_HIGHLIGHTERS=/usr/local/share/zsh-syntax-highlighting/
source $BREW_ZSH_HIGHLIGHTERS/zsh-syntax-highlighting.zsh

# Change the iterm2 profile automatically
export MNDS_THEME_CHANGE_HOUR="18"
export MNDS_THEME="tranquility_eighties"

# if [ $(date +"%H") -lt $MNDS_THEME_CHANGE_HOUR ]; then
#   export MNDS_THEME="light"
# else
#   export MNDS_THEME="dark"
# fi

echo -e "\033]50;SetProfile=$MNDS_THEME\a"
