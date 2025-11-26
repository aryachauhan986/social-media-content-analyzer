import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI(GOOGLE_API_KEY ? { apiKey: GOOGLE_API_KEY } : {});
function fallbackSuggestions(text) {
  const suggestions = [];
  if (!text || text.trim().length === 0) {
    suggestions.push(
      "No readable text found — try uploading a clearer scan or PDF."
    );
    return suggestions;
  }
  if (text.length > 300) {
    suggestions.push(
      "Consider shortening the post; people engage more with shorter content."
    );
  }
  if (!/[?!.]$/.test(text.trim())) {
    suggestions.push("Add a question or CTA at the end to invite replies.");
  }
  suggestions.push("Use 2-3 trending hashtags relevant to your topic.");
  suggestions.push(
    "Break long paragraphs into short lines (1-2 sentences each) for easier reading."
  );
  suggestions.push("Add a clear CTA and 1-2 emojis to increase visibility.");
  return suggestions;
}

export async function generateSuggestions(text) {
  if (!text) {
    return { suggestions: fallbackSuggestions(text), source: "fallback" };
  }
  if (GOOGLE_API_KEY) {
    try {
      const prompt = [
        "You are an expert social media strategist specialized in growing engagement across Instagram, Facebook, LinkedIn, and X.",
        "Analyze the post text below and provide:",
        "1. Five concise, highly actionable suggestions to improve engagement. Focus on clarity, emotion, hooks, and call-to-actions.",
        "2. Three optimized hashtags relevant to the post theme. Output them comma-separated and avoid overly generic hashtags.",
        "Guidelines:",
        "- Keep suggestions short (max 12–15 words each).",
        "- Avoid repeating the same idea.",
        "- Do NOT rewrite the post; only give improvement suggestions.",
        "- Ensure the output is formatted cleanly and consistently.",
        "",
        "Post to analyze:",
        text,
      ].join("\n\n");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        input: prompt,
        contents: prompt,
        maxOutputTokens: 300,
        temperature: 0.7,
      });

      // handle several possible shapes of SDK responses
      let rawText = "";

      // SDK might return a string directly
      if (typeof response === "string") {
        rawText = response;
      } else if (response?.output?.[0]?.content) {
        const c = response.output[0].content;
        if (Array.isArray(c)) {
          rawText = c.map((x) => (x?.text ? x.text : "")).join("\n");
        } else if (typeof c === "string") {
          rawText = c;
        }
      } else if (response?.candidates?.[0]?.output) {
        rawText = response.candidates[0].output;
      } else if (response?.results?.[0]?.content) {
        rawText = response.results[0].content;
      } else if (response?.text) {
        rawText = response.text;
      } else if (response?.data) {
        rawText = JSON.stringify(response.data);
      } else {
        // fallback: stringify whole response
        rawText = JSON.stringify(response);
      }

      rawText = String(rawText || "").trim();
      if (!rawText) throw new Error("Empty AI response");

      // split into meaningful lines (use real newline, not literal "\n")
      const lines = rawText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      const suggestions = [];
      const hashtags = [];

      for (const line of lines) {
        // If the line mentions "hashtag" or contains #words, extract hashtags
        const foundHashTags = line.match(/#\w+/g);
        if (foundHashTags) {
          hashtags.push(...foundHashTags);
          continue;
        }

        // Common bullet
        if (/^\d+[\).\-\s]/.test(line) || /^[-•]/.test(line)) {
          // remove leading numbering
          const clean = line.replace(/^\d+[\).\-\s]+|^[-•]\s*/, "").trim();
          if (clean) suggestions.push(clean);
          continue;
        }

        // If short line, treat as suggestion until we have enough
        if (line.length < 200 && suggestions.length < 5) {
          suggestions.push(line);
          continue;
        }
      }

      // If we didn't find suggestions, split by sentences
      if (suggestions.length === 0) {
        const sents = rawText
          .split(/(?<=[.?!])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        suggestions.push(...sents.slice(0, 5));
      }

      // If hashtags not found, inspect last line for comma separated
      if (hashtags.length === 0 && lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        const maybe = lastLine
          .split(/,|;/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const token of maybe) {
          if (token.startsWith("#")) hashtags.push(token);
          else if (/^[A-Za-z0-9_]{2,}$/.test(token)) hashtags.push("#" + token);
        }
      }

      if (hashtags.length) {
        suggestions.push("Hashtags: " + hashtags.slice(0, 5).join(" "));
      }

      // Limit number of suggestions returned
      const finalSuggestions = suggestions.slice(0, 8);
      // console.log("generateSuggestions: source=genai", finalSuggestions);
      return { suggestions: finalSuggestions, source: "genai" };
    } catch (err) {
      console.error("AI call failed, falling back to heuristics:", err);
    }
  }

  // fallback
  return { suggestions: fallbackSuggestions(text), source: "fallback" };
}
