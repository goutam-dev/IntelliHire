/**
 * AI Agent 3: Semantic Matching & Scoring Agent (Director 3)
 * 
 * Responsibility: Compare JD structured data with Resume structured data
 * Perform semantic similarity, not just keyword matching
 * 
 * Scoring Criteria:
 * - Skills Match (40%)
 * - Experience Match (25%)
 * - Project Relevance (20%)
 * - Education & Certifications (15%)
 * 
 * Constraints:
 * - Explain reasoning briefly
 * - No final hiring decision
 * 
 * Part of Multi-Agent LLM Council System for FYP
 */

const axios = require('axios');

/**
 * Agent 3: Compare JD and Resume, provide semantic matching scores
 * @param {Object} jdData - Structured JD data from Agent 1
 * @param {Object} resumeData - Structured resume data from Agent 2
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Matching scores and analysis
 */
async function performSemanticMatching(jdData, resumeData, options = {}) {
  const startTime = Date.now();
  
  console.log('\n========== DIRECTOR 3: SEMANTIC MATCHING & SCORING ==========');
  console.log('[Director 3] Task: Compare JD and Resume, perform semantic matching');
  console.log('[Director 3] Scoring criteria: Skills(40%) + Experience(25%) + Projects(20%) + Education(15%)');
  
  try {
    // Validate inputs
    if (!jdData || !resumeData) {
      throw new Error('Both JD data and Resume data are required');
    }
    
    // Perform semantic matching using LLM or rule-based approach
    let matchingResult;
    
    if (options.useLLM !== false) {
      // Try LLM-based semantic matching first
      console.log('[Director 3] Step 1: Attempting LLM-based semantic matching...');
      try {
        matchingResult = await llmBasedMatching(jdData, resumeData, options);
        console.log('[Director 3] ✓ LLM-based matching completed');
      } catch (error) {
        console.warn('[Director 3] ⚠ LLM-based matching failed, falling back to rule-based:', error.message);
        matchingResult = await ruleBasedMatching(jdData, resumeData);
        console.log('[Director 3] ✓ Rule-based matching completed');
      }
    } else {
      // Use rule-based matching directly
      console.log('[Director 3] Step 1: Using rule-based matching...');
      matchingResult = await ruleBasedMatching(jdData, resumeData);
      console.log('[Director 3] ✓ Rule-based matching completed');
    }
    
    // Validate scores (ensure they're within limits)
    console.log('[Director 3] Step 2: Validating matching scores...');
    const validatedResult = validateMatchingScores(matchingResult);
    console.log('[Director 3] ✓ Validation complete');
    console.log('[Director 3] DECISION: Matching scores breakdown:');
    console.log(`  - Skills Match: ${validatedResult.skill_match_score}/40`);
    console.log(`  - Experience Match: ${validatedResult.experience_match_score}/25`);
    console.log(`  - Project Relevance: ${validatedResult.project_relevance_score}/20`);
    console.log(`  - Education Match: ${validatedResult.education_score}/15`);
    console.log(`  - OVERALL SCORE: ${validatedResult.overall_score}/100`);
    
    const processingTime = Date.now() - startTime;
    console.log(`[Director 3] ✓ Completed in ${processingTime}ms`);
    console.log('========== DIRECTOR 3: COMPLETED ==========\n');
    
    return {
      success: true,
      data: validatedResult,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        agent: 'Semantic_Matching_Scoring',
        model: options.model || 'rule-based',
        method: options.useLLM !== false ? 'llm-enhanced' : 'rule-based'
      }
    };
    
  } catch (error) {
    console.error('Agent 3 (Semantic Matching) Error:', error);
    return {
      success: false,
      error: error.message,
      data: getDefaultMatchingStructure(),
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        agent: 'Semantic_Matching_Scoring'
      }
    };
  }
}

/**
 * LLM-based semantic matching
 * @param {Object} jdData - JD structured data
 * @param {Object} resumeData - Resume structured data
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Matching result
 */
async function llmBasedMatching(jdData, resumeData, options = {}) {
  const prompt = buildMatchingPrompt(jdData, resumeData);
  
  const apiProvider = options.apiProvider || process.env.AI_API_PROVIDER || 'openrouter';
  
  let llmResult;
  
  if (apiProvider === 'groq') {
    llmResult = await callGroqAPI(prompt, options);
  } else if (apiProvider === 'openrouter') {
    llmResult = await callOpenRouterAPI(prompt, options);
  } else if (apiProvider === 'huggingface') {
    llmResult = await callHuggingFaceAPI(prompt, options);
  } else if (apiProvider === 'openai') {
    llmResult = await callOpenAIAPI(prompt, options);
  } else if (apiProvider === 'local') {
    llmResult = await callLocalLLM(prompt, options);
  } else {
    throw new Error('Unsupported API provider');
  }
  
  return llmResult;
}

/**
 * Build prompt for semantic matching
 * @param {Object} jdData - JD data
 * @param {Object} resumeData - Resume data
 * @returns {String} - Prompt
 */
function buildMatchingPrompt(jdData, resumeData) {
  return `You are an expert AI agent specialized in semantic matching between job requirements and candidate qualifications.

ROLE: Semantic Matching & Scoring Agent (Director 3)

TASK: Compare the job description requirements with the candidate's resume and provide detailed scoring.

JOB DESCRIPTION DATA:
${JSON.stringify(jdData, null, 2)}

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

SCORING CRITERIA (USE EXACT FORMULA - DO NOT VARY):

IMPORTANT: You MUST calculate scores using the EXACT formulas below. Same inputs MUST produce IDENTICAL outputs every single time.

1. Skills Match (40 points max):
   Step 1: Count how many REQUIRED skills from JD are found in resume (use semantic matching)
   Step 2: Count how many PREFERRED skills from JD are found in resume
   Step 3: Calculate: min(40, (required_matches * 6) + (preferred_matches * 2))
   
   Example: If 4 required skills match and 3 preferred skills match:
   Score = min(40, (4 * 6) + (3 * 2)) = min(40, 24 + 6) = 30

2. Experience Match (25 points max):
   Step 1: Extract numeric years from both JD and resume (e.g., "3+ years" = 3)
   Step 2: Compare using this EXACT formula:
   - If candidate_years >= required_years: 25 points
   - If candidate_years == required_years - 1: 20 points  
   - If candidate_years == required_years - 2: 15 points
   - If candidate_years < required_years - 2: 10 points
   - If either is "Not specified": 15 points
   
   Example: Required=5, Candidate=6 → 25 points
   Example: Required=5, Candidate=4 → 20 points
   Example: Required=5, Candidate=3 → 15 points

3. Project Relevance (20 points max):
   Step 1: Count projects that mention ANY keyword/technology from JD
   Step 2: Calculate: min(20, relevant_project_count * 5)
   
   Example: If 3 projects are relevant: min(20, 3 * 5) = 15
   Example: If 5+ projects are relevant: min(20, 5 * 5) = 20

4. Education & Certifications (15 points max):
   Step 1: Compare education levels using hierarchy: Associate < Bachelor < Master < PhD
   - Meets or exceeds requirement: 10 points
   - One level below: 7 points
   - Two+ levels below or unclear: 3 points
   - Not specified on either side: 6 points
   
   Step 2: Add certification bonus: min(5, certification_count * 1.5) rounded
   Step 3: Total education_score = min(15, education_base + cert_bonus)
   
   Example: Bachelor required, Master achieved, 2 certs: min(15, 10 + 3) = 13

FINAL CALCULATION:
overall_score = skill_match_score + experience_match_score + project_relevance_score + education_score

CRITICAL RULES:
- Use temperature=0 logic: ALWAYS produce same output for same input
- Round all intermediate calculations to nearest integer
- Apply min() caps as shown
- Perform semantic matching: React.js = React, Node = Node.js, AWS = Amazon Web Services, etc.

REQUIRED OUTPUT FORMAT (JSON ONLY):
{
  "skill_match_score": <0-40>,
  "experience_match_score": <0-25>,
  "project_relevance_score": <0-20>,
  "education_score": <0-15>,
  "overall_score": <sum of all scores, 0-100>,
  "matched_skills": ["<list skills that match between JD and resume>"],
  "missing_skills": ["<list required skills not found in resume>"],
  "reasoning": "<brief explanation of the scoring, 2-3 sentences>"
}

IMPORTANT:
- Use EXACT formulas specified above - NO variation allowed
- For same inputs, ALWAYS produce IDENTICAL scores
- Perform SEMANTIC matching: React.js = React, Node = Node.js, etc.
- Round all decimals to nearest integer
- Sum components exactly: overall_score = skill_match + experience_match + project_relevance + education
- DO NOT use subjective judgment - follow formulas strictly

OUTPUT (JSON ONLY, NO OTHER TEXT):`;
}

/**
 * Rule-based semantic matching (fallback or default)
 * @param {Object} jdData - JD data
 * @param {Object} resumeData - Resume data
 * @returns {Promise<Object>} - Matching result
 */
async function ruleBasedMatching(jdData, resumeData) {
  const result = getDefaultMatchingStructure();
  
  // 1. Skills Match (40 points max)
  const skillsScore = calculateSkillsMatch(
    jdData.required_skills || [],
    jdData.preferred_skills || [],
    resumeData.skills || [],
    resumeData.tools_and_technologies || []
  );
  result.skill_match_score = skillsScore.score;
  result.matched_skills = skillsScore.matched;
  result.missing_skills = skillsScore.missing;
  
  // 2. Experience Match (25 points max)
  const experienceScore = calculateExperienceMatch(
    jdData.minimum_experience_years || 'Not specified',
    resumeData.years_of_experience || 'Not specified'
  );
  result.experience_match_score = experienceScore.score;
  
  // 3. Project Relevance (20 points max)
  const projectScore = calculateProjectRelevance(
    jdData.job_responsibilities || [],
    jdData.keywords || [],
    resumeData.projects || []
  );
  result.project_relevance_score = projectScore.score;
  
  // 4. Education & Certifications (15 points max)
  const educationScore = calculateEducationMatch(
    jdData.education_requirements || 'Not specified',
    resumeData.education || 'Not specified',
    resumeData.certifications || []
  );
  result.education_score = educationScore.score;
  
  // Calculate overall score
  result.overall_score = Math.min(100, 
    result.skill_match_score + 
    result.experience_match_score + 
    result.project_relevance_score + 
    result.education_score
  );
  
  // Generate reasoning
  result.reasoning = generateReasoning(result, skillsScore, experienceScore, projectScore, educationScore);
  
  return result;
}

/**
 * Calculate skills match score
 * @param {Array} requiredSkills - Required skills from JD
 * @param {Array} preferredSkills - Preferred skills from JD
 * @param {Array} candidateSkills - Candidate's skills
 * @param {Array} candidateTools - Candidate's tools
 * @returns {Object} - Score and details
 */
function calculateSkillsMatch(requiredSkills, preferredSkills, candidateSkills, candidateTools) {
  const allCandidateSkills = [...candidateSkills, ...candidateTools].map(s => s.toLowerCase());
  const matched = [];
  const missing = [];
  
  // Check required skills (weighted more heavily)
  let requiredMatches = 0;
  for (const skill of requiredSkills) {
    if (isSkillMatched(skill, allCandidateSkills)) {
      matched.push(skill);
      requiredMatches++;
    } else {
      missing.push(skill);
    }
  }
  
  // Check preferred skills
  let preferredMatches = 0;
  for (const skill of preferredSkills) {
    if (isSkillMatched(skill, allCandidateSkills) && !matched.includes(skill)) {
      matched.push(skill);
      preferredMatches++;
    }
  }
  
  // Calculate score (out of 40) - EXACT FORMULA matching LLM prompt
  // Each required skill match = 6 points (max 30 points)
  // Each preferred skill match = 2 points (max 10 points)
  // This ensures deterministic, count-based scoring
  const requiredScore = Math.min(30, requiredMatches * 6);
  const preferredScore = Math.min(10, preferredMatches * 2);
  
  const score = Math.min(40, requiredScore + preferredScore);
  
  return { score, matched, missing };
}

/**
 * Check if a skill is matched (semantic matching)
 * @param {String} jdSkill - Skill from JD
 * @param {Array} candidateSkills - Candidate's skills (lowercase)
 * @returns {Boolean} - Is matched
 */
function isSkillMatched(jdSkill, candidateSkills) {
  const lowerJdSkill = jdSkill.toLowerCase();
  
  // Direct match
  if (candidateSkills.some(s => s.includes(lowerJdSkill) || lowerJdSkill.includes(s))) {
    return true;
  }
  
  // Semantic matching (common synonyms and variations)
  const synonymMap = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts'],
    'reactjs': ['react', 'react.js'],
    'react': ['reactjs', 'react.js'],
    'nodejs': ['node', 'node.js'],
    'node.js': ['nodejs', 'node'],
    'vuejs': ['vue', 'vue.js'],
    'vue': ['vuejs', 'vue.js'],
    'angularjs': ['angular'],
    'postgresql': ['postgres', 'psql'],
    'mongodb': ['mongo'],
    'rest api': ['restful', 'rest', 'api'],
    'docker': ['containerization', 'containers'],
    'kubernetes': ['k8s'],
    'aws': ['amazon web services'],
    'gcp': ['google cloud platform', 'google cloud'],
    'azure': ['microsoft azure']
  };
  
  // Check if JD skill has synonyms
  const synonyms = synonymMap[lowerJdSkill] || [];
  for (const synonym of synonyms) {
    if (candidateSkills.some(s => s.includes(synonym))) {
      return true;
    }
  }
  
  // Check reverse (if candidate skill has synonyms)
  for (const [key, values] of Object.entries(synonymMap)) {
    if (values.includes(lowerJdSkill)) {
      if (candidateSkills.some(s => s.includes(key) || values.some(v => s.includes(v)))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Calculate experience match score
 * @param {String} requiredExp - Required experience from JD
 * @param {String} candidateExp - Candidate's experience
 * @returns {Object} - Score and details
 */
function calculateExperienceMatch(requiredExp, candidateExp) {
  // Parse required years
  const requiredYears = parseExperienceYears(requiredExp);
  const candidateYears = parseExperienceYears(candidateExp);
  
  if (requiredYears === null || candidateYears === null) {
    // Can't determine, give neutral score
    return { score: 15, reason: 'Experience requirements not clearly specified' };
  }
  
  // Calculate score (out of 25) - EXACT FORMULA matching LLM prompt
  if (candidateYears >= requiredYears) {
    // Meets or exceeds requirement - ALWAYS 25 points
    return { score: 25, reason: 'Meets or exceeds experience requirement' };
  } else {
    // Below requirement - use exact formula from prompt
    const deficit = requiredYears - candidateYears;
    if (deficit === 1) {
      return { score: 20, reason: 'One year below experience requirement' };
    } else if (deficit === 2) {
      return { score: 15, reason: 'Two years below experience requirement' };
    } else {
      return { score: 10, reason: 'Significantly below experience requirement' };
    }
  }
}

/**
 * Parse years of experience from text
 * @param {String} expText - Experience text
 * @returns {Number|null} - Years or null
 */
function parseExperienceYears(expText) {
  if (!expText || expText === 'Not specified') {
    return null;
  }
  
  // Look for patterns like "3 years", "5+ years", "2-3 years"
  const match = expText.match(/(\d+)[\+\-]?(?:\s*to\s*\d+)?/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return null;
}

/**
 * Calculate project relevance score
 * @param {Array} jobResponsibilities - JD responsibilities
 * @param {Array} jdKeywords - JD keywords
 * @param {Array} projects - Candidate's projects
 * @returns {Object} - Score and details
 */
function calculateProjectRelevance(jobResponsibilities, jdKeywords, projects) {
  if (projects.length === 0) {
    return { score: 0, reason: 'No projects listed' };
  }
  
  const allJdText = [...jobResponsibilities, ...jdKeywords].join(' ').toLowerCase();
  const keywords = jdKeywords.map(k => k.toLowerCase());
  
  // Count how many projects mention JD keywords/technologies - EXACT FORMULA from prompt
  let relevantProjectCount = 0;
  
  for (const project of projects) {
    const projectLower = project.toLowerCase();
    // Check if this project mentions any JD keyword
    for (const keyword of keywords) {
      if (projectLower.includes(keyword)) {
        relevantProjectCount++;
        break; // Count this project only once
      }
    }
  }
  
  // Calculate score: min(20, relevant_project_count * 5) - EXACT from prompt
  const score = Math.min(20, relevantProjectCount * 5);
  
  let reason = '';
  if (score >= 20) {
    reason = 'Projects highly relevant to job requirements';
  } else if (score >= 10) {
    reason = 'Projects moderately relevant to job requirements';
  } else if (score > 0) {
    reason = 'Some project relevance to job requirements';
  } else {
    reason = 'Limited project relevance to job requirements';
  }
  
  return { score, reason };
}

/**
 * Calculate education match score
 * @param {String} requiredEdu - Required education from JD
 * @param {String} candidateEdu - Candidate's education
 * @param {Array} certifications - Candidate's certifications
 * @returns {Object} - Score and details
 */
function calculateEducationMatch(requiredEdu, candidateEdu, certifications) {
  let educationBase = 0;
  let reason = '';
  
  const lowerRequired = requiredEdu.toLowerCase();
  const lowerCandidate = candidateEdu.toLowerCase();
  
  // Education match - EXACT FORMULA from LLM prompt
  if (requiredEdu === 'Not specified' || candidateEdu === 'Not specified') {
    educationBase = 6; // Neutral score if not specified
    reason = 'Education requirements not clearly specified';
  } else {
    // Check degree level match using hierarchy
    const degreeHierarchy = ['associate', 'bachelor', 'master', 'phd', 'doctorate'];
    
    let requiredLevel = -1;
    let candidateLevel = -1;
    
    for (let i = 0; i < degreeHierarchy.length; i++) {
      if (lowerRequired.includes(degreeHierarchy[i])) {
        requiredLevel = i;
      }
      if (lowerCandidate.includes(degreeHierarchy[i])) {
        candidateLevel = i;
      }
    }
    
    // Apply EXACT scoring from prompt
    if (candidateLevel >= requiredLevel && candidateLevel >= 0) {
      educationBase = 10; // Meets or exceeds requirement
      reason = 'Meets or exceeds education requirement';
    } else if (candidateLevel === requiredLevel - 1) {
      educationBase = 7; // One level below
      reason = 'One level below education requirement';
    } else if (candidateLevel >= 0) {
      educationBase = 3; // Two+ levels below
      reason = 'Below education requirement';
    } else {
      educationBase = 3; // Unclear
      reason = 'Education level unclear';
    }
  }
  
  // Certifications bonus: min(5, certification_count * 1.5) rounded - EXACT from prompt
  const certBonus = Math.min(5, Math.round(certifications.length * 1.5));
  
  // Total education score: min(15, education_base + cert_bonus)
  const score = Math.min(15, educationBase + certBonus);
  
  if (certifications.length > 0) {
    reason += `, ${certifications.length} certification(s)`;
  }
  
  return { score, reason };
}

/**
 * Generate reasoning text
 * @param {Object} result - Overall result
 * @param {Object} skillsScore - Skills score details
 * @param {Object} experienceScore - Experience score details
 * @param {Object} projectScore - Project score details
 * @param {Object} educationScore - Education score details
 * @returns {String} - Reasoning text
 */
function generateReasoning(result, skillsScore, experienceScore, projectScore, educationScore) {
  const reasons = [];
  
  // Skills reasoning
  if (skillsScore.score >= 30) {
    reasons.push('Strong skills match');
  } else if (skillsScore.score >= 20) {
    reasons.push('Good skills match');
  } else if (skillsScore.score >= 10) {
    reasons.push('Partial skills match');
  } else {
    reasons.push('Limited skills match');
  }
  
  // Experience reasoning
  reasons.push(experienceScore.reason);
  
  // Project reasoning
  if (projectScore.score >= 15) {
    reasons.push('Relevant project experience');
  }
  
  // Education reasoning
  if (educationScore.score >= 12) {
    reasons.push('Meets educational requirements');
  }
  
  // Overall assessment
  let overallAssessment = '';
  if (result.overall_score >= 80) {
    overallAssessment = 'Excellent candidate match.';
  } else if (result.overall_score >= 60) {
    overallAssessment = 'Good candidate match.';
  } else if (result.overall_score >= 40) {
    overallAssessment = 'Moderate candidate match.';
  } else {
    overallAssessment = 'Limited candidate match.';
  }
  
  return `${overallAssessment} ${reasons.join('. ')}.`;
}

/**
 * Call OpenRouter API for matching
 */
/**
 * Call Groq API for matching (FREE & FAST - RECOMMENDED)
 */
async function callGroqAPI(prompt, options = {}) {
  const apiKey = options.groqApiKey || process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('Groq API key not configured');
  }
  
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
      max_tokens: 1500,
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
    throw new Error('Invalid Groq response format');
  }
  
  const generatedText = response.data.choices[0].message.content;
  return parseJSONFromLLMResponse(generatedText);
}

async function callOpenRouterAPI(prompt, options = {}) {
  const apiKey = options.openrouterApiKey || process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
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
      max_tokens: 1500,
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
    throw new Error('Invalid OpenRouter response format');
  }
  
  const generatedText = response.data.choices[0].message.content;
  return parseJSONFromLLMResponse(generatedText);
}

/**
 * Call HuggingFace API for matching
 */
async function callHuggingFaceAPI(prompt, options = {}) {
  const apiKey = options.huggingfaceApiKey || process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HuggingFace API key not configured');
  }
  
  const model = options.model || 'mistralai/Mistral-7B-Instruct-v0.2';
  const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
  
  const response = await axios.post(
    apiUrl,
    {
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
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
}

/**
 * Call OpenAI API for matching
 */
async function callOpenAIAPI(prompt, options = {}) {
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
          content: 'You are an expert semantic matching agent in a resume ranking system. Always use exact formulas and respond with valid JSON only. Same inputs must produce identical outputs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.0,
      max_tokens: 1000,
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
}

/**
 * Call local LLM for matching
 */
async function callLocalLLM(prompt, options = {}) {
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
      timeout: 60000
    }
  );
  
  const generatedText = response.data.response;
  return parseJSONFromLLMResponse(generatedText);
}

/**
 * Parse JSON from LLM response
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
        return getDefaultMatchingStructure();
      }
    }
    
    return getDefaultMatchingStructure();
  }
}

/**
 * Validate matching scores
 * @param {Object} data - Matching data
 * @returns {Object} - Validated data
 */
function validateMatchingScores(data) {
  const validated = {
    skill_match_score: Math.min(40, Math.max(0, data.skill_match_score || 0)),
    experience_match_score: Math.min(25, Math.max(0, data.experience_match_score || 0)),
    project_relevance_score: Math.min(20, Math.max(0, data.project_relevance_score || 0)),
    education_score: Math.min(15, Math.max(0, data.education_score || 0)),
    overall_score: 0,
    matched_skills: Array.isArray(data.matched_skills) ? data.matched_skills : [],
    missing_skills: Array.isArray(data.missing_skills) ? data.missing_skills : [],
    reasoning: data.reasoning || 'No reasoning provided'
  };
  
  // Calculate overall score
  validated.overall_score = Math.min(100, Math.round(
    validated.skill_match_score +
    validated.experience_match_score +
    validated.project_relevance_score +
    validated.education_score
  ));
  
  return validated;
}

/**
 * Get default matching structure
 * @returns {Object} - Default structure
 */
function getDefaultMatchingStructure() {
  return {
    skill_match_score: 0,
    experience_match_score: 0,
    project_relevance_score: 0,
    education_score: 0,
    overall_score: 0,
    matched_skills: [],
    missing_skills: [],
    reasoning: 'Analysis could not be completed'
  };
}

module.exports = {
  performSemanticMatching,
  ruleBasedMatching,
  calculateSkillsMatch,
  calculateExperienceMatch,
  validateMatchingScores
};
