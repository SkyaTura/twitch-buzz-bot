import { Database } from "bun:sqlite";
import { Telegraf } from 'telegraf'
import fs from 'node:fs'
import { ChatClient, PrivmsgMessage } from "@kararty/dank-twitch-irc";

type TwitchEvent = (msg: PrivmsgMessage) => void

export class TwitchHandler {
  private client = new ChatClient()
  private channels = new Map<string, { key: string; filters: string[]; cb: TwitchEvent }[]>()

  constructor() {
    this.client.on("close", (error) => {
      if (error != null) {
        console.error("Client closed due to error", error);
      }
    });
    this.client.on("ready", () => console.log("Successfully connected to chat"));
    this.client.on("PRIVMSG", (msg) => this.handle(msg))
    this.client.connect()
  }

  private handle(msg: PrivmsgMessage) {
    const channel = msg.channelName
    const handlers = this.channels.get(channel)
    const text = msg.messageText.toLowerCase()
    if (!handlers?.length) return
    handlers.forEach(({ filters, cb }) => {
      if (filters.some((f) => text.includes(f.toLowerCase()))) cb(msg)
    })
  }
  private join(channel: string) {
    this.client.join(channel)
  }
  private leave(channel: string) {
    this.client.part(channel)
    this.channels.delete(channel)
  }
  private _subscribe(channel: string, key: string, filters: string[], cb: TwitchEvent) {
    if (!this.channels.has(channel)) {
      this.join(channel)
      this.channels.set(channel, [])
    }
    const item = { filters, cb }
    this.channels.get(channel)!.push({ key, filters, cb })
  }
  subscribe(channels: string | string[], key: string, filters: string[], cb: TwitchEvent) {
    if (typeof channels === 'string') {
      channels = [channels]
    }
    channels.forEach((channel) => {
      this._subscribe(channel, key, filters, cb)
    })
  }
  private _unsubscribe(channel: string, key: string) {
    const handlers = this.channels.get(channel)
    if (!handlers?.length) return
    const newHandlers = handlers.filter((h) => h.key !== key)
    if (!newHandlers.length) {
      this.leave(channel)
    } else {
      this.channels.set(channel, newHandlers)
    }
  }
  unsubscribe(channels: string | string[], key: string) {
    if (typeof channels === 'string') {
      channels = [channels]
    }
    channels.forEach((channel) => {
      this._unsubscribe(channel, key)
    })
  }
}

const main = async () => {
  const twitch = new TwitchHandler()
  const telegram = new Telegraf(process.env.TELEGRAM_TOKEN!)
  fs.mkdirSync('db', { recursive: true })
  const db = new Database('db/db.sqlite')
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY,
      chat_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      filters TEXT NOT NULL
    )
  `)
  const handle = (chatId: string) =>
    (msg: PrivmsgMessage) =>
      telegram.telegram.sendMessage(parseInt(chatId, 10), `${msg.displayName} just sent a message at twitch.tv/${msg.channelName} that matches one of your filters:\n\n${msg.messageText}`)
  db.query('SELECT * FROM subscriptions').all().forEach((row: any) =>
    twitch.subscribe(row.channel, row.chat_id, row.filters.split(','), handle(row.chat_id))
  )
  const unsubscribe = (chatId: string, channel: string) => {
    if (!channel.length) return
    db.prepare('DELETE FROM subscriptions WHERE chat_id = ? AND channel = ?').run(chatId, channel)
    twitch.unsubscribe(channel, chatId)
  }
  const subscribe = (chatId: string, channel: string, filters: string[]) => {
    if (!filters.length) return
    db.prepare('INSERT INTO subscriptions (chat_id, channel, filters) VALUES (?, ?, ?)').run(chatId, channel, filters.join(','))
    twitch.subscribe(channel, chatId, filters, handle(chatId))
  }
  telegram.command('unsubscribe', (ctx) => {
    const chatId = ctx.chat.id.toString()
    const channel = ctx.message.text.split(' ')[1]
    if (!channel.length) {
      ctx.reply('Please specify a channel to unsubscribe from.')
      return
    }
    unsubscribe(chatId, channel)
    ctx.reply(`Unsubscribed from ${ctx.message.text.split(' ')[1]}`)
  })
  telegram.command('subscribe', (ctx) => {
    const chatId = ctx.chat.id.toString()
    const [_, channel, ...rest] = ctx.message.text.split(' ')
    if (!channel?.length) {
      ctx.reply('Please specify a channel to subscribe to.')
      return
    }
    const filters = rest.join(' ').split(',').map((f) => f.trim()).filter(Boolean)
    if (!filters.length) {
      ctx.reply('Please specify at least one filter.')
      return
    }
    unsubscribe(chatId, channel)
    subscribe(chatId, channel, filters)
    ctx.reply(`Subscribed to ${channel} with filters:\n${filters.map(f => `- ${f}`).join(`\n`)}`)
  })
  telegram.command('list', (ctx) => {
    const chatId = ctx.chat.id.toString()
    const rows = db.prepare('SELECT * FROM subscriptions WHERE chat_id = ?').all(chatId)
    if (!rows.length) {
      ctx.reply('You have no subscriptions.\nAdd one using /subscribe <channel> <filters>')
      return
    }
    const channels = rows.map((row: any) => `twitch.tv/${row.channel}: ${row.filters.split(',').join(', ')}`).join('\n')
    ctx.reply(`Your subscriptions:\n${channels}\n\nRemove one using /unsubscribe <channel>`)
  })
  telegram.command('help', (ctx) => {
    ctx.reply('Commands available:\n/list\n/subscribe <channel> <filters>\n/unsubscribe <channel>\n\nFilters are comma separated and case insensitive.')
  })
  telegram.command('start', (ctx) => {
    ctx.reply('Welcome to TwitchBuzzBot!\n\nCommands available:\n/list\n/subscribe <channel> <filters>\n/unsubscribe <channel>\n\nFilters are comma separated and case insensitive.')
  })
  telegram.telegram.setMyCommands([
    { command: 'list', description: 'List your subscriptions' },
    { command: 'subscribe', description: 'Subscribe to a channel' },
    { command: 'unsubscribe', description: 'Unsubscribe from a channel' },
    { command: 'help', description: 'Show this help message' },
  ])
  telegram.launch()
}

main()
