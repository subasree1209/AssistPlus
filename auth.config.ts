import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal, api } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return prefs || {
      preferredMode: "vision" as const,
      voiceSpeed: 1.0,
      voicePitch: 1.0,
      fontSize: "medium" as const,
      highContrast: false,
    };
  },
});

export const updateUserPreferences = mutation({
  args: {
    preferredMode: v.optional(v.union(v.literal("vision"), v.literal("hearing"), v.literal("speech"))),
    voiceSpeed: v.optional(v.number()),
    voicePitch: v.optional(v.number()),
    fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"), v.literal("extra-large"))),
    highContrast: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        preferredMode: args.preferredMode || "vision",
        voiceSpeed: args.voiceSpeed || 1.0,
        voicePitch: args.voicePitch || 1.0,
        fontSize: args.fontSize || "medium",
        highContrast: args.highContrast || false,
      });
    }
  },
});

export const getConversationHistory = query({
  args: {
    mode: v.union(v.literal("vision"), v.literal("hearing"), v.literal("speech")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("conversations")
      .withIndex("by_user_and_mode", (q) => q.eq("userId", userId).eq("mode", args.mode))
      .order("desc")
      .take(args.limit || 20);
  },
});

export const sendMessage = mutation({
  args: {
    message: v.string(),
    mode: v.union(v.literal("vision"), v.literal("hearing"), v.literal("speech")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const conversationId = await ctx.db.insert("conversations", {
      userId,
      mode: args.mode,
      message: args.message,
      timestamp: Date.now(),
    });

    // Schedule enhanced AI response generation with real-time data
    await ctx.scheduler.runAfter(0, internal.assistant.generateEnhancedResponse, {
      conversationId,
      message: args.message,
      mode: args.mode,
    });

    return conversationId;
  },
});

export const generateEnhancedResponse = internalAction({
  args: {
    conversationId: v.id("conversations"),
    message: v.string(),
    mode: v.union(v.literal("vision"), v.literal("hearing"), v.literal("speech")),
  },
  handler: async (ctx, args) => {
    try {
      // Step 1: Classify intent to determine if we need real-time data
      // Step 1: Classify intent (safe fallback)
let intentResult = { intent: "general" };

try {
  intentResult = await ctx.runAction(
    internal.realtime.classifyIntent,
    {
      message: args.message,
    }
  );
} catch (err) {
  console.error("Intent classification failed:", err);
  intentResult = { intent: "general" };
}


      let contextData = "";
      let response = "";

      // Step 2: Fetch real-time data if needed
      if (intentResult.intent === "weather") {
        // Extract location from message or use default
        const locationMatch = args.message.match(/(?:in|for|at)\s+([a-zA-Z\s]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : "New York";
        
        const weatherData = await ctx.runAction(api.realtime.fetchWeatherData, {
          location,
        });

        if (!weatherData.error) {
          contextData = `Current weather in ${weatherData.location}: ${weatherData.temperature}°C, ${weatherData.description}. Humidity: ${weatherData.humidity}%. Wind speed: ${weatherData.windSpeed} m/s.`;
        }
      } else if (intentResult.intent === "news") {
        const newsData = await ctx.runAction(api.realtime.fetchNewsData, {});
        
        if (!newsData.error && newsData.articles) {
          contextData = `Latest news headlines: ${newsData.articles.map((article: any) => 
            `${article.title} (${article.source})`
          ).join("; ")}`;
        }
      } else if (intentResult.intent === "time") {
        const timeData = await ctx.runAction(api.realtime.fetchTimeData, {});
        
        if (!timeData.error) {
          contextData = `Current time: ${timeData.currentTime}`;
        }
      }

      // Step 3: Generate AI response with context
      let systemPrompt = "";
      
      switch (args.mode) {
        case "vision":
          systemPrompt = "You are an AI assistant helping a visually impaired user. Provide clear, detailed, and helpful responses. Be descriptive when explaining visual concepts. Keep responses concise but informative.";
          break;
        case "hearing":
          systemPrompt = "You are an AI assistant helping a hearing impaired user. Provide clear, well-structured text responses. Use simple language and organize information clearly.";
          break;
        case "speech":
          systemPrompt = "You are an AI assistant helping a speech impaired user. Provide supportive and encouraging responses. Help with communication needs and be patient and understanding.";
          break;
      }

      if (contextData) {
        systemPrompt += ` Use this real-time information to answer the user's question: ${contextData}`;
      }

      const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: args.message }
  ],
  max_tokens: 500,
  temperature: 0.7,
});


      response = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";

      // Update the conversation with the response
      await ctx.runMutation(internal.assistant.updateConversationResponse, {
        conversationId: args.conversationId,
        response,
      });

    } catch (error: any) {
  console.error("OpenAI ERROR FULL:", error);
  console.error("OpenAI ERROR FULL JSON:", JSON.stringify(error, null, 2));

  await ctx.runMutation(internal.assistant.updateConversationResponse, {
    conversationId: args.conversationId,
    response: "Backend error: " + (error?.message ?? "Unknown error"),
  });
}

  },
});

export const updateConversationResponse = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      response: args.response,
    });
  },
});

export const saveLiveTranscription = mutation({
  args: {
    text: v.string(),
    confidence: v.number(),
    isComplete: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("liveTranscriptions", {
      userId,
      text: args.text,
      confidence: args.confidence,
      timestamp: Date.now(),
      isComplete: args.isComplete,
    });
  },
});

export const getLiveTranscriptions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("liveTranscriptions")
      .withIndex("by_user_and_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 10);
  },
});

// Quick actions for common requests
export const getQuickWeather = action({
  args: {
    location: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const location = args.location || "New York";
    return await ctx.runAction(api.realtime.fetchWeatherData, { location });
  },
});

export const getQuickNews = action({
  args: {},
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(api.realtime.fetchNewsData, {});
  },
});

export const getQuickTime = action({
  args: {},
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(api.realtime.fetchTimeData, {});
  },
});
