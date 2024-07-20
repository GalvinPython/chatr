# Chatr
A free and open-sourced Discord XP Bot.  
![Bot](https://img.shields.io/badge/Invite%20Chatr-5865F2?style=for-the-badge&logo=discord&logoColor=white)  
![Discord](https://img.shields.io/discord/1249813817706283019?style=for-the-badge&logo=discord&logoColor=white&label=Support%20Server&color=%235865F2)

Please report bugs in `bug-reports` on our server or open an issue on this repo!

# Features
- Earn XP from your messages!
- Customisable xp cooldown on messages
- Online leaderboard
- Rankcard
- Transfer your points from other bots!
  - MEE6
  - Polaris
  - Lurkr
  - Other bots soon

> [!WARNING]
> **Chatr** has entered Beta! (don't worry, we will deal with the headaches for you)

# Developer Instructions

This a project created using (Bun)[https://bun.sh]

To install dependencies:

```bash
bun install
```

Run the **API**
```bash
bun run dev:api
```  
Run the **Bot** 
```bash
bun run dev:bot
```


# Changelog
## Beta 0.1
Thanks to @ToastedDev for his contributions to the bot. Here are some changes that were made
* General formatting fixes (#8)
* Refactored the database to be more performant (#13)
* Added a message cooldown (#14)
* Added a rankcard to /xp (#17)
* User management (#19)
* Added syncing (#24)
### Patches
#### Beta 0.1.1
* Fixed wrong data being shown on the leaderboard

# Roadmap
* Rewritten site using NextJS
* Auto-updating cached user information
* Better privacy controls
* Live updates
* Track guilds and users xp


Want to add more features? Join our server (linked above) and add a post to `feature-requests`
