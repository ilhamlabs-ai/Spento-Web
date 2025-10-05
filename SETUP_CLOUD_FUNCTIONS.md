# Cloud Functions Setup for Spento Web

## 🔧 Setting Up Receipt Analysis

The receipt analysis feature uses Google's Gemini AI via Firebase Cloud Functions. Follow these steps to get it working:

### 1. Install Firebase CLI (if not already installed)

```powershell
npm install -g firebase-tools
```

### 2. Login to Firebase

```powershell
firebase login
```

### 3. Install Cloud Functions Dependencies

```powershell
cd functions
npm install
cd ..
```

### 4. Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key

### 5. Configure the API Key in Firebase

```powershell
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY_HERE"
```

**Important:** Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key from step 4.

### 6. Deploy Cloud Functions

```powershell
firebase deploy --only functions
```

This will deploy the `analyzeReceipt` function to Firebase.

### 7. Verify Deployment

After deployment, you should see:
```
✔  Deploy complete!

Function URL (analyzeReceipt): https://us-central1-YOUR-PROJECT.cloudfunctions.net/analyzeReceipt
```

## 🧪 Testing the Receipt Analysis

1. Open `upload.html` in your browser
2. Open the browser console (F12)
3. Upload a receipt image
4. Click "Analyze Receipt"
5. Watch the console for detailed logs:
   - "Starting receipt analysis..."
   - "Converting image to base64..."
   - "Calling analyzeReceipt Cloud Function..."
   - "Analysis complete: ..."

## 🐛 Troubleshooting

### Error: "Server configuration error"
**Solution:** The Gemini API key is not configured. Run:
```powershell
firebase functions:config:set gemini.key="YOUR_API_KEY"
firebase deploy --only functions
```

### Error: "Failed to analyze receipt"
**Possible causes:**
1. **Image too large** - Try compressing the image (should be < 4MB)
2. **Invalid image format** - Use PNG or JPEG only
3. **Gemini API quota exceeded** - Check your [API usage](https://console.cloud.google.com/)
4. **Network issues** - Check your internet connection

### Error: "Permission denied" or "unauthenticated"
**Solution:** Make sure you're logged in. The function requires authentication.

### Check Cloud Function Logs

To see detailed logs from the Cloud Function:
```powershell
firebase functions:log --only analyzeReceipt
```

## 📊 Checking Your Configuration

To verify your Cloud Functions configuration:
```powershell
firebase functions:config:get
```

You should see:
```json
{
  "gemini": {
    "key": "AIza..."
  }
}
```

## 🔄 Updating After Code Changes

Whenever you modify `functions/index.js`, redeploy:
```powershell
firebase deploy --only functions
```

## 💡 Tips

1. **Free Tier:** Gemini API has a generous free tier (15 requests/minute)
2. **Image Quality:** Better quality images = better results
3. **Receipt Format:** Works best with clear, well-lit receipts
4. **Fallback:** If analysis fails, users can still manually enter bills

## 🚀 Production Checklist

Before going live:
- [ ] Gemini API key configured
- [ ] Cloud Functions deployed
- [ ] Test with various receipt types
- [ ] Check Firebase billing (Cloud Functions usage)
- [ ] Set up monitoring/alerts
- [ ] Configure CORS if needed

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Check Firebase Functions logs: `firebase functions:log`
3. Verify your Gemini API key is valid
4. Ensure your Firebase project has billing enabled (required for Cloud Functions)
