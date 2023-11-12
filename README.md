# Twitch Buzz Bot

## Introduction
The Twitch Buzz Bot is a unique tool built with the Bun runtime, designed to send alerts to users' Telegram accounts based on specific filters set for Twitch channel chats. This bot is an invaluable resource for staying informed about specific topics or keywords in Twitch chats.

## Prerequisites
- [Bun Runtime](https://bun.sh/)
- A Telegram bot token. [Learn how to create a Telegram bot and obtain the token](https://core.telegram.org/bots#3-how-do-i-create-a-bot).

## Installation
1. Clone the repository: `git clone https://github.com/SkyaTura/twitch-buzz-bot`
2. Navigate to the project directory: `cd twitch-buzz-bot`
3. Install dependencies: `bun install`
4. Create a `.env` file in the project root with the following content:

   ```
   TELEGRAM_TOKEN=your_telegram_bot_token_here
   ```

   Replace `your_telegram_bot_token_here` with your actual Telegram bot token.

## Usage
- Set up your desired filters for Twitch channel chats.
- Run the bot in development mode: `bun dev`
- Compile the project if needed: `bun compile`
- Start the application: `bun start`
- Get notified on Telegram when messages in Twitch chats match your filters.

## Telegram Bot
Find the Bot on Telegram at [TwitchBuzzBot.t.me](https://TwitchBuzzBot.t.me).

## Contributing
We encourage contributions to the Twitch Buzz Bot. Please adhere to the project's coding standards and submit pull requests for new features or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file in the GitHub repository for more details.