# Win Tracker Discord Bot

## Overview
This is a Discord bot application for tracking gambling wins and statistics. The bot allows users to add their wins, view leaderboards, and see personal statistics through Discord slash commands.

## Current State
- **Language**: Node.js
- **Dependencies**: Discord.js v14, SQLite3
- **Database**: SQLite (wins.db)
- **Status**: Ready to run (requires Discord bot token configuration)

## Recent Changes
- 2025-09-25: Imported from GitHub and configured for Replit environment
- Updated configuration to use environment variables for Discord token
- Set up Discord Bot workflow with console output
- All dependencies installed and verified

## Project Architecture
- **Main file**: `index.js` - Contains bot logic, slash commands, and database operations
- **Database**: SQLite database (`wins.db`) with wins table for storing gambling results
- **Commands**: 
  - `/winadd` - Add a new win to the tracker
  - `/winlist` - Display wins leaderboard (with optional search)
  - `/wintop` - Show top multiplications
  - `/winuser` - Display user statistics
- **Workflow**: Discord Bot (npm start) - Runs the bot process

## Setup Requirements
To run this Discord bot, you need to:
1. Create a Discord application and bot at https://discord.com/developers/applications
2. Copy the bot token and add it as `DISCORD_TOKEN` in Replit secrets
3. Optionally set `DISCORD_CLIENT_ID` and `DISCORD_GUILD_ID` for specific server deployment
4. Invite the bot to your Discord server with appropriate permissions

## User Preferences
- None specified yet

## Features
- Track gambling wins with detailed statistics
- Calculate multiplications automatically
- Support for "max win" flagging
- User-specific statistics and leaderboards
- Formatted Discord embeds for better presentation
- SQLite database for persistent storage