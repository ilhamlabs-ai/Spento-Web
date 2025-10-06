const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

// Analyze receipt with Gemini API
// TEMPORARY: Allowing unauthenticated calls for testing
exports.analyzeReceipt = functions.https.onCall(async (data, context) => {
  // Log authentication context for debugging
  console.log('Function called with context:', {
    auth: context.auth ? {
      uid: context.auth.uid,
      token: context.auth.token ? 'present' : 'missing'
    } : 'NO AUTH CONTEXT',
    rawAuth: Boolean(context.rawRequest?.headers?.authorization),
    appCheck: Boolean(context.app)
  });

  // TEMPORARY: Comment out auth check to test if function works
  // if (!context.auth) {
  //   console.error('❌ No authentication context found!');
  //   throw new functions.https.HttpsError(
  //     'unauthenticated',
  //     'User must be authenticated to analyze receipts'
  //   );
  // }

  if (context.auth) {
    console.log('✅ User authenticated:', context.auth.uid);
  } else {
    console.warn('⚠️ No auth context, but proceeding for testing');
  }

  const { imageData, mimeType } = data;

  // Enhanced input validation with logging
  console.log('Received data keys:', Object.keys(data));
  console.log('imageData type:', typeof imageData);
  console.log('imageData length:', imageData?.length);
  console.log('mimeType:', mimeType);

  if (!imageData || !mimeType) {
    console.error('❌ Validation failed:', {
      hasImageData: Boolean(imageData),
      imageDataType: typeof imageData,
      imageDataLength: imageData?.length,
      hasMimeType: Boolean(mimeType),
      mimeType: mimeType,
      allDataKeys: Object.keys(data)
    });
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing image data or mime type'
    );
  }

  // 🔐 Get API key from environment or config
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || functions.config().gemini?.key;

  if (!GEMINI_API_KEY) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gemini API key not configured'
    );
  }

  const prompt = `
You are an expert at reading receipts and extracting structured data. Given an image of a bill or receipt, extract the following information:

1. List of items with their names, categories, and individual amounts
2. Total amount of the bill
3. Date of purchase

For categories, use one of these: grocery, utensil, clothing, miscellaneous

Return the result as clean JSON in this exact format:
{
  "items": [
    {"name": "Item Name", "category": "grocery", "amount": 123.45}
  ],
  "total": 1234.56,
  "date": "2025-01-15"
}

Important rules:
- Only return valid JSON, no other text
- If you can't read the image clearly, return an empty items array
- Use "miscellaneous" category if unsure
- Format date as YYYY-MM-DD
- Amounts should be numbers, not strings
- If no date is visible, use today's date
`;

  try {
    console.log('Calling Gemini API...');
    console.log('Image size (base64):', imageData.length);
    console.log('MIME type:', mimeType);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageData
                }
              }
            ]
          }]
        })
      }
    );

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini API result:', JSON.stringify(result, null, 2));
    
    if (!result.candidates || !result.candidates[0]) {
      console.error('No candidates in response:', result);
      throw new Error('No response from Gemini - the image might be unclear or blocked');
    }

    const text = result.candidates[0].content.parts[0].text;
    console.log('Extracted text from Gemini:', text);
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      console.log('Parsed data:', parsedData);
      
      // Validate the response structure
      if (typeof parsedData.total !== 'number') {
        parsedData.total = 0;
      }
      if (!Array.isArray(parsedData.items)) {
        parsedData.items = [];
      }
      if (!parsedData.date) {
        parsedData.date = new Date().toISOString().split('T')[0];
      }
      
      console.log('Returning parsed data:', parsedData);
      return parsedData;
    }
    
    console.error('Failed to find JSON in response text:', text);
    throw new Error('Failed to parse JSON from response - AI returned unexpected format');

  } catch (error) {
    console.error('Gemini API Error:', error);
    console.error('Error stack:', error.stack);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to analyze receipt: ' + error.message,
      error.message
    );
  }
});