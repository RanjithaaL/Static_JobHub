const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Middleware setup
app.use(cors({
  origin: process.env.CLIENT_URL || 'your_vercel_url',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

app.use(session({ 
  store: new FileStore({
    path: './sessions'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Middleware for token authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to scrape career page content
const scrapeCareerPage = async (url) => {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new'
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto(url, { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    const content = await page.evaluate(() => {
      const scripts = document.getElementsByTagName('script');
      const styles = document.getElementsByTagName('style');
      Array.from(scripts).forEach(script => script.remove());
      Array.from(styles).forEach(style => style.remove());
      
      return document.body.innerText;
    });

    return content.trim();
  } catch (error) {
    console.error('Error scraping career page:', error);
    throw new Error('Failed to scrape career page content');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Helper function to read jobs from GitHub
const readJobsFromGithub = async () => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/contents/data/jobs.json`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );
    
    const content = Buffer.from(response.data.content, 'base64').toString();
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading from GitHub:', error); 
    return [];
  }
};

// Helper function to update jobs in GitHub
const updateGithubJobs = async (jobs) => {
  try {
    const currentFile = await axios.get(
      `https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/contents/data/jobs.json`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    const updatedContent = Buffer.from(JSON.stringify(jobs, null, 2)).toString('base64');
    
    console.log('Updating GitHub with new jobs data');
    
    const response = await axios.put(
      `https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/contents/data/jobs.json`,
      {
        message: 'Update jobs.json via API',
        content: updatedContent,
        sha: currentFile.data.sha
      },
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log('GitHub update successful');
    return true;
  } catch (error) {
    console.error('Error updating GitHub repository:', error);
    throw error;
  }
};

// Add the proxy endpoint for career pages
app.get('/api/proxy-career-page', authenticateToken, async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    console.log('Starting to scrape:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    $('script, style, nav, header, footer, iframe, noscript, img, svg, button').remove();

    let content = '';
    const selectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '#content',
      '#main-content',
      '.job-description',
      '.career-content',
      '.about-company',
      '[role="main"]'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        content = element.text().trim();
        if (content.length > 100) break;
      }
    }

    if (!content || content.length < 100) {
      content = $('body').text().trim();
    }

    const cleanedText = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ')
      .trim();

    if (!cleanedText || cleanedText.length < 50) {
      return res.status(400).json({ error: 'Insufficient content found on page' });
    }

    res.json({ content: cleanedText });

  } catch (error) {
    console.error('Error in proxy-career-page:', error);
    res.status(500).json({ 
      error: 'Failed to fetch career page',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Auth routes
app.get('/auth/github', (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL)}`;
  res.json({ url: githubAuthUrl });
});

app.post('/auth/github/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }); 

    const user = {
      id: userResponse.data.id,
      username: userResponse.data.login,
      name: userResponse.data.name || userResponse.data.login,
      email: userResponse.data.email
    };

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ user, token });
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Modify the POST /api/jobs endpoint
app.post('/api/jobs', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      companyName,
      location,
      domain,
      workType,
      employmentType,
      userType,
      salaryRange,
      applyLink,
      careerLink,
      userId,
      createdBy,
      companySummary,
      isSpam
    } = req.body;
    
    if (applyLink) {
      try {
        new URL(applyLink);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid apply link URL' });
      }
    }

    if (careerLink) {
      try {
        new URL(careerLink);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid career link URL' });
      }
    }

    const jobs = await readJobsFromGithub();

    const newJob = {
      id: jobs.length > 0 ? Math.max(...jobs.map(job => job.id)) + 1 : 1,
      title: title.trim(),
      description: description.trim(),
      companyName: companyName.trim(),
      location: location?.trim(),
      domain,
      workType,
      employmentType,
      userType,
      salaryRange,
      applyLink,
      careerLink,
      companySummary,
      isSpam,
      userId: userId || req.user.userId,
      createdBy: createdBy || req.user.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    jobs.push(newJob);
    await updateGithubJobs(jobs);
    
    res.status(201).json({
      message: 'Job created successfully',
      job: newJob
    });
  } catch (error) {
    console.error('Error creating job:', error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    res.status(500).json({ 
      error: 'Failed to create job',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Public jobs endpoint (no auth required)
app.get('/api/public/jobs', async (req, res) => {
  try {
    const jobs = await readJobsFromGithub();
    res.json(jobs);
  } catch (error) {
    console.error('Error reading jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get all jobs endpoint
app.get('/api/jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await readJobsFromGithub();
    const userId = req.query.userId;

    if (userId) {
      const userJobs = jobs.filter(job => String(job.userId) === String(userId));
      res.json(userJobs);
    } else {
      res.json(jobs);
    }
  } catch (error) {
    console.error('Error reading jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job endpoint
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const jobs = await readJobsFromGithub();
    const job = jobs.find(job => job.id === parseInt(req.params.id));
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Resume generation endpoint (no auth required)
app.post('/api/generate-resume', async (req, res) => {
  try {
    console.log('Received resume generation request:', req.body);
    
    // Validate required fields
    if (!req.body.fullName || !req.body.email) {
      return res.status(400).json({ error: 'Name and email are required fields' });
    }
    
    const {
      fullName,
      email,
      phone,
      location,
      summary,
      education,
      experience,
      skills,
      projects,
      certifications,
      languages,
      interests
    } = req.body;

    // Format the data for the prompt
    const educationText = education && education.length > 0 
      ? education.map(edu => 
          `${edu.school || ''} - ${edu.degree || ''} in ${edu.field || ''} (${edu.graduationYear || ''})`
        ).join('\n')
      : 'No education information provided';
    
    const experienceText = experience && experience.length > 0
      ? experience.map(exp => 
          `${exp.position || ''} at ${exp.company || ''} (${exp.startDate || ''} - ${exp.endDate || ''})\n${exp.description || ''}`
        ).join('\n\n')
      : 'No experience information provided';

    const prompt = `Create a professional resume for the following person:
    
Name: ${fullName}
Email: ${email}
Phone: ${phone || 'Not provided'}
Location: ${location || 'Not provided'}
Summary: ${summary || 'Not provided'}

Education:
${educationText}

Experience:
${experienceText}

Projects: ${projects || 'Not provided'}
Skills: ${skills || 'Not provided'}
Certifications: ${certifications || 'Not provided'}
Languages: ${languages || 'Not provided'}
Interests: ${interests || 'Not provided'}

Please format this as a professional resume with appropriate sections and formatting. Make it concise, well-structured, and highlight the most important achievements and skills.`;

    console.log('Sending prompt to Gemini API');
    
    // Get the Gemini model with correct configuration
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    // Generate content with safety settings
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });

    const response = await result.response;
    const generatedResume = response.text();
    
    console.log('Resume generated successfully');

    res.json({ resume: generatedResume });
  } catch (error) {
    console.error('Error generating resume:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to generate resume';
    let errorDetails = error.message;
    
    if (error.response) {
      errorMessage = 'API error';
      errorDetails = error.response.data?.error || error.response.statusText || error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});