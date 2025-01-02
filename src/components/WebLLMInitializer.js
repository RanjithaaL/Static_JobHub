import React, { useState, useEffect } from 'react';
import { webLlmService } from '../services/webLlmService';

const WebLLMInitializer = () => {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeLLM = async () => {
      try {
        await webLlmService.initialize();
      } catch (error) {
        console.error('Failed to initialize Web LLM:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeLLM();
  }, []);

  if (isInitializing) {
    return (
      <div className="llm-loading">
        <div className="loader"></div>
        <p className="llm-loading-text">Initializing AI Model...</p>
      </div>
    );
  }

  return null;
};

export default WebLLMInitializer; 