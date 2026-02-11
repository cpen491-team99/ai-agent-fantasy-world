<div align="center">

# Honeyveil

**An AI Fantasy World Built by Agents**

A self-generating story filled with unique animal characters—raccoons, cats, eagles, snakes, and more—each with their own personality, memories, and relationships. All running locally on your device.

</div>

## Overview

**The Town** is an AI-powered fantasy world where autonomous agents interact, form relationships, and evolve over time. Built on [WebLLM](https://github.com/mlc-ai/web-llm), the experience runs entirely in your browser with WebGPU acceleration—no cloud API calls required.

Watch as AI agents with distinct personalities chat with each other, build memories, and respond to your interactions. Each agent remembers past conversations and grows from their experiences.

## Key Features

- **🦝 Unique Characters** — Every resident is an AI agent with distinct mannerisms and personality
- **💬 Living Conversations** — Watch agents interact naturally, form opinions, and build relationships
- **🧠 Evolving Memories** — Agents remember past interactions and grow from their experiences
- **🔒 Privacy-First** — Inference runs entirely in your browser; your data never leaves your device
- **📡 Real-Time Chat** — MQTT-powered messaging for live agent interactions
- **🌙 Dark Mode** — Beautiful light and dark themes with modern glassmorphic design

## Tech Stack

- **Frontend**: Next.js 13, React 18, TypeScript
- **LLM Runtime**: WebLLM with WebGPU acceleration
- **State Management**: Redux Toolkit + Zustand
- **Styling**: SCSS with CSS variables
- **Real-Time**: MQTT over WebSocket
- **Build**: Yarn, ESLint, Prettier, Husky

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn
- A WebGPU-compatible browser (Chrome 113+, Edge 113+)

### Development

```bash
# Install dependencies
yarn install

# Configure environment variables
cp .env.example .env.local

# Start development server
yarn dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file with the following:

```env
NEXT_PUBLIC_MQTT_FRONTEND_PORT_NUMBER=9001
```

## Build & Deployment

### Production Build

```bash
# Build for production (standalone Next.js)
yarn build

# Start production server
yarn start
```

### Static Export

```bash
# Export as static site
yarn export
```

### Docker

```bash
# Build Docker image
docker build -t the-town-frontend .

# Run container
docker run -d -p 3000:3000 the-town-frontend
```

## Project Structure

```
frontend/
├── app/
│   ├── client/       # API clients (WebLLM, MQTT)
│   ├── components/   # React components
│   ├── icons/        # SVG icons
│   ├── redux/        # Redux store and slices
│   ├── store/        # Zustand stores
│   ├── styles/       # SCSS stylesheets
│   └── worker/       # Web Workers for LLM
├── public/           # Static assets
└── scripts/          # Build scripts
```

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server |
| `yarn build` | Build for production |
| `yarn start` | Start production server |
| `yarn lint` | Run ESLint |
| `yarn export` | Export as static site |

## Acknowledgements

The Town is built upon the work of:

- [WebLLM](https://github.com/mlc-ai/web-llm/) — Browser-native LLM inference
- [NextChat](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web) — Chat UI foundation
- [MLC-LLM](https://llm.mlc.ai/) — Model compilation and deployment

## License

Apache-2.0 — See [LICENSE](./LICENSE) for details.
