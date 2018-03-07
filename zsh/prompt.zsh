# LS_COLORS with no bold
export LS_COLORS="rs=0:di=34:ln=36:mh=00:pi=33:so=35:do=35:bd=33;01:cd=33;01:or=31;01:su=41:sg=43:ca=41:tw=42:ow=42:st=44:ex=32:*.tar=31:*.tgz=31:*.arj=31:*.taz=31:*.lzh=31:*.lzma=31:*.tlz=31:*.txz=31:*.zip=31:*.z=31:*.Z=31:*.dz=31:*.gz=31:*.lz=31:*.xz=31:*.bz2=31:*.bz=31:*.tbz=31:*.tbz2=31:*.tz=31:*.deb=31:*.rpm=31:*.jar=31:*.war=31:*.ear=31:*.sar=31:*.rar=31:*.ace=31:*.zoo=31:*.cpio=31:*.7z=31:*.rz=31:*.jpg=35:*.jpeg=35:*.gif=35:*.bmp=35:*.pbm=35:*.pgm=35:*.ppm=35:*.tga=35:*.xbm=35:*.xpm=35:*.tif=35:*.tiff=35:*.png=35:*.svg=35:*.svgz=35:*.mng=35:*.pcx=35:*.mov=35:*.mpg=35:*.mpeg=35:*.m2v=35:*.mkv=35:*.webm=35:*.ogm=35:*.mp4=35:*.m4v=35:*.mp4v=35:*.vob=35:*.qt=35:*.nuv=35:*.wmv=35:*.asf=35:*.rm=35:*.rmvb=35:*.flc=35:*.avi=35:*.fli=35:*.flv=35:*.gl=35:*.dl=35:*.xcf=35:*.xwd=35:*.yuv=35:*.cgm=35:*.emf=35:*.axv=35:*.anx=35:*.ogv=35:*.ogx=35:*.aac=36:*.au=36:*.flac=36:*.mid=36:*.midi=36:*.mka=36:*.mp3=36:*.mpc=36:*.ogg=36:*.ra=36:*.wav=36:*.axa=36:*.oga=36:*.spx=36:*.xspf=36:"

# Customize geometry
GEOMETRY_COLOR_GIT_DIRTY=9
GEOMETRY_COLOR_GIT_BRANCH=6
GEOMETRY_COLOR_EXIT_VALUE=9
GEOMETRY_COLOR_DIR=242
GEOMETRY_COLOR_PROMPT=6
GEOMETRY_SYMBOL_EXIT_VALUE="λ"
GEOMETRY_SYMBOL_PROMPT="λ"
GEOMETRY_PROMPT_PATH="%2~"
GEOMETRY_SYMBOL_GIT_DIRTY="●"
GEOMETRY_SYMBOL_GIT_CLEAN="●"
PROMPT_GEOMETRY_GIT_SHOW_STASHES=false
GEOMETRY_PROMPT_PLUGINS_PRIMARY=(path)
GEOMETRY_PROMPT_PLUGINS_SECONDARY=(git)
PROMPT_GEOMETRY_GIT_CONFLICTS=true

GEOMETRY_ENV="development"
source $HOME/Developer/geometry/$GEOMETRY_ENV/geometry.zsh

BREW_ZSH_HIGHLIGHTERS=/usr/local/share/zsh-syntax-highlighting/
source $BREW_ZSH_HIGHLIGHTERS/zsh-syntax-highlighting.zsh
