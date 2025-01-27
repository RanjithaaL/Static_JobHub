import { CreateMLCEngine, prebuiltAppConfig } from '@mlc-ai/web-llm';

class WebLLMService {
  static instance = null;
  
  constructor() {
    if (WebLLMService.instance) {
      return WebLLMService.instance;
    }
    this.engine = null;
    this.initialized = false;
    this.modelId = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
    WebLLMService.instance = this;
  }

  async initialize(progressCallback = null) {
    if (!this.initialized) {
      try {
        console.log("Starting initialization...");
        const modelConfig = prebuiltAppConfig.model_list.find(
          model => model.model_id === this.modelId
        );

        if (!modelConfig) {
          throw new Error(`Model ${this.modelId} not found`);
        }

        this.engine = await CreateMLCEngine(this.modelId, {
          initProgressCallback: (progress) => {
            if (progressCallback) progressCallback(progress);
          }
        });

        this.initialized = true;
        console.log("Engine initialized successfully");
        return true;
      } catch (error) {
        console.error("Initialization error:", error);
        throw error;
      }
    }
    return false;
  }

  async generateCompanySummary(jobDescription) {
    if (!this.initialized || !this.engine) {
      throw new Error('Engine not initialized');
    }

    const prompt = {
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes job descriptions and provides insights about company culture and work environment.'
        },
        {
          role: 'user',
          content: `Based on the following job description, summarize what working at this company might be like.
                   Focus on company culture, work environment, and potential growth opportunities.
                   Job Description: ${jobDescription}
                   Please provide a concise summary in 2-3 paragraphs.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      stream: false
    };

    try {
      const response = await this.engine.chat.completions.create(prompt);
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating company summary:', error);
      throw error;
    }
  }

  async detectSpam(jobDescription, companyName, salary) {
    if (!this.initialized || !this.engine) {
      throw new Error('Engine not initialized');
    }

    const prompt = {
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant specialized in detecting fraudulent job postings.'
        },
        {
          role: 'user',
          content: `Analyze the following job posting for potential spam or scam indicators.
                   Consider factors like unrealistic salary promises, vague descriptions, and suspicious requirements.
                   
                   Job Description: ${jobDescription}
                   Company Name: ${companyName}
                   Salary: ${salary}
                   
                   Respond with either "SPAM" or "LEGITIMATE" followed by a brief explanation.`
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      stream: false
    };

    try {
      const response = await this.engine.chat.completions.create(prompt);
      const responseText = response.choices[0].message.content.trim();
      const isSpam = responseText.toLowerCase().includes('spam');
      const explanation = responseText.split('\n')[1] || '';

      return {
        isSpam,
        explanation
      };
    } catch (error) {
      console.error('Error detecting spam:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const webLlmService = new WebLLMService();