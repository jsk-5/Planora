import { useState } from "react";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export function useChatGPT() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Start with the system message for context
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "You are a travel assistant. Search web for the names of places or cities relevant to the user's query, check for weather and temperature. Do not include any other information.",
    },
  ]);

  const sendMessage = async (userMessage) => {
    setLoading(true);
    setError(null);

    // Add the new user message to the conversation
    const updatedMessages = [
      ...messages,
      { role: "user", content: userMessage },
    ];

    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4",
        messages: updatedMessages,
      });

      // Add the assistant's reply to the conversation
      const assistantMessage = res.choices[0].message.content;
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: assistantMessage },
      ]);
      return assistantMessage;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading, error, messages };
}
