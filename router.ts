import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Real-time data fetching actions
export const fetchWeatherData = action({
  args: {
    location: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Using OpenWeatherMap API (free tier)
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return { error: "Weather API key not configured" };
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(args.location)}&appid=${apiKey}&units=metric`
      );
      
      if (!response.ok) {
        return { error: "Weather data not available" };
      }

      const data = await response.json();
      return {
        location: data.name,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind?.speed || 0,
      };
    } catch (error) {
      console.error("Weather fetch error:", error);
      return { error: "Failed to fetch weather data" };
    }
  },
});

export const fetchNewsData = action({
  args: {
    query: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Using NewsAPI (free tier)
      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        return { error: "News API key not configured" };
      }

      let url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
      
      if (args.query) {
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(args.query)}&sortBy=publishedAt&apiKey=${apiKey}`;
      } else if (args.category) {
        url = `https://newsapi.org/v2/top-headlines?country=us&category=${args.category}&apiKey=${apiKey}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        return { error: "News data not available" };
      }

      const data = await response.json();
      return {
        articles: data.articles.slice(0, 5).map((article: any) => ({
          title: article.title,
          description: article.description,
          source: article.source.name,
          publishedAt: article.publishedAt,
        })),
      };
    } catch (error) {
      console.error("News fetch error:", error);
      return { error: "Failed to fetch news data" };
    }
  },
});

export const fetchTimeData = action({
  args: {
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const timezone = args.timezone || "UTC";
      const now = new Date();
      
      // Format time for different timezones
      const timeString = now.toLocaleString("en-US", {
        timeZone: timezone,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      return {
        currentTime: timeString,
        timestamp: now.getTime(),
        timezone: timezone,
      };
    } catch (error) {
      console.error("Time fetch error:", error);
      return { error: "Failed to fetch time data" };
    }
  },
});

export const classifyIntent = internalAction({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const message = args.message.toLowerCase();
    
    // Simple intent classification based on keywords
    const weatherKeywords = ["weather", "temperature", "rain", "sunny", "cloudy", "forecast", "hot", "cold"];
    const newsKeywords = ["news", "headlines", "latest", "breaking", "current events", "what's happening"];
    const timeKeywords = ["time", "date", "what time", "current time", "clock"];
    
    if (weatherKeywords.some(keyword => message.includes(keyword))) {
      return { intent: "weather", confidence: 0.8 };
    }
    
    if (newsKeywords.some(keyword => message.includes(keyword))) {
      return { intent: "news", confidence: 0.8 };
    }
    
    if (timeKeywords.some(keyword => message.includes(keyword))) {
      return { intent: "time", confidence: 0.9 };
    }
    
    return { intent: "general", confidence: 0.6 };
  },
});
