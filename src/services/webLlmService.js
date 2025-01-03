import { ChatModule } from '@mlc-ai/web-llm';

class WebLLMService {
    constructor() {
      this.chat = null;
      this.initialized = false;
    }
  
    async initialize() {
      if (!this.initialized) {
        try {
          this.chat = new ChatModule();
          await this.chat.reload("Llama-2-7b-chat-q4f32_1", {
            repetition_penalty: 1.0,
            temperature: 0.7,
            max_gen_len: 1024
          });
          
          this.initialized = true;
          console.log("Chat initialized successfully");
        } catch (error) {
          console.error("Initialization error:", error);
          throw error;
        }
      }
    }

    async generateCompanySummary(jobDescription) {
      await this.initialize();
      
      const prompt = `
        Based on the following job description, summarize what working at this company might be like.
        Focus on company culture, work environment, and potential growth opportunities.
        Job Description: ${jobDescription}
        
        Please provide a concise summary in 2-3 paragraphs.
      `;

      const response = await this.chat.generate(prompt);
      return response.trim();
    }

    async detectSpam(jobDescription, companyName, salary) {
      await this.initialize();
      
      const prompt = `
        Analyze the following job posting for potential spam or scam indicators.
        Consider factors like unrealistic salary promises, vague descriptions, and suspicious requirements.
        
        Job Description: ${jobDescription}
        Company Name: ${companyName}
        Salary: ${salary}
        
        Respond with either "SPAM" or "LEGITIMATE" followed by a brief explanation.
      `;

      const response = await this.chat.generate(prompt);
      const responseText = response.trim();
      const isSpam = responseText.toLowerCase().includes('spam');
      const explanation = responseText.split('\n')[1] || '';
      
      return {
        isSpam,
        explanation
      };
    }
}

export const webLlmService = new WebLLMService();