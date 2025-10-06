const functions = require("firebase-functions");
const fetch = require("node-fetch");

require("dotenv").config();

exports.analyzeReceipt = functions.https.onCall(async (data, context) => {
  // NOTE: Firebase Gen2 callable functions have a known issue where context.auth
  // is not populated even when auth is valid (logs show "auth":"VALID")
  // Client-side authentication is enforced in upload.html before calling this function
  // IAM permissions are set via: gcloud run services add-iam-policy-binding
  
  const actualData = data?.data || data;
  const { imageData, mimeType } = actualData;

  if (!imageData || !mimeType) {
    console.error("Missing required fields");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing image data or mime type"
    );
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || functions.config().gemini?.key;

  if (!GEMINI_API_KEY) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Gemini API key not configured"
    );
  }

  const prompt = "You are an expert at reading receipts and extracting structured data. Given an image of a bill or receipt, extract the following information:\n\n1. List of items with their names, categories, and individual amounts\n2. Total amount of the bill\n3. Date of purchase\n\nFor categories, use one of these: grocery, utensil, clothing, miscellaneous\n\nReturn the result as clean JSON in this exact format:\n{\n  \"items\": [\n    {\"name\": \"Item Name\", \"category\": \"grocery\", \"amount\": 123.45}\n  ],\n  \"total\": 1234.56,\n  \"date\": \"2025-01-15\"\n}\n\nImportant rules:\n- Only return valid JSON, no other text\n- If you cannot read the image clearly, return an empty items array\n- Use \"miscellaneous\" category if unsure\n- Format date as YYYY-MM-DD\n- Amounts should be numbers, not strings\n- If no date is visible, use today date";

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageData
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new functions.https.HttpsError(
        "internal",
        "Gemini API error: " + response.status
      );
    }

    const result = await response.json();
    const textPart = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textPart) {
      console.error("No text in Gemini response");
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get response from Gemini"
      );
    }

    // Clean up markdown code blocks (```json ... ``` or ``` ... ```)
    let cleanedText = textPart.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "");
    }
    
    // Also handle backtick-prefixed format like `json
    if (cleanedText.startsWith("`json")) {
      cleanedText = cleanedText.replace(/`json\n?/g, "").replace(/`\n?$/g, "");
    } else if (cleanedText.startsWith("`")) {
      cleanedText = cleanedText.replace(/`/g, "");
    }
    
    cleanedText = cleanedText.trim();

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse JSON:", cleanedText);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to parse receipt data"
      );
    }

    return {
      success: true,
      items: parsedData.items || [],
      total: parsedData.total || 0,
      date: parsedData.date || new Date().toISOString().split("T")[0]
    };

  } catch (error) {
    console.error("Error analyzing receipt:", error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "Failed to analyze receipt"
    );
  }
});
