# 🦾 ElevenLabs Jarvis Voice Setup for SMASH Cloud

This guide will help you set up the authentic Jarvis voice experience using ElevenLabs neural TTS.

## 🚀 Quick Setup

### 1. Get ElevenLabs API Key

1. Go to [https://elevenlabs.io/sign-up](https://elevenlabs.io/sign-up)
2. Create a free account (10,000 characters/month for free tier)
3. Navigate to [API Keys](https://elevenlabs.io/app/settings/api-keys)
4. Copy your API key

### 2. Configure Environment Variables

Create a `.env` file in the `smash_ui` directory:

```env
# ElevenLabs Configuration for Jarvis Voice
VITE_ELEVENLABS_API_KEY=your_api_key_here
VITE_ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
```

### 3. Recommended Voice IDs for Jarvis Experience

| Voice ID | Name | Description |
|----------|------|-------------|
| `pNInz6obpgDQGcFmaJgB` | Adam | Deep, authoritative - closest to Jarvis baseline |
| `AZnzlk1XvdvUeBnXmlld` | Domi | Deep voice, excellent for AI assistants |
| `jBpfuIE2acCO8z3wKNLl` | Josh | Deep, calm American voice - very professional |
| `ErXwobaYiN019PkySvjV` | Antoni | British accent, sophisticated tone |

## 🎙️ Custom Voice Cloning (Advanced)

For the **most authentic Jarvis experience**, you can clone your own voice:

### Option A: Using ElevenLabs Voice Lab

1. Go to [Voice Lab](https://elevenlabs.io/voice-lab)
2. Click "Add Voice" → "Instant Voice Cloning"
3. Upload 1-2 minutes of clear audio (Paul Bettany's voice samples)
4. Name it "Jarvis Clone" and train it
5. Copy the generated Voice ID and update your `.env`:

```env
VITE_ELEVENLABS_VOICE_ID=your_cloned_voice_id_here
```

### Option B: Professional Voice Models

For the most accurate results, you can use specialized voice models designed to replicate the Jarvis tone and cadence.

## 🔧 Voice Settings

The system is pre-configured with optimal Jarvis settings:

- **Stability**: 0.65 - More stable for consistent delivery
- **Similarity**: 0.85 - High similarity for consistent voice
- **Style**: 0.25 - Lower style for professional, neutral tone
- **Speaker Boost**: Enabled for enhanced clarity

## 🎯 Features

✅ **Automatic Fallback**: Falls back to browser TTS if ElevenLabs fails  
✅ **Real-time Streaming**: Immediate voice responses  
✅ **Jarvis-style Settings**: Optimized for authentic AI assistant voice  
✅ **Status Indicators**: UI shows when ElevenLabs is active  
✅ **Error Handling**: Graceful degradation if service is unavailable  

## 🔍 Troubleshooting

### "ElevenLabs not configured" message
- Check that your `.env` file exists in `smash_ui/`
- Verify the API key is correct and has remaining character quota
- Restart the development server after adding environment variables

### Voice not playing
- Check browser console for errors
- Verify your ElevenLabs account has remaining character quota
- Try a different Voice ID from the recommended list

### Fallback to browser TTS
This is normal behavior when:
- ElevenLabs API is unavailable
- Character quota is exceeded
- Network issues prevent API calls

## 🎪 Testing Your Setup

1. Start the development server: `npm run dev`
2. Open the SMASH Cloud dashboard
3. Go to the AI section
4. Look for "🦾 ElevenLabs Jarvis Voice" in the header
5. Ask the AI something and it will respond with authentic Jarvis voice!

## 💡 Pro Tips

- **Free Tier**: 10,000 characters/month is approximately 2-3 hours of speech
- **Voice Quality**: Cloned voices typically sound more authentic than pre-made ones
- **Performance**: ElevenLabs responses are cached automatically for efficiency
- **Customization**: You can adjust voice settings in `src/lib/voiceConfig.ts`

## 🎬 The Result

Once configured, your SMASH Cloud AI will:
- Greet you with authentic Jarvis voice on first load
- Respond to all queries with cinematic-quality TTS
- Maintain consistent, professional delivery
- Automatically handle network issues and fallbacks

**Welcome to the future of AI voice interaction!** 🚀
