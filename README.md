# companion-module-horinetech-keynote

A [Bitfocus Companion](https://bitfocus.io/companion) module for the
[Keynote Companion](https://github.com/horinezachary/horinetech-keynote-companion) Mac app.

It shows Keynote's slide number and presenter notes in Companion, turns `[LABEL]` tags in the
notes into cues Companion can react to, and lets Companion control the slideshow.

The module is a TCP client: the Mac app listens, and this module connects to it and keeps
reconnecting if the connection drops. The two sides speak line-based JSON, described in
[PROTOCOL.md](./PROTOCOL.md). For what the module offers inside Companion, see
[companion/HELP.md](./companion/HELP.md).

Build counts ("builds left") are tabled for now.

## Development

Built from Bitfocus's TypeScript module template, on `@companion-module/base` 2.x.

```sh
yarn                # install
yarn build          # compile to dist/
yarn test           # compile and run the tests
yarn lint
yarn package        # build and write horinetech-keynote-<version>.tgz
```

The tests include a mock Mac app TCP server that exercises the real client: the handshake, the
shared token, state, triggers, commands, reconnecting, and dropping a silent connection.

To load it into Companion during development, point Companion's developer modules folder at the
parent of this checkout and run `yarn dev`.

### Layout

```
src/protocol.ts    message types, decoding, line framing
src/client.ts      reconnecting TCP client (no Companion dependency, so it is testable)
src/state.ts       variable values and label matching as plain functions
src/main.ts        the Companion module: wires the client to variables and feedbacks
src/actions.ts, feedbacks.ts, variables.ts, presets.ts, config.ts
test/              node:test tests against the compiled dist/
```

### Trying it without the Mac app

Anything that speaks the protocol can stand in for the app. `nc -l 7878` shows the module's
`hello` and every command it sends. Type the app's `hello` line back to it, then `state` and
`trigger` lines (see PROTOCOL.md for the exact JSON).

## Licence

MIT, see [LICENSE](./LICENSE).
