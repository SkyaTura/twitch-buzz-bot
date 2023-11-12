FROM oven/bun:1.0.4

WORKDIR /app

COPY ./package.json ./
COPY ./bun.lockb ./

RUN bun install

COPY ./ ./

RUN bun run compile

FROM oven/bun:1.0.4-alpine

WORKDIR /app

COPY --from=0 /app/twitch-buzz-bot ./

RUN chmod +x twitch-buzz-bot

CMD ["/app/twitch-buzz-bot"]
