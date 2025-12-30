# A Quiet Place

A small, quiet playground simulator. No goals. No scores. Just a moment alone at the playground in late afternoon.

## What This Is

This is not a game.

It's a minute-long experience of being somewhere familiar—a playground, empty, in that golden hour when shadows stretch long and the world gets quiet.

You can walk around. You can swing. You can sit on the seesaw. You can spin the merry-go-round. You can slide. Or you can just stand there and listen to the wind.

After about a minute, the light fades. That's all.

## Controls

- **Arrow keys** or **WASD** — Move around
- **Space** or **Enter** — Interact with playground equipment (when near)
- **Escape** — Stop interacting

### Interactions

- **Swing** — Walk to it, press Space. Press Up/W to pump higher. Wait for it to slow, then press Space to get off.
- **Merry-go-round** — Walk to it, press Space. Use Left/Right or A/D to spin. Wait for it to slow, then press Space to step off.
- **Slide** — Walk to the ladder, press Space. You'll climb up and slide down automatically.

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

Push this repository to GitHub, then import it on [vercel.com](https://vercel.com). No configuration needed.

## Technical Notes

- Built with Next.js 14, TypeScript, and HTML Canvas
- Ambient audio synthesized with Web Audio API (wind, distant birds, metal creaks)
- No external dependencies beyond React and Next.js
- No backend, no analytics, no tracking

## Intent

This was built for Shipmas 2025.

The goal wasn't to impress with complexity or polish. It was to make something that might, for just a moment, help someone remember what it felt like to be small at a playground—that particular quality of afternoon light, the weight of a swing, the slight dizziness of spinning.

Some places stay with us. This is an attempt to visit one.

---

*Keep it small. Keep it human.*
