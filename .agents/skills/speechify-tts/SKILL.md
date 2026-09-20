---
name: speechify-tts
description: Instructions and code examples for integrating the Speechify Text-to-Speech (TTS) API in Node.js, Python, and cURL.
---

# Speechify Text-to-Speech (TTS) Integration Guide

> Speechify API — Text-to-Speech integration guide for AI coding assistants.

## Installation

```bash
# Node.js
pnpm add @speechify/api

# Python
pip install speechify-api
```

## Authentication

All requests require a Bearer token. Get yours at https://platform.speechify.ai/api-keys

```bash
# .env
SPEECHIFY_API_KEY=YOUR_API_KEY
```

## Basic TTS Example

### Node.js / TypeScript

```typescript
import { SpeechifyClient } from "@speechify/api";
import fs from "node:fs";

const client = new SpeechifyClient({ apiKey: process.env.SPEECHIFY_API_KEY });

const response = await client.audio.speech({
  input: "Hello! This is the Speechify text-to-speech API.",
  model: "simba-3.2",
  voice_id: "geffen_32",
  audio_format: "mp3",
});

// audio_data is Base64-encoded audio bytes
fs.writeFileSync("output.mp3", Buffer.from(response.audio_data, "base64"));
```

### Python

```python
from speechify import Speechify
import base64
import os

client = Speechify(api_key=os.environ["SPEECHIFY_API_KEY"])

response = client.audio.speech(
    input="Hello! This is the Speechify text-to-speech API.",
    model="simba-3.2",
    voice_id="geffen_32",
    audio_format="mp3",
)

# audio_data is Base64-encoded audio bytes
with open("output.mp3", "wb") as f:
    f.write(base64.b64decode(response.audio_data))
```

### cURL

```bash
curl -X POST https://api.speechify.ai/v1/audio/speech \
  -H "Authorization: Bearer $SPEECHIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello! This is the Speechify text-to-speech API.",
    "model": "simba-3.2",
    "voice_id": "geffen_32",
    "audio_format": "mp3"
  }'
```

The `/audio/speech` endpoint returns JSON with the audio as Base64 in `audio_data`.
To save a playable file from cURL, decode it:

```bash
curl -s -X POST https://api.speechify.ai/v1/audio/speech \
  -H "Authorization: Bearer $SPEECHIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello! This is the Speechify text-to-speech API.",
    "model": "simba-3.2",
    "voice_id": "geffen_32",
    "audio_format": "mp3"
  }' | jq -r '.audio_data' | base64 -d > output.mp3
```

## Streaming (up to 20,000 characters)

```bash
curl -X POST https://api.speechify.ai/v1/audio/stream \
  -H "Authorization: Bearer $SPEECHIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: audio/mpeg" \
  -d '{
    "input": "Your long text here...",
    "model": "simba-3.2",
    "voice_id": "geffen_32"
  }' --output stream.mp3
```

The streaming endpoint returns raw binary audio via chunked transfer encoding.
The audio format is specified via the `Accept` header (`audio/mpeg`, `audio/ogg`, `audio/aac`, `audio/pcm`).

## Models & Voices

| Model | Languages | Best For |
| :--- | :--- | :--- |
| `simba-3.2` | English | **Recommended.** Streaming-native, lowest TTFB and richest expressivity |
| `simba-3.0` | English | Earlier streaming-native model |
| `simba-english` | English | Default; supports cloned/personal voices |
| `simba-multilingual` | 20+ | Multi-language or mixed-language content |

### Common Voice IDs (`simba-3.2`)
- `geffen_32`
- `beatrice_32`
- `dominic_32`
- `imogen_32`

## Error Handling

| Code | Meaning | Action |
| :--- | :--- | :--- |
| `401` | Invalid or missing API key | Check your `SPEECHIFY_API_KEY` |
| `402` | Insufficient balance | Add credits at platform.speechify.ai/billing |
| `429` | Rate limit exceeded | Back off and retry with exponential delay |
