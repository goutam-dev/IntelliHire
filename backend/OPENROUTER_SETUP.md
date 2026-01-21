# 🚀 OpenRouter Quick Setup Guide

## Why OpenRouter?

OpenRouter is **100% FREE** to use (no credit card required) and provides access to multiple state-of-the-art AI models including Google Gemma 2, Meta Llama 3.1, and Mistral.

## ⚡ 2-Minute Setup

### Step 1: Get Your FREE API Key

1. Visit **https://openrouter.ai**
2. Click **"Sign In"** (supports Google/GitHub login)
3. Go to **https://openrouter.ai/keys**
4. Click **"Create Key"**
5. Copy your API key (starts with `sk-or-v1-...`)

### Step 2: Configure Environment

1. Open `backend/.env` file (create if it doesn't exist)
2. Add these lines:

```env
AI_API_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
OPENROUTER_MODEL=liquid/lfm-2.5-1.2b-instruct:free
APP_URL=http://localhost:5173
```

### Step 3: Install Dependencies & Run

```bash
cd backend
npm install
npm start
```

**That's it!** 🎉 Your AI-powered resume ranking is now active!

---

## 🆓 Available Free Models

| Model | Provider | Best For |
|-------|----------|----------|
| `liquid/lfm-2.5-1.2b-instruct:free` | LiquidAI | **Recommended** - Fast & efficient |
| `allenai/molmo-2-8b:free` | AllenAI | Vision & multimodal support |

**All models are 100% free** with no rate limits for personal/educational use!

---

## 🧪 Test Your Setup

Run the test script to verify everything works:

```bash
node test-resume-ranking.js
```

You should see output like:

```
✅ Agent 1 (JD Extractor): SUCCESS
✅ Agent 2 (Resume Analyzer): SUCCESS
✅ Agent 3 (Semantic Matcher): SUCCESS
✅ Agent 4 (Supervisor): SUCCESS
✅ Full Pipeline: SUCCESS - Overall Score: 82/100
```

---

## 📊 Usage Limits

**OpenRouter Free Tier:**
- ✅ Unlimited requests for free models
- ✅ No credit card required
- ✅ Perfect for FYP/academic projects
- ✅ ~1-3 second response time

---

## 🔧 Troubleshooting

### "API key not found" error
- Make sure `.env` file exists in `backend/` folder
- Verify `OPENROUTER_API_KEY` is set correctly
- Restart your server after editing `.env`

### "Model not found" error
- Double-check model name includes `:free` suffix
- Use: `google/gemma-2-9b-it:free` (not just `google/gemma-2-9b-it`)

### Slow responses
- Free models typically respond in 1-5 seconds
- If slower, try switching to `mistralai/mistral-7b-instruct:free`

---

## 🌐 API Endpoints Ready to Use

Once configured, these endpoints work automatically:

```bash
# Analyze a resume for a job application
POST http://localhost:4000/api/resume-ranking/analyze/:applicationId

# Get top candidates for a job
GET http://localhost:4000/api/resume-ranking/top-candidates/:jobId

# View detailed analysis
GET http://localhost:4000/api/resume-ranking/detailed/:applicationId
```

Import the Postman collection (`postman-collection.json`) for easy testing!

---

## 💡 Pro Tips

1. **Google Gemma 2 9B** is the most accurate free model
2. Set `APP_URL` to your frontend URL for proper tracking
3. Responses are cached in MongoDB - re-analysis is instant
4. Check `resumeAnalysis` collection for detailed AI outputs

---

## 🎓 Perfect for FYP/Projects

- ✅ No subscription fees
- ✅ No credit card required
- ✅ Production-ready quality
- ✅ Explainable AI outputs
- ✅ Multi-agent architecture

---

## 📞 Support

- OpenRouter Docs: https://openrouter.ai/docs
- Model Playground: https://openrouter.ai/playground
- Check API status: https://status.openrouter.ai

---

**Made with ❤️ for IntelliHire FYP Project**
