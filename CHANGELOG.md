# CHANGELOG

## v0.10.0 / 2022-10-24

Major changes:
- New nowlive command. See who is all currently live in the OneGuild.

Minor changes:
- New going live message sending system.
- Backed up source code to private server.

Bug fixes:
- Twitter API returning undefined when attempting to forward tweets. (#31)
- Stream titles over 100 characters not displaying as guild events. (#16)

## v0.9.0 / 2022-04-14

Major changes:
- New debug mode. Helps debug new features and cleans garbage out of logs.
- `stats` now has parameters, `message` shows message stats (Old) and `channel` shows the stats of each channel.
- `stats` is also now locked to only admins.

Minor changes:
- Changed embed formats for some admin commands.
- Fixed issues with live post cooldowns.

## v0.8.0 / 2022-03-22

Major changes:
- VIP threshold now dynamically changes based off previous values. Making it easier to hit VIP.
- New `stats` command for admins. Shows server performance.
- `announce` command is now `embed`. Added more customization features.
- New `giveaway` command for admins. Picks random user that meets a 'active' requirement.

Minor changes:
- Changed function params to make future updates easier.
- Made dice game more like Yahtzee.
- Added leaderboard to the dice game.
- Increased live post cooldown from 2 hours -> 4 hours.

## v0.7.0 / 2022-03-10

Major changes:
- Overhauled live post system. New system is now more efficient
- New `announce` command. Say something as the bot.  (Use a semicolon `;` to add a line break.)
- New `rolldice` command. Roll some dice with your friends!

Minor changes:
- Changed formatting for errors and changelog.
- Now removes remove member from database when they leave the server.

Bug Fixes:
- Fixed Twitch double posting live updates (#4)
- Fixed bug where events would stay after stream ended. (#6)
- Fixed issue not updating event titles to with the stream.
- Fixed internal issue where ids would not match.

## v0.6.0 / 2022-03-07

Major changes:
- Overhauled the entire logging framework to help find breaking issues.
- New 'changelog' command. View whats changed with the bot. (#5)
- Changed command `vips` -> `vip-list`

Minor changes:
- Increased Twitch update refresh from 30s -> 60s.
- Changed the way the Tweeter logs received tweets.
- Ping command now shows Twitch API response time. (Shown as ':microphone2:')

Bug Fixes:
- Fixed issue where bot would not add server boosters. (#10)
