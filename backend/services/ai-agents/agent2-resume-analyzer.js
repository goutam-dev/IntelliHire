/**
 * AI Agent 2: Resume Technical Analyzer (Director 2)
 * 
 * Responsibility: Analyze resume content ONLY
 * Focus on: Technical skills, tools, frameworks, experience, projects, education
 * 
 * Input: Parsed resume text
 * Output: Structured JSON with technical analysis
 * 
 * Constraints:
 * - No JD comparison
 * - No scoring
 * - Resume-focused analysis only
 * 
 * Part of Multi-Agent LLM Council System for FYP
 */

const axios = require('axios');

/**
 * Agent 2: Analyze resume technical content
 * @param {String} resumeText - Parsed resume text
 * @param {Object} resumeSections - Pre-parsed resume sections (optional)
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Structured resume analysis
 */
async function analyzeResumeTechnical(resumeText, resumeSections = null, options = {}) {
  const startTime = Date.now();
  
  console.log('\n========== DIRECTOR 2: RESUME TECHNICAL ANALYZER ==========');
  console.log('[Director 2] Task: Analyze resume content and extract technical details');
  console.log(`[Director 2] Input length: ${resumeText?.length || 0} characters`);
  
  try {
    // Validate input
    if (!resumeText || typeof resumeText !== 'string') {
      throw new Error('Invalid resume text');
    }
    
    if (resumeText.length < 100) {
      throw new Error('Resume text is too short for meaningful analysis');
    }
    
    // Build the analysis prompt
    console.log('[Director 2] Step 1: Building analysis prompt...');
    const prompt = buildResumeAnalysisPrompt(resumeText, resumeSections);
    console.log('[Director 2] ✓ Prompt built successfully');
    
    // Call LLM API
    console.log('[Director 2] Step 2: Calling LLM API for analysis...');
    const analyzedData = await callLLMForAnalysis(prompt, options);
    console.log('[Director 2] ✓ LLM analysis completed');
    
    // Validate and enhance the analyzed data
    console.log('[Director 2] Step 3: Validating analyzed data...');
    const validatedData = validateResumeAnalysis(analyzedData, resumeText);
    console.log('[Director 2] ✓ Validation complete');
    console.log('[Director 2] DECISION: Resume analysis results:');
    console.log(`  - Technical Skills: ${validatedData.technical_skills?.length || 0} skills found`);
    console.log(`  - Total Experience: ${validatedData.total_experience || 'Not specified'}`);
    console.log(`  - Projects: ${validatedData.projects?.length || 0} projects`);
    console.log(`  - Education Level: ${validatedData.highest_education || 'Not specified'}`);
    
    const processingTime = Date.now() - startTime;
    console.log(`[Director 2] ✓ Completed in ${processingTime}ms`);
    console.log('========== DIRECTOR 2: COMPLETED ==========\n');
    
    return {
      success: true,
      data: validatedData,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        agent: 'Resume_Technical_Analyzer',
        model: options.model || 'huggingface/mistral-7b'
      }
    };
    
  } catch (error) {
    console.error('Agent 2 (Resume Analyzer) Error:', error);
    return {
      success: false,
      error: error.message,
      data: getDefaultResumeStructure(),
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        agent: 'Resume_Technical_Analyzer'
      }
    };
  }
}

/**
 * Build the prompt for resume analysis
 * @param {String} resumeText - Raw resume text
 * @param {Object} resumeSections - Pre-parsed sections
 * @returns {String} - Formatted prompt
 */
function buildResumeAnalysisPrompt(resumeText, resumeSections) {
  let sectionInfo = '';
  if (resumeSections) {
    sectionInfo = `\n\nPRE-PARSED SECTIONS (for context):
Experience Section: ${resumeSections.experience ? 'Available' : 'Not found'}
Education Section: ${resumeSections.education ? 'Available' : 'Not found'}
Skills Section: ${resumeSections.skills ? 'Available' : 'Not found'}
Projects Section: ${resumeSections.projects ? 'Available' : 'Not found'}`;
  }
  
  return `You are an expert AI agent specialized in analyzing resumes for technical content.

ROLE: Resume Technical Analyzer (Director 2)

STRICT INSTRUCTIONS:
1. Analyze ONLY the resume content provided
2. Do NOT compare with any job description
3. Do NOT provide any scoring or matching
4. Extract technical information objectively
5. Focus on skills, experience, projects, education, certifications
6. Output ONLY valid JSON with the exact structure specified below
${sectionInfo}

RESUME TEXT:
"""
${resumeText}
"""

REQUIRED OUTPUT FORMAT (JSON ONLY):
{
  "skills": ["<list all technical skills mentioned: programming languages, frameworks, tools, etc.>"],
  "years_of_experience": "<total years of professional experience, e.g., '5 years', '2-3 years', or 'Not specified'>",
  "projects": ["<list key projects with brief description>"],
  "education": "<highest education qualification, e.g., 'B.S. in Computer Science, MIT' or 'Not specified'>",
  "certifications": ["<list certifications and professional qualifications>"],
  "tools_and_technologies": ["<list specific tools, platforms, technologies used>"]
}

ANALYSIS RULES:
- Extract ALL technical skills mentioned (programming languages, frameworks, libraries, tools)
- Calculate total years of experience from work history
- Include project names and key technologies used
- Extract exact degree and institution for education
- List all certifications, licenses, courses
- Separate general skills from specific tools/technologies
- If information is not found, use empty array [] or "Not specified"
- Be comprehensive but accurate

OUTPUT (JSON ONLY, NO OTHER TEXT):`;
}

/**
 * Call LLM API for analysis
 * @param {String} prompt - Analysis prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Analyzed data
 */
async function callLLMForAnalysis(prompt, options = {}) {
  const apiProvider = options.apiProvider || process.env.AI_API_PROVIDER || 'openrouter';
  
  if (apiProvider === 'groq') {
    return await callGroqAPI(prompt, options);
  } else if (apiProvider === 'openrouter') {
    return await callOpenRouterAPI(prompt, options);
  } else if (apiProvider === 'huggingface') {
    return await callHuggingFaceAPI(prompt, options);
  } else if (apiProvider === 'openai') {
    return await callOpenAIAPI(prompt, options);
  } else if (apiProvider === 'local') {
    return await callLocalLLM(prompt, options);
  } else {
    // Fallback: Use rule-based analysis
    return await ruleBasedResumeAnalysis(prompt);
  }
}

/**
 * Call Groq API (FREE & FAST - RECOMMENDED)
 * @param {String} prompt - Analysis prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Analyzed data
 */
async function callGroqAPI(prompt, options = {}) {
  try {
    const apiKey = options.groqApiKey || process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.warn('Groq API key not found, using rule-based analysis');
      return await ruleBasedResumeAnalysis(prompt);
    }
    
    // Use Groq's fast models
    let model = options.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.0,
        max_tokens: 2000,
        seed: 42
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      console.warn('Invalid Groq response, using rule-based');
      return await ruleBasedResumeAnalysis(prompt);
    }
    
    const generatedText = response.data.choices[0].message.content;
    return parseJSONFromLLMResponse(generatedText);
    
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    return await ruleBasedResumeAnalysis(prompt);
  }
}

/**
 * Call OpenRouter API
 * @param {String} prompt - Analysis prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Analyzed data
 */
async function callOpenRouterAPI(prompt, options = {}) {
  try {
    const apiKey = options.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenRouter API key not found, using rule-based analysis');
      return await ruleBasedResumeAnalysis(prompt);
    }
    
    let model = options.model || process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-1.2b-instruct:free';
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.0,
        max_tokens: 2000,
        seed: 42
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
          'X-Title': 'IntelliHire'
        },
        timeout: 60000
      }
    );
    
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      console.warn('Invalid OpenRouter response, using rule-based');
      return await ruleBasedResumeAnalysis(prompt);
    }
    
    const generatedText = response.data.choices[0].message.content;
    return parseJSONFromLLMResponse(generatedText);
    
  } catch (error) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    return await ruleBasedResumeAnalysis(prompt);
  }
}

/**
 * Call HuggingFace Inference API
 * @param {String} prompt - Analysis prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Analyzed data
 */
async function callHuggingFaceAPI(prompt, options = {}) {
  try {
    const apiKey = options.huggingfaceApiKey || process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      console.warn('HuggingFace API key not found, using rule-based analysis');
      return await ruleBasedResumeAnalysis(prompt);
    }
    
    const model = options.model || 'mistralai/Mistral-7B-Instruct-v0.2';
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await axios.post(
      apiUrl,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 1500,
          temperature: 0.0,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const generatedText = response.data[0]?.generated_text || response.data;
    return parseJSONFromLLMResponse(generatedText);
    
  } catch (error) {
    console.error('HuggingFace API Error:', error.message);
    return await ruleBasedResumeAnalysis(prompt);
  }
}

/**
 * Call OpenAI API
 * @param {String} prompt - Analysis prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Analyzed data
 */
async function callOpenAIAPI(prompt, options = {}) {
  try {
    const apiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: options.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing resumes and extracting technical information. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.0,
        max_tokens: 1500,
        seed: 42
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const generatedText = response.data.choices[0].message.content;
    return parseJSONFromLLMResponse(generatedText);
    
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw error;
  }
}

/**
 * Call local LLM
 * @param {String} prompt - Analysis prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Analyzed data
 */
async function callLocalLLM(prompt, options = {}) {
  try {
    const localApiUrl = options.localApiUrl || process.env.LOCAL_LLM_URL || 'http://localhost:11434/api/generate';
    
    const response = await axios.post(
      localApiUrl,
      {
        model: options.model || 'mistral',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.0,
          num_predict: 1500
        }
      },
      {
        timeout: 60000
      }
    );
    
    const generatedText = response.data.response;
    return parseJSONFromLLMResponse(generatedText);
    
  } catch (error) {
    console.error('Local LLM Error:', error.message);
    throw error;
  }
}

/**
 * Rule-based resume analysis (fallback)
 * @param {String} prompt - Contains the resume text
 * @returns {Promise<Object>} - Analyzed data
 */
async function ruleBasedResumeAnalysis(prompt) {
  // Extract the resume text from prompt
  const resumeMatch = prompt.match(/RESUME TEXT:\s*"""\s*([\s\S]*?)\s*"""/);
  const resumeText = resumeMatch ? resumeMatch[1] : '';
  
  const analyzed = getDefaultResumeStructure();
  
  // Extract skills using common patterns and keywords
  const skills = extractSkillsFromText(resumeText);
  analyzed.skills = skills;
  
  // Extract years of experience
  const yearsOfExp = extractYearsOfExperience(resumeText);
  analyzed.years_of_experience = yearsOfExp;
  
  // Extract projects
  const projects = extractProjects(resumeText);
  analyzed.projects = projects;
  
  // Extract education
  const education = extractEducation(resumeText);
  analyzed.education = education;
  
  // Extract certifications
  const certifications = extractCertifications(resumeText);
  analyzed.certifications = certifications;
  
  // Extract tools and technologies
  const tools = extractToolsAndTechnologies(resumeText);
  analyzed.tools_and_technologies = tools;
  
  return analyzed;
}

/**
 * Extract skills from resume text
 * @param {String} text - Resume text
 * @returns {Array} - List of skills
 */
function extractSkillsFromText(text) {
  const skills = new Set();
  const lowerText = text.toLowerCase();
  
  // Common programming languages
  const languages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 
    'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'R', 'MATLAB', 'Perl', 'Bash',
    'HTML', 'CSS', 'SQL', 'NoSQL'
  ];
  
  // Frameworks and libraries
  const frameworks = [
    'React', 'Angular', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt.js',
    'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 
    'Laravel', 'Ruby on Rails', 'ASP.NET', '.NET Core',
    'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy'
  ];
  
  // Databases
  const databases = [
    'MongoDB', 'PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'Redis', 
    'Cassandra', 'DynamoDB', 'Firebase', 'Elasticsearch', 'SQLite'
  ];
  
  // Cloud and DevOps
  const cloudDevOps = [
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 
    'GitLab CI', 'GitHub Actions', 'Terraform', 'Ansible', 'CI/CD'
  ];
  
  // Other tools
  const tools = [
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 
    'Postman', 'Swagger', 'REST API', 'GraphQL', 'WebSocket',
    'Linux', 'Unix', 'Windows Server', 'Apache', 'Nginx'
  ];
  
  const allTechTerms = [...languages, ...frameworks, ...databases, ...cloudDevOps, ...tools];
  
  for (const term of allTechTerms) {
    if (lowerText.includes(term.toLowerCase())) {
      skills.add(term);
    }
  }
  
  // Also look for skills section explicitly
  const skillsSection = text.match(/(?:^|\n)(?:technical skills|skills|core competencies):\s*([\s\S]*?)(?:\n\n|experience|education|$)/i);
  if (skillsSection) {
    const skillsText = skillsSection[1];
    const extractedSkills = skillsText
      .split(/[,\n•\-\*|]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && s.length < 30);
    
    extractedSkills.forEach(s => skills.add(s));
  }
  
  return Array.from(skills).slice(0, 30); // Limit to 30 skills
}

/**
 * Extract years of experience from resume
 * @param {String} text - Resume text
 * @returns {String} - Years of experience
 */
function extractYearsOfExperience(text) {
  // Look for explicit mentions
  const expMatch = text.match(/(\d+)[\+]?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience/i);
  if (expMatch) {
    return expMatch[0];
  }
  
  // Try to calculate from work history dates
  const datePattern = /(\d{4})\s*[-–]\s*(?:(\d{4})|(?:present|current))/gi;
  const matches = [...text.matchAll(datePattern)];
  
  if (matches.length > 0) {
    const currentYear = new Date().getFullYear();
    let totalMonths = 0;
    
    for (const match of matches) {
      const startYear = parseInt(match[1]);
      const endYear = match[2] ? parseInt(match[2]) : currentYear;
      const months = (endYear - startYear) * 12;
      totalMonths += months;
    }
    
    const years = Math.floor(totalMonths / 12);
    if (years > 0) {
      return `${years}+ years`;
    }
  }
  
  return 'Not specified';
}

/**
 * Extract projects from resume
 * @param {String} text - Resume text
 * @returns {Array} - List of projects
 */
function extractProjects(text) {
  const projects = [];
  
  // Look for projects section
  const projectsSection = text.match(/(?:^|\n)(?:projects|key projects|academic projects):\s*([\s\S]*?)(?:\n\n|experience|education|skills|certifications|$)/i);
  
  if (projectsSection) {
    const projectsText = projectsSection[1];
    const projectLines = projectsText
      .split(/\n/)
      .map(line => line.trim())
      .filter(line => line.length > 20 && line.length < 300);
    
    projects.push(...projectLines.slice(0, 8));
  }
  
  // Also look for project bullet points in experience section
  const projectBullets = text.match(/(?:developed|created|built|implemented|designed)\s+(?:a|an|the)?\s*[^.]+(?:project|application|system|platform|tool)/gi);
  if (projectBullets) {
    projects.push(...projectBullets.slice(0, 5));
  }
  
  return projects.slice(0, 10); // Limit to 10 projects
}

/**
 * Extract education from resume
 * @param {String} text - Resume text
 * @returns {String} - Education information
 */
function extractEducation(text) {
  // Look for degree patterns
  const degreePattern = /(?:bachelor|master|phd|doctorate|b\.?s\.?|m\.?s\.?|m\.?b\.?a\.?|b\.?tech|m\.?tech)\s+(?:of\s+)?(?:science|arts|engineering|business|technology)?\s+in\s+[^,\n]+/i;
  const degreeMatch = text.match(degreePattern);
  
  if (degreeMatch) {
    // Try to find associated institution
    const contextStart = Math.max(0, text.indexOf(degreeMatch[0]) - 100);
    const contextEnd = Math.min(text.length, text.indexOf(degreeMatch[0]) + degreeMatch[0].length + 100);
    const context = text.substring(contextStart, contextEnd);
    
    const universityPattern = /(?:university|college|institute|school)\s+(?:of\s+)?[^,\n]+/i;
    const uniMatch = context.match(universityPattern);
    
    if (uniMatch) {
      return `${degreeMatch[0]}, ${uniMatch[0]}`;
    }
    
    return degreeMatch[0];
  }
  
  // Look for education section
  const eduSection = text.match(/(?:^|\n)(?:education|academic background):\s*([^\n]+)/i);
  if (eduSection) {
    return eduSection[1].trim();
  }
  
  return 'Not specified';
}

/**
 * Extract certifications from resume
 * @param {String} text - Resume text
 * @returns {Array} - List of certifications
 */
function extractCertifications(text) {
  const certifications = [];
  
  // Look for certifications section
  const certSection = text.match(/(?:^|\n)(?:certifications?|certificates?|licenses?):\s*([\s\S]*?)(?:\n\n|experience|education|skills|projects|$)/i);
  
  if (certSection) {
    const certText = certSection[1];
    const certs = certText
      .split(/[\n•\-\*]/)
      .map(c => c.trim())
      .filter(c => c.length > 5 && c.length < 100);
    
    certifications.push(...certs);
  }
  
  // Look for common certifications
  const commonCerts = [
    'AWS Certified', 'Azure Certified', 'GCP Certified',
    'PMP', 'Scrum Master', 'CISSP', 'CEH',
    'Oracle Certified', 'Microsoft Certified', 'Cisco Certified'
  ];
  
  const lowerText = text.toLowerCase();
  for (const cert of commonCerts) {
    if (lowerText.includes(cert.toLowerCase())) {
      const match = text.match(new RegExp(cert + '[^\\n.]{0,50}', 'i'));
      if (match && !certifications.includes(match[0])) {
        certifications.push(match[0]);
      }
    }
  }
  
  return certifications.slice(0, 10); // Limit to 10 certifications
}

/**
 * Extract tools and technologies from resume
 * @param {String} text - Resume text
 * @returns {Array} - List of tools
 */
function extractToolsAndTechnologies(text) {
  const tools = new Set();
  const lowerText = text.toLowerCase();
  
  const commonTools = [
    'VS Code', 'Visual Studio', 'IntelliJ', 'Eclipse', 'PyCharm',
    'Postman', 'Insomnia', 'Swagger', 'SoapUI',
    'Tableau', 'Power BI', 'Looker', 'Grafana',
    'Figma', 'Adobe XD', 'Sketch', 'Photoshop',
    'Slack', 'Teams', 'Zoom', 'Trello', 'Asana',
    'Webpack', 'Vite', 'Babel', 'ESLint', 'Prettier',
    'Jest', 'Mocha', 'Cypress', 'Selenium', 'Pytest'
  ];
  
  for (const tool of commonTools) {
    if (lowerText.includes(tool.toLowerCase())) {
      tools.add(tool);
    }
  }
  
  return Array.from(tools).slice(0, 20);
}

/**
 * Parse JSON from LLM response
 * @param {String} response - LLM response text
 * @returns {Object} - Parsed JSON
 */
function parseJSONFromLLMResponse(response) {
  try {
    return JSON.parse(response);
  } catch (e) {
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                      response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e2) {
        console.error('Failed to parse JSON from LLM response');
        return getDefaultResumeStructure();
      }
    }
    
    return getDefaultResumeStructure();
  }
}

/**
 * Validate and clean resume analysis data
 * @param {Object} data - Analyzed data
 * @param {String} resumeText - Original resume text for validation
 * @returns {Object} - Validated data
 */
function validateResumeAnalysis(data, resumeText) {
  const validated = {
    skills: Array.isArray(data.skills) ? data.skills : [],
    years_of_experience: data.years_of_experience || 'Not specified',
    projects: Array.isArray(data.projects) ? data.projects : [],
    education: data.education || 'Not specified',
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
    tools_and_technologies: Array.isArray(data.tools_and_technologies) ? data.tools_and_technologies : []
  };
  
  // Clean arrays
  validated.skills = validated.skills
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 50);
  
  validated.projects = validated.projects
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  validated.certifications = validated.certifications
    .map(c => c.trim())
    .filter(c => c.length > 0);
  
  validated.tools_and_technologies = validated.tools_and_technologies
    .map(t => t.trim())
    .filter(t => t.length > 0 && t.length < 50);
  
  return validated;
}

/**
 * Get default resume structure
 * @returns {Object} - Default structure
 */
function getDefaultResumeStructure() {
  return {
    skills: [],
    years_of_experience: 'Not specified',
    projects: [],
    education: 'Not specified',
    certifications: [],
    tools_and_technologies: []
  };
}

module.exports = {
  analyzeResumeTechnical,
  buildResumeAnalysisPrompt,
  extractSkillsFromText,
  extractYearsOfExperience,
  validateResumeAnalysis
};
