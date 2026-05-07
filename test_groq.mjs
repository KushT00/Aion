import fetch from "node-fetch";

async function testGroqAgent() {
  const apiKey = "YOUR_GROQ_API_KEY";
  const model = "llama-3.3-70b-versatile";
  
  const systemPrompt = "You are a professional outreach specialist for our company. Write a professional, personalized introduction email using the data provided from the client and the company information provided in your knowledge base.";
  const userPrompt = "Write an email to Client: john@example.com / John Doe. Use the company outline provided.";

  console.log("🚀 Testing Groq AI Agent with Llama 3.3 70B...\n");
  console.log(`Prompt: ${userPrompt}\n`);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Groq AI Response successfully generated:\n");
    console.log("==========================================");
    console.log(data.choices[0].message.content);
    console.log("==========================================");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testGroqAgent();
