#
# ~/.bash_profile
#

[[ -f ~/.bashrc ]] && . ~/.bashrc
[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && exec startx

if [ -e /usr/share/terminfo/x/xterm-256color ]; then
		export TERM='xterm-256color'
	else
		export TERM='xterm-color'
fi


if [ -f ~/.git-completion.bash ]; then
	.  ~/.git-completion.bash
fi

[[ -s "$HOME/.rvm/scripts/rvm" ]] && source "$HOME/.rvm/scripts/rvm" # Load RVM into a shell session *as a function*
