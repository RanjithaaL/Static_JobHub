import React from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';
import axios from 'axios';
import '../styles/LoginSignupPage.css';

const LoginSignupPage = () => {
  const navigate = useNavigate();

  const handleGithubLogin = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/github`);
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error initiating GitHub login:', error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Login</h1>
        <button onClick={handleGithubLogin} className="github-btn">
          <img src="/github-mark.png" alt="GitHub" className="github-icon" />
          GitHub
        </button>
      </div>
    </div>
  );
};

export default LoginSignupPage;
