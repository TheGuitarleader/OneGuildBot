# CHANGELOG

## v0.7.0 / 2022-03-10

Major changes:
- Overhaulled live post system. New system is now more efficent
- New `announce` command. Say something as the bot.
- New `rolldice` command. Roll some dice with your friends!

Minor changes:
- Changed formating for errors and changelog.

Bug Fixes:
- Fixed Twitch double posting live updates (#4)
- Fixed bug where events would stay after stream ended. (#6)
- Fixed issue not updating event titles to with the stream.
- Fixed internal issue where ids would not match.

## v0.6.0 / 2022-03-07

Major changes:
- Overhauled the entire logging framework to help find breaking issues.
- New 'changelog' command. View whats changed with the bot. (#5)
- Changed command 'vips' -> 'vip-list'

Minor changes:
- Increased Twitch update refresh from 30s -> 60s.
- Changed the way the Tweeter logs received tweets.
- Ping command now shows Twitch API response time. (Shown as ':microphone2:')

Bug Fixes:
- Fixed issue where bot would not add server boosters. (#10)
