import React, { useState, useEffect } from 'react';
import { webLlmService } from '../services/webLlmService';

const WebLLMInitializer = () => {
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeLLM = async () => {
      try {
        await webLlmService.initialize((progress) => {
          setStatus(`Loading model: ${progress.text} (${Math.round(progress.progress * 100)}%)`);
        });
      } catch (error) {
        console.error('Failed to initialize Web LLM:', error);
        setError(`Failed to initialize AI model: ${error.message}`);
      }
    };

    initializeLLM();
  }, []);

  if (error) {
    return (
      <div className="llm-error">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (status) {
    return (
      <div className="llm-loading">
        <div className="loader"></div>
        <p className="llm-loading-text">{status}</p>
      </div>
    );
  }

  return null;
};

export default WebLLMInitializer; 