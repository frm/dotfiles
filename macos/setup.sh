# Blatantly stolen from: https://github.com/holman/dotfiles/blob/master/macos/set-defaults.sh
# Don't forget to pass the desired hostname as the first parameter

# Show ~/Library
chflags nohidden ~/Library

# Airdrop over any interface
defaults write com.apple.NetworkBrowser BrowseAllInterfaces 1

# Set key repeat
defaults write NSGlobalDomain KeyRepeat -int 0

# Set hostname
sudo scutil --set ComputerName "$1"
sudo scutil --set LocalHostName "$1"
sudo scutil --set HostName "$1"
dscacheutil -flushcache # Flushes the DNS cache to see hostname changes

# Remove that annoying login message
touch ~/.hushlogin

# Allow automatic text replacement
# &shrug; should equal ¯\_(ツ)_/¯ now
defaults write -g WebAutomaticTextReplacementEnabled -bool true
