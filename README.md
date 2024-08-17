## blacket-tui
A custom terminal user interface for [Blacket](https://blacket.org) (a custom Blooket private server) that extends the default functionality of the website.

## Requirements
- [Bun](https://bun.sh/)
- A terminal that supports 24-bit color (most modern terminals do)

## Usage
- Clone the repository
- Execute `bun i` to install the dependencies
- Execute `bun run start`

All menus are navigated with the keyboard. Use the arrow keys to navigate up and down in menus, pressing enter to confirm a selection. Most menus can be escaped by pressing the escape key or providing an empty input.

## Features
- Multiple accounts
- Supports 2FA
- Using proxies
- Registering new accounts
- Viewing other players' stats
- Claiming daily rewards
- Viewing leaderboard
- Viewing blooks within packs
- Opening packs (manual & auto)
  - Advanced configuration for auto opening
- Buying shop and weekly items
- View blooks by different categories:
  - All obtained (& by pack)
  - All missing (& by pack)
  - All blooks
- Sell and list blooks on the bazaar
- Bazaar
  - Manage your own listings
  - Search for missing blooks
  - Search for listings by blook
  - Search for listings by user
- Inventory
  - Using items
  - Listing items
- Running custom scripts