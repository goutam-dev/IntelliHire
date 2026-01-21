/**
 * AI Agent 1: JD Information Extractor (Director 1)
 * 
 * Responsibility: Extract structured information from Job Description
 * 
 * Input: Raw Job Description text
 * Output: Structured JSON with job requirements, skills, experience, etc.
 * 
 * Constraints:
 * - No scoring
 * - No assumptions
 * - Extract only what is explicitly present
 * 
 * Part of Multi-Agent LLM Council System for FYP
 */

const axios = require('axios');

/**
 * Agent 1: Extract structured information from Job Description
 * @param {String} jobDescriptionText - Raw job description text
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Structured JD information
 */
async function extractJDInformation(jobDescriptionText, options = {}) {
  const startTime = Date.now();
  
  console.log('\n========== DIRECTOR 1: JD INFORMATION EXTRACTOR ==========');
  console.log('[Director 1] Task: Extract structured information from Job Description');
  console.log(`[Director 1] Input length: ${jobDescriptionText?.length || 0} characters`);
  
  try {
    // Validate input
    if (!jobDescriptionText || typeof jobDescriptionText !== 'string') {
      throw new Error('Invalid job description text');
    }
    
    if (jobDescriptionText.length < 50) {
      throw new Error('Job description text is too short for meaningful analysis');
    }
    
    // Build the extraction prompt
    console.log('[Director 1] Step 1: Building extraction prompt...');
    const prompt = buildJDExtractionPrompt(jobDescriptionText);
    console.log('[Director 1] ✓ Prompt built successfully');
    
    // Call LLM API (HuggingFace by default, can use others)
    console.log('[Director 1] Step 2: Calling LLM API for extraction...');
    const extractedData = await callLLMForExtraction(prompt, options);
    console.log('[Director 1] ✓ LLM extraction completed');
    
    // Validate and clean the extracted data
    console.log('[Director 1] Step 3: Validating extracted data...');
    const validatedData = validateJDExtraction(extractedData);
    console.log('[Director 1] ✓ Validation complete');
    console.log('[Director 1] DECISION: Extracted job requirements:');
    console.log(`  - Job Title: ${validatedData.job_title}`);
    console.log(`  - Required Skills: ${validatedData.required_skills?.length || 0} skills`);
    console.log(`  - Experience Required: ${validatedData.experience_required || 'Not specified'}`);
    console.log(`  - Education: ${validatedData.education_requirements || 'Not specified'}`);
    
    const processingTime = Date.now() - startTime;
    console.log(`[Director 1] ✓ Completed in ${processingTime}ms`);
    console.log('========== DIRECTOR 1: COMPLETED ==========\n');
    
    return {
      success: true,
      data: validatedData,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        agent: 'JD_Information_Extractor',
        model: options.model || 'huggingface/mistral-7b'
      }
    };
    
  } catch (error) {
    console.error('Agent 1 (JD Extractor) Error:', error);
    return {
      success: false,
      error: error.message,
      data: getDefaultJDStructure(),
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        agent: 'JD_Information_Extractor'
      }
    };
  }
}

/**
 * Build the prompt for JD extraction
 * @param {String} jobDescriptionText - Raw JD text
 * @returns {String} - Formatted prompt
 */
function buildJDExtractionPrompt(jobDescriptionText) {
  return `You are an expert AI agent specialized in extracting structured information from job descriptions.

ROLE: JD Information Extractor (Director 1)

STRICT INSTRUCTIONS:
1. Extract ONLY information that is explicitly stated in the job description
2. Do NOT make assumptions or infer information
3. Do NOT provide any scoring or evaluation
4. Do NOT compare with any resume
5. Output ONLY valid JSON with the exact structure specified below

JOB DESCRIPTION TEXT:
"""
${jobDescriptionText}
"""

REQUIRED OUTPUT FORMAT (JSON ONLY):
{
  "job_title": "<extract the exact job title>",
  "required_skills": ["<list all required/mandatory skills mentioned>"],
  "preferred_skills": ["<list all preferred/nice-to-have skills mentioned>"],
  "minimum_experience_years": "<extract years of experience required, e.g., '3-5 years', '2+ years', or 'Not specified'>",
  "education_requirements": "<extract education requirements, e.g., 'Bachelor's in Computer Science' or 'Not specified'>",
  "job_responsibilities": ["<list main job responsibilities>"],
  "keywords": ["<extract important technical keywords and technologies>"]
}

EXTRACTION RULES:
- If a field is not mentioned, use empty array [] or "Not specified"
- For skills, separate required vs preferred based on language like "must have", "required" vs "nice to have", "preferred"
- Extract exact years mentioned for experience
- Include all technical terms, frameworks, tools, and technologies
- Be precise and literal - do not paraphrase excessively

OUTPUT (JSON ONLY, NO OTHER TEXT):`;
}

/**
 * Call LLM API for extraction
 * @param {String} prompt - Extraction prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Extracted structured data
 */
async function callLLMForExtraction(prompt, options = {}) {
  const apiProvider = options.apiProvider || process.env.AI_API_PROVIDER || 'openrouter';
  
  if (apiProvider === 'openrouter') {
    return await callOpenRouterAPI(prompt, options);
  } else if (apiProvider === 'huggingface') {
    return await callHuggingFaceAPI(prompt, options);
  } else if (apiProvider === 'openai') {
    return await callOpenAIAPI(prompt, options);
  } else if (apiProvider === 'local') {
    return await callLocalLLM(prompt, options);
  } else {
    // Fallback: Use rule-based extraction
    return await ruleBasedExtraction(prompt);
  }
}

/**
 * Call OpenRouter API (FREE models available)
 * @param {String} prompt - Extraction prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Extracted data
 */
async function callOpenRouterAPI(prompt, options = {}) {
  try {
    const apiKey = options.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenRouter API key not found, using rule-based extraction');
      return await ruleBasedExtraction(prompt);
    }
    
    // Use free models available on OpenRouter
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
        max_tokens: 1500
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
      console.warn('Invalid OpenRouter response format, using rule-based');
      return await ruleBasedExtraction(prompt);
    }
    
    const generatedText = response.data.choices[0].message.content;
    return parseJSONFromLLMResponse(generatedText);
    
  } catch (error) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    // Fallback to rule-based extraction
    return await ruleBasedExtraction(prompt);
  }
}

/**
 * Call HuggingFace Inference API (FREE)
 * @param {String} prompt - Extraction prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Extracted data
 */
async function callHuggingFaceAPI(prompt, options = {}) {
  try {
    const apiKey = options.huggingfaceApiKey || process.env.HUGGINGFACE_API_KEY;
    
    if (!apiKey) {
      console.warn('HuggingFace API key not found, using rule-based extraction');
      return await ruleBasedExtraction(prompt);
    }
    
    const model = options.model || 'mistralai/Mistral-7B-Instruct-v0.2';
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    
    const response = await axios.post(
      apiUrl,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.0, // Zero temperature for completely deterministic extraction
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    // Parse the response
    const generatedText = response.data[0]?.generated_text || response.data;
    return parseJSONFromLLMResponse(generatedText);
    
  } catch (error) {
    console.error('HuggingFace API Error:', error.message);
    // Fallback to rule-based extraction
    return await ruleBasedExtraction(prompt);
  }
}

/**
 * Call OpenAI API (if configured)
 * @param {String} prompt - Extraction prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Extracted data
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
            content: 'You are an expert at extracting structured information from job descriptions. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.0,
        max_tokens: 1000
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
 * Call local LLM (Ollama or similar)
 * @param {String} prompt - Extraction prompt
 * @param {Object} options - API options
 * @returns {Promise<Object>} - Extracted data
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
          num_predict: 1000
        }
      },
      {
        timeout: 60000 // 60 second timeout for local models
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
 * Rule-based extraction (fallback when no AI API is available)
 * Uses regex and keyword matching
 * @param {String} prompt - Contains the JD text
 * @returns {Promise<Object>} - Extracted data
 */
async function ruleBasedExtraction(prompt) {
  // Extract the JD text from the prompt
  const jdMatch = prompt.match(/JOB DESCRIPTION TEXT:\s*"""\s*([\s\S]*?)\s*"""/);
  const jdText = jdMatch ? jdMatch[1] : '';
  
  const extracted = getDefaultJDStructure();
  
  // Extract job title (usually in first few lines)
  const titleMatch = jdText.match(/(?:job title|position|role):\s*([^\n]+)/i) ||
                     jdText.match(/^([^\n]+)/);
  if (titleMatch) {
    extracted.job_title = titleMatch[1].trim();
  }
  
  // Extract skills using common patterns
  const skillsSection = jdText.match(/(?:required skills|skills|technical skills|must have):\s*([\s\S]*?)(?:\n\n|required qualifications|experience|education|$)/i);
  if (skillsSection) {
    const skillsText = skillsSection[1];
    // Extract comma-separated or bullet-pointed skills
    const skills = skillsText
      .split(/[,\n•\-\*]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && s.length < 50);
    extracted.required_skills = skills.slice(0, 15); // Limit to top 15
  }
  
  // Extract preferred skills
  const preferredSection = jdText.match(/(?:preferred|nice to have|bonus|plus):\s*([\s\S]*?)(?:\n\n|required|experience|education|$)/i);
  if (preferredSection) {
    const preferredText = preferredSection[1];
    const skills = preferredText
      .split(/[,\n•\-\*]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && s.length < 50);
    extracted.preferred_skills = skills.slice(0, 10);
  }
  
  // Extract experience years
  const expMatch = jdText.match(/(\d+)[\+\-]?\s*(?:to\s*\d+\s*)?years?\s+(?:of\s+)?experience/i);
  if (expMatch) {
    extracted.minimum_experience_years = expMatch[0];
  }
  
  // Extract education
  const eduMatch = jdText.match(/(?:bachelor|master|phd|degree|b\.?s\.?|m\.?s\.?|education):\s*([^\n]+)/i);
  if (eduMatch) {
    extracted.education_requirements = eduMatch[0].trim();
  }
  
  // Extract responsibilities
  const respSection = jdText.match(/(?:responsibilities|duties|you will):\s*([\s\S]*?)(?:\n\n|required|qualifications|skills|$)/i);
  if (respSection) {
    const respText = respSection[1];
    const responsibilities = respText
      .split(/[\n•\-\*]/)
      .map(r => r.trim())
      .filter(r => r.length > 10 && r.length < 200);
    extracted.job_responsibilities = responsibilities.slice(0, 10);
  }
  
  // Extract technical keywords
  const techKeywords = extractTechnicalKeywords(jdText);
  extracted.keywords = techKeywords;
  
  return extracted;
}

/**
 * Extract technical keywords from text
 * @param {String} text - Input text
 * @returns {Array} - List of technical keywords
 */
function extractTechnicalKeywords(text) {
  const commonTechTerms = [
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go', 'Rust',
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'Cassandra',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'CI/CD',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision',
    'REST', 'GraphQL', 'API', 'Microservices', 'Agile', 'Scrum',
    'HTML', 'CSS', 'TypeScript', 'SQL', 'NoSQL', 'Linux', 'Unix'
  ];
  
  const found = [];
  const lowerText = text.toLowerCase();
  
  for (const term of commonTechTerms) {
    if (lowerText.includes(term.toLowerCase())) {
      found.push(term);
    }
  }
  
  return [...new Set(found)]; // Remove duplicates
}

/**
 * Parse JSON from LLM response (handles markdown code blocks, etc.)
 * @param {String} response - LLM response text
 * @returns {Object} - Parsed JSON object
 */
function parseJSONFromLLMResponse(response) {
  try {
    // Try direct JSON parse first
    return JSON.parse(response);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                      response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (e2) {
        console.error('Failed to parse JSON from LLM response');
        return getDefaultJDStructure();
      }
    }
    
    return getDefaultJDStructure();
  }
}

/**
 * Validate and clean extracted JD data
 * @param {Object} data - Extracted data
 * @returns {Object} - Validated data
 */
function validateJDExtraction(data) {
  const validated = {
    job_title: data.job_title || 'Not specified',
    required_skills: Array.isArray(data.required_skills) ? data.required_skills : [],
    preferred_skills: Array.isArray(data.preferred_skills) ? data.preferred_skills : [],
    minimum_experience_years: data.minimum_experience_years || 'Not specified',
    education_requirements: data.education_requirements || 'Not specified',
    job_responsibilities: Array.isArray(data.job_responsibilities) ? data.job_responsibilities : [],
    keywords: Array.isArray(data.keywords) ? data.keywords : []
  };
  
  // Clean arrays (remove empty strings, trim)
  validated.required_skills = validated.required_skills
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  validated.preferred_skills = validated.preferred_skills
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  validated.job_responsibilities = validated.job_responsibilities
    .map(r => r.trim())
    .filter(r => r.length > 0);
  
  validated.keywords = validated.keywords
    .map(k => k.trim())
    .filter(k => k.length > 0);
  
  return validated;
}

/**
 * Get default JD structure
 * @returns {Object} - Default structure
 */
function getDefaultJDStructure() {
  return {
    job_title: 'Not specified',
    required_skills: [],
    preferred_skills: [],
    minimum_experience_years: 'Not specified',
    education_requirements: 'Not specified',
    job_responsibilities: [],
    keywords: []
  };
}

module.exports = {
  extractJDInformation,
  buildJDExtractionPrompt,
  parseJSONFromLLMResponse,
  validateJDExtraction
};
