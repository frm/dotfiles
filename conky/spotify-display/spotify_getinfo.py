#!/usr/bin/python

import dbus
import os

bus = dbus.SessionBus()
player = bus.get_object('com.spotify.qt', '/')
iface = dbus.Interface(player, 'org.freedesktop.MediaPlayer2')
info = iface.GetMetadata()

def perfect_length(str):
	if len(str) > 16:
		return str[:14] + '...'
	else:
		return str

# OUT: [dbus.String(u'xesam:album'), dbus.String(u'xesam:title'), dbus.String(u'xesam:trackNumber'), dbus.String(u'xesam:artist'), dbus.String(u'xesam:discNumber'), dbus.String(u'mpris:trackid'), dbus.String(u'mpris:length'), dbus.String(u'mpris:artUrl'), dbus.String(u'xesam:autoRating'), dbus.String(u'xesam:contentCreated'), dbus.String(u'xesam:url')]
playing_song = str(info['xesam:title'])
playing_artist = str(info['xesam:artist'][0])
playing_album = str(info['xesam:album'])

print(playing_artist + "\n${goto 100}" + playing_album + "\n${goto 100}" + playing_song)
#print(perfect_length(playing_artist) + "\n${goto 100}" + perfect_length(playing_song))

fstored_album = open(os.getenv('HOME') + '/.conky/spotify-display/stored_album.txt', 'r')
stored_album = fstored_album.readline().strip('\n')
fstored_album.close()

if playing_album != stored_album:
	# New cover needs to be downloaded
	os.system("wget -O $HOME/.conky/spotify-display/latest.jpg \"http://interactiveplaylist.com/ipfam?album=" + playing_album + "&artist=" + playing_artist + "\"")
	# If you'd like download a cover 174x174 instead of 64x64 use this one instead:
	# os.system("wget -O $HOME/.conky/spotify-display/latest.jpg \"http://interactiveplaylist.com/ipfal?album=" + playing_album + "&artist=" + playing_artist + "\"")

	# Update current_song.txt using bash
	os.system("echo \"" + playing_album + "\" > $HOME/.conky/spotify-display/stored_album.txt")