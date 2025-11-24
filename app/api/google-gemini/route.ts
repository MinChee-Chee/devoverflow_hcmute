/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Helper function to strip HTML tags and clean text
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .trim();
}

export const POST = async (request: Request) => {
    try {
      const { questionTitle, questionContent, answers } = await request.json();
  
      if (!questionTitle || !questionContent) {
        throw new Error('Question title and content are required');
      }
  
      // Clean the question content
      const cleanQuestionContent = stripHtml(questionContent);
  
      // Build the summary prompt
      let prompt = `Please provide a comprehensive summary of the following question and its discussion:\n\n`;
      prompt += `**Question Title:** ${questionTitle}\n\n`;
      prompt += `**Question Content:**\n${cleanQuestionContent}\n\n`;
  
      // Add answers if they exist
      if (answers && answers.length > 0) {
        prompt += `**Answers (${answers.length} total):**\n\n`;
        answers.forEach((answer: any, index: number) => {
          const cleanAnswerContent = stripHtml(answer.content || '');
          const author = answer.author?.name || 'Anonymous';
          prompt += `Answer ${index + 1} by ${author}:\n${cleanAnswerContent}\n\n`;
        });
      } else {
        prompt += `**Answers:** No answers yet.\n\n`;
      }
  
      prompt += `Please provide a concise summary that:\n`;
      prompt += `1. Explains what the question is asking about\n`;
      prompt += `2. Summarizes the key points from the answers (if any)\n`;
      prompt += `3. Highlights the main solutions or insights provided\n`;
      prompt += `4. Keeps the summary clear and easy to understand\n\n`;
      prompt += `Summary:`;
  
      // Use Google Gemini API key from environment or fallback to provided key
      // The SDK can read from GEMINI_API_KEY env var automatically, or we can pass it
      const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyAKd4Gi6q4QfG5-pEYkq4U-uzeMKVJChKs';
      
      // Initialize Google GenAI client
      // SDK reads from GEMINI_API_KEY env var by default, or we can pass apiKey
      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
      });

      // Try different models in order of preference
      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.5-pro-exp',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
      ];

      let lastError: any = null;
      let summary: string | null = null;

      // Try each model until one works
      for (const model of modelsToTry) {
        try {
          console.log(`Trying model: ${model}`);
          
          const response = await ai.models.generateContent({
            model: model,
            contents: `You are a helpful assistant that provides clear and concise summaries of technical questions and their answers.\n\n${prompt}`,
          });

          if (response.text) {
            summary = response.text;
            console.log(`Successfully used model: ${model}`);
            break; // Success, exit loop
          }
        } catch (err: any) {
          lastError = err;
          const errorMessage = err.message || err.toString();
          console.log(`Model ${model} failed:`, errorMessage);
          
          // If it's a quota error, provide helpful message and stop trying
          if (errorMessage.includes('quota') || errorMessage.includes('Quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            const quotaMessage = 'Google Gemini API quota exceeded. Please check your quota limits at https://ai.dev/usage?tab=rate-limit. The free tier has limited requests per day.';
            throw new Error(quotaMessage);
          }
          // Continue to next model for other errors
        }
      }

      // If all models failed, throw the last error
      if (!summary) {
        if (lastError) {
          const errorMessage = lastError.message || 'All model configurations failed';
          throw new Error(`Failed to connect to Google Gemini API: ${errorMessage}. Please check your API key and available models.`);
        }
        throw new Error('Failed to connect to Google Gemini API. Please check your API key.');
      }

      // Summary is already extracted from the SDK response
      if (!summary) {
        throw new Error('No summary generated from AI');
      }
  
      return NextResponse.json({ summary }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
    
    } catch (error: any) {
      console.error('Google Gemini API Error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Failed to generate summary';
      
      if (errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
        errorMessage = 'Google Gemini API quota exceeded. Please check your quota limits at https://ai.dev/usage?tab=rate-limit. Free tier has limited daily requests.';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
        errorMessage = 'Google Gemini API rate limit exceeded. Please try again in a moment.';
      } else if (errorMessage.includes('API_KEY') || errorMessage.includes('UNAUTHENTICATED')) {
        errorMessage = 'Invalid Google Gemini API key. Please check your API key configuration.';
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  };
  