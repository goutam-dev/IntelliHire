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
    console.log(`  - Skills Match: ${validatedResult.skills_match_score}/40`);
    console.log(`  - Experience Match: ${validatedResult.experience_match_score}/25`);
    console.log(`  - Project Relevance: ${validatedResult.project_relevance_score}/20`);
    console.log(`  - Education Match: ${validatedResult.education_match_score}/15`);
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
1. Skills Match (40 points max):
   - Count matched required skills: each = 6 points (max 30 points for 5+ skills)
   - Count matched preferred skills: each = 2 points (max 10 points for 5+ skills)
   - Use exact formula: (matched_required * 6) + (matched_preferred * 2), cap at 40

2. Experience Match (25 points max):
   - If candidate years >= required years: 25 points
   - If candidate years = required - 1: 20 points
   - If candidate years = required - 2: 15 points
   - If candidate years < required - 2: 10 points
   - Use ONLY these fixed values

3. Project Relevance (20 points max):
   - Count projects using required skills/technologies: each = 5 points (max 20)
   - Use exact formula: min(relevant_projects * 5, 20)

4. Education & Certifications (15 points max):
   - Meets exact education requirement: 15 points
   - Higher than requirement: 15 points
   - One level below requirement: 10 points
   - Two+ levels below: 5 points
   - Use ONLY these fixed values

CALCULATION RULES (MANDATORY):
- Sum all component scores to get overall_score
- Round all scores to nearest integer
- Never randomize or vary scores for same input
- Apply formulas EXACTLY as specified above

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
  
  // Calculate score (out of 40)
  const totalRequired = requiredSkills.length || 1;
  const totalPreferred = preferredSkills.length || 1;
  
  const requiredScore = (requiredMatches / totalRequired) * 30; // 30 points for required
  const preferredScore = (preferredMatches / totalPreferred) * 10; // 10 points for preferred
  
  const score = Math.min(40, Math.round(requiredScore + preferredScore));
  
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
  
  // Calculate score (out of 25)
  if (candidateYears >= requiredYears) {
    // Meets or exceeds requirement
    const excess = candidateYears - requiredYears;
    if (excess <= 2) {
      return { score: 25, reason: 'Meets experience requirement perfectly' };
    } else if (excess <= 5) {
      return { score: 23, reason: 'Good experience level for the role' };
    } else {
      return { score: 20, reason: 'Significantly exceeds experience requirement' };
    }
  } else {
    // Below requirement
    const deficit = requiredYears - candidateYears;
    if (deficit <= 1) {
      return { score: 18, reason: 'Slightly below experience requirement' };
    } else if (deficit <= 2) {
      return { score: 12, reason: 'Below experience requirement' };
    } else {
      return { score: 5, reason: 'Significantly below experience requirement' };
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
    return { score: 5, reason: 'No projects listed' };
  }
  
  const allJdText = [...jobResponsibilities, ...jdKeywords].join(' ').toLowerCase();
  const projectsText = projects.join(' ').toLowerCase();
  
  // Check for keyword overlap
  const keywords = jdKeywords.map(k => k.toLowerCase());
  let matchCount = 0;
  
  for (const keyword of keywords) {
    if (projectsText.includes(keyword)) {
      matchCount++;
    }
  }
  
  // Calculate score (out of 20)
  if (keywords.length === 0) {
    // No keywords to match, give average score
    return { score: 12, reason: 'Projects present but hard to assess relevance' };
  }
  
  const matchRatio = matchCount / keywords.length;
  
  if (matchRatio >= 0.6) {
    return { score: 20, reason: 'Projects highly relevant to job requirements' };
  } else if (matchRatio >= 0.4) {
    return { score: 16, reason: 'Projects moderately relevant to job requirements' };
  } else if (matchRatio >= 0.2) {
    return { score: 10, reason: 'Some project relevance to job requirements' };
  } else {
    return { score: 5, reason: 'Limited project relevance to job requirements' };
  }
}

/**
 * Calculate education match score
 * @param {String} requiredEdu - Required education from JD
 * @param {String} candidateEdu - Candidate's education
 * @param {Array} certifications - Candidate's certifications
 * @returns {Object} - Score and details
 */
function calculateEducationMatch(requiredEdu, candidateEdu, certifications) {
  let score = 0;
  let reason = '';
  
  const lowerRequired = requiredEdu.toLowerCase();
  const lowerCandidate = candidateEdu.toLowerCase();
  
  // Education match (10 points max)
  if (requiredEdu === 'Not specified' || candidateEdu === 'Not specified') {
    score += 6; // Neutral score if not specified
    reason = 'Education requirements not clearly specified';
  } else {
    // Check degree level match
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
    
    if (candidateLevel >= requiredLevel && candidateLevel >= 0) {
      score += 10;
      reason = 'Meets education requirement';
    } else if (candidateLevel >= 0) {
      score += 5;
      reason = 'Below education requirement';
    } else {
      score += 3;
      reason = 'Education level unclear';
    }
  }
  
  // Certifications bonus (5 points max)
  if (certifications.length > 0) {
    const certScore = Math.min(5, certifications.length * 1.5);
    score += Math.round(certScore);
    reason += certifications.length > 0 ? ', Has relevant certifications' : '';
  }
  
  return { score: Math.min(15, Math.round(score)), reason };
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
 * Call Groq API for matching
 */
async function callGroqAPI(prompt, options = {}) {
  const apiKey = options.groqApiKey || process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('Groq API key not configured');
  }
  
  const model = options.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  
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
      max_tokens: 1500
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

/**
 * Call OpenRouter API for matching
 */
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
          content: 'You are an expert at semantic matching between job requirements and candidate qualifications. Always respond with valid JSON only.'
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
