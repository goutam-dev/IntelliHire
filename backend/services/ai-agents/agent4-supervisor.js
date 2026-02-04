/**
 * AI Agent 4: Supervisor & Quality Controller (Director 4)
 * 
 * Responsibility:
 * - Validate outputs from all agents
 * - Detect inconsistencies or hallucinations
 * - Normalize scores
 * - Produce final employer-facing response
 * 
 * Output:
 * - Final resume score (0-100)
 * - Verdict (Excellent | Good | Average | Poor)
 * - Strengths & Weaknesses
 * - Confidence level
 * - Explanation
 * 
 * Part of Multi-Agent LLM Council System for FYP
 */

const axios = require('axios');

/**
 * Agent 4: Supervise all agent outputs and produce final verdict
 * @param {Object} jdExtraction - Output from Agent 1
 * @param {Object} resumeAnalysis - Output from Agent 2
 * @param {Object} matchingScore - Output from Agent 3
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Final verdict
 */
async function superviseFinalVerdict(jdExtraction, resumeAnalysis, matchingScore, options = {}) {
  const startTime = Date.now();
  
  console.log('\n========== DIRECTOR 4: SUPERVISOR & QUALITY CONTROLLER ==========');
  console.log('[Director 4] Task: Validate all outputs, detect inconsistencies, produce final verdict');
  console.log('[Director 4] Reviewing outputs from Directors 1, 2, and 3...');
  
  try {
    // Validate all inputs exist
    if (!jdExtraction || !resumeAnalysis || !matchingScore) {
      throw new Error('All agent outputs are required for supervision');
    }
    
    // Perform quality checks and validation
    console.log('[Director 4] Step 1: Performing quality checks on all agent outputs...');
    const qualityCheck = performQualityChecks(jdExtraction, resumeAnalysis, matchingScore);
    console.log(`[Director 4] ✓ Quality check complete - Issues found: ${qualityCheck.issues.length}`);
    if (qualityCheck.issues.length > 0) {
      console.log('[Director 4] Quality issues detected:');
      qualityCheck.issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
    }
    
    // Generate final verdict
    let verdict;
    
    if (options.useLLM !== false && qualityCheck.canUseLLM) {
      console.log('[Director 4] Step 2: Generating LLM-based supervision verdict...');
      try {
        verdict = await llmBasedSupervision(jdExtraction, resumeAnalysis, matchingScore, qualityCheck, options);
        console.log('[Director 4] ✓ LLM-based supervision completed');
      } catch (error) {
        console.warn('[Director 4] ⚠ LLM-based supervision failed, using rule-based:', error.message);
        verdict = ruleBasedSupervision(jdExtraction, resumeAnalysis, matchingScore, qualityCheck);
        console.log('[Director 4] ✓ Rule-based supervision completed');
      }
    } else {
      console.log('[Director 4] Step 2: Generating rule-based supervision verdict...');
      verdict = ruleBasedSupervision(jdExtraction, resumeAnalysis, matchingScore, qualityCheck);
      console.log('[Director 4] ✓ Rule-based supervision completed');
    }
    
    // Validate and normalize the verdict
    console.log('[Director 4] Step 3: Validating and normalizing final verdict...');
    const validatedVerdict = validateSupervisorVerdict(verdict);
    console.log('[Director 4] ✓ Final verdict validated');
    console.log('[Director 4] ═══════════════════════════════════════════════');
    console.log('[Director 4] FINAL DECISION:');
    console.log(`  📊 Final Resume Score: ${validatedVerdict.final_resume_score}/100`);
    console.log(`  🏆 Verdict: ${validatedVerdict.verdict}`);
    console.log(`  ✅ Strengths: ${validatedVerdict.strengths?.length || 0} points`);
    validatedVerdict.strengths?.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
    console.log(`  ⚠️  Weaknesses: ${validatedVerdict.weaknesses?.length || 0} points`);
    validatedVerdict.weaknesses?.forEach((w, i) => console.log(`     ${i + 1}. ${w}`));
    console.log(`  🎯 Confidence Level: ${validatedVerdict.confidence_level}`);
    console.log(`  💡 Recommendation: ${validatedVerdict.recommendation || 'See verdict'}`);
    console.log('[Director 4] ═══════════════════════════════════════════════');
    
    const processingTime = Date.now() - startTime;
    console.log(`[Director 4] ✓ Completed in ${processingTime}ms`);
    console.log('========== DIRECTOR 4: COMPLETED ==========\n');
    
    return {
      success: true,
      data: validatedVerdict,
      metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        agent: 'Supervisor_Quality_Controller',
        model: options.model || 'rule-based',
        qualityChecks: qualityCheck
      }
    };
    
  } catch (error) {
    console.error('Agent 4 (Supervisor) Error:', error);
    return {
      success: false,
      error: error.message,
      data: getDefaultSupervisorStructure(),
      metadata: {
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        agent: 'Supervisor_Quality_Controller'
      }
    };
  }
}

/**
 * Perform quality checks on all agent outputs
 * @param {Object} jdExtraction - Agent 1 output
 * @param {Object} resumeAnalysis - Agent 2 output
 * @param {Object} matchingScore - Agent 3 output
 * @returns {Object} - Quality check results
 */
function performQualityChecks(jdExtraction, resumeAnalysis, matchingScore) {
  const issues = [];
  let canUseLLM = true;
  
  // Check Agent 1 output
  if (!jdExtraction.job_title || jdExtraction.job_title === 'Not specified') {
    issues.push('Job title not extracted from JD');
  }
  if (!Array.isArray(jdExtraction.required_skills) || jdExtraction.required_skills.length === 0) {
    issues.push('No required skills extracted from JD');
    canUseLLM = false;
  }
  
  // Check Agent 2 output
  if (!Array.isArray(resumeAnalysis.skills) || resumeAnalysis.skills.length === 0) {
    issues.push('No skills extracted from resume');
    canUseLLM = false;
  }
  if (!resumeAnalysis.years_of_experience || resumeAnalysis.years_of_experience === 'Not specified') {
    issues.push('Experience not clearly specified in resume');
  }
  
  // Check Agent 3 output for inconsistencies
  if (matchingScore.overall_score !== 
      matchingScore.skill_match_score + 
      matchingScore.experience_match_score + 
      matchingScore.project_relevance_score + 
      matchingScore.education_score) {
    issues.push('Score calculation mismatch detected');
  }
  
  // Check for score bounds violations
  if (matchingScore.skill_match_score > 40 || matchingScore.skill_match_score < 0) {
    issues.push('Skill match score out of bounds');
  }
  if (matchingScore.experience_match_score > 25 || matchingScore.experience_match_score < 0) {
    issues.push('Experience match score out of bounds');
  }
  if (matchingScore.project_relevance_score > 20 || matchingScore.project_relevance_score < 0) {
    issues.push('Project relevance score out of bounds');
  }
  if (matchingScore.education_score > 15 || matchingScore.education_score < 0) {
    issues.push('Education score out of bounds');
  }
  
  // Check for hallucinations in matched skills
  if (Array.isArray(matchingScore.matched_skills)) {
    const candidateSkills = resumeAnalysis.skills.map(s => s.toLowerCase());
    const requiredSkills = jdExtraction.required_skills.map(s => s.toLowerCase());
    
    for (const matched of matchingScore.matched_skills) {
      const lowerMatched = matched.toLowerCase();
      const inCandidate = candidateSkills.some(s => s.includes(lowerMatched) || lowerMatched.includes(s));
      const inRequired = requiredSkills.some(s => s.includes(lowerMatched) || lowerMatched.includes(s));
      
      if (!inCandidate || !inRequired) {
        issues.push(`Potential hallucination: "${matched}" listed as matched but not in both JD and resume`);
      }
    }
  }
  
  return {
    hasIssues: issues.length > 0,
    issues,
    canUseLLM,
    qualityScore: Math.max(0, 100 - (issues.length * 10)) // Each issue reduces quality by 10%
  };
}

/**
 * LLM-based supervision
 * @param {Object} jdExtraction - Agent 1 output
 * @param {Object} resumeAnalysis - Agent 2 output
 * @param {Object} matchingScore - Agent 3 output
 * @param {Object} qualityCheck - Quality check results
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Final verdict
 */
async function llmBasedSupervision(jdExtraction, resumeAnalysis, matchingScore, qualityCheck, options = {}) {
  const prompt = buildSupervisionPrompt(jdExtraction, resumeAnalysis, matchingScore, qualityCheck);
  
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
 * Build supervision prompt
 * @param {Object} jdExtraction - Agent 1 output
 * @param {Object} resumeAnalysis - Agent 2 output
 * @param {Object} matchingScore - Agent 3 output
 * @param {Object} qualityCheck - Quality check results
 * @returns {String} - Prompt
 */
function buildSupervisionPrompt(jdExtraction, resumeAnalysis, matchingScore, qualityCheck) {
  return `You are the Supervisor & Quality Controller in a Multi-Agent Resume Ranking System.

ROLE: Supervisor & Quality Controller (Director 4)

TASK: Review the outputs from all previous agents, validate for quality and consistency, and produce a final employer-facing verdict.

AGENT 1 OUTPUT (JD Extraction):
${JSON.stringify(jdExtraction, null, 2)}

AGENT 2 OUTPUT (Resume Analysis):
${JSON.stringify(resumeAnalysis, null, 2)}

AGENT 3 OUTPUT (Matching & Scoring):
${JSON.stringify(matchingScore, null, 2)}

QUALITY CHECK RESULTS:
${JSON.stringify(qualityCheck, null, 2)}

YOUR RESPONSIBILITIES (APPLY DETERMINISTICALLY):
1. Use Agent 3's overall_score EXACTLY as final_resume_score (NO adjustment)
2. Map score to verdict using EXACT thresholds:
   - score >= 80 → "Excellent"
   - score >= 60 → "Good"  
   - score >= 40 → "Average"
   - score < 40 → "Poor"
3. List strengths based on matched_skills (top 3-5 only)
4. List weaknesses based on missing_skills (top 3-5 only)
5. Set confidence based on quality check:
   - No issues → "High"
   - 1-2 minor issues → "Medium"
   - 3+ issues → "Low"

REQUIRED OUTPUT FORMAT (JSON ONLY):
{
  "final_resume_score": <use Agent 3's overall_score EXACTLY - NO rounding or adjustment>,
  "verdict": "<MUST be Excellent/Good/Average/Poor based on EXACT thresholds above>",
  "strengths": ["<from matched_skills, max 5 items>"],
  "weaknesses": ["<from missing_skills, max 5 items>"],
  "confidence_level": "<High/Medium/Low based on EXACT rules above>",
  "recommendation": "<MUST be: 'Recommend for interview' if score>=70, 'Consider for interview' if score>=50, 'Not recommended' if score<50>",
  "explanation": "<2 sentences max: state score, verdict, key match/gap>"
}

CRITICAL RULES FOR CONSISTENCY:
- NEVER adjust or modify Agent 3's overall_score
- ALWAYS use exact same verdict for same score
- ALWAYS list same strengths/weaknesses for same matched/missing skills
- NO subjective judgment - follow formulas EXACTLY
- For identical inputs, produce IDENTICAL outputs

OUTPUT (JSON ONLY, NO OTHER TEXT):`;
}

/**
 * Rule-based supervision (fallback or default)
 * @param {Object} jdExtraction - Agent 1 output
 * @param {Object} resumeAnalysis - Agent 2 output
 * @param {Object} matchingScore - Agent 3 output
 * @param {Object} qualityCheck - Quality check results
 * @returns {Object} - Final verdict
 */
function ruleBasedSupervision(jdExtraction, resumeAnalysis, matchingScore, qualityCheck) {
  const verdict = getDefaultSupervisorStructure();
  
  // 1. Normalize final score (use Agent 3's overall score, with adjustments)
  let finalScore = matchingScore.overall_score || 0;
  
  // Apply quality penalty if needed
  if (qualityCheck.hasIssues) {
    const penalty = Math.min(10, qualityCheck.issues.length * 2);
    finalScore = Math.max(0, finalScore - penalty);
  }
  
  verdict.final_resume_score = Math.round(finalScore);
  
  // 2. Determine verdict category
  if (verdict.final_resume_score >= 80) {
    verdict.verdict = 'Excellent';
  } else if (verdict.final_resume_score >= 60) {
    verdict.verdict = 'Good';
  } else if (verdict.final_resume_score >= 40) {
    verdict.verdict = 'Average';
  } else {
    verdict.verdict = 'Poor';
  }
  
  // 3. Identify strengths
  verdict.strengths = identifyStrengths(jdExtraction, resumeAnalysis, matchingScore);
  
  // 4. Identify weaknesses
  verdict.weaknesses = identifyWeaknesses(jdExtraction, resumeAnalysis, matchingScore);
  
  // 5. Determine confidence level
  if (qualityCheck.qualityScore >= 80) {
    verdict.confidence_level = 'High';
  } else if (qualityCheck.qualityScore >= 50) {
    verdict.confidence_level = 'Medium';
  } else {
    verdict.confidence_level = 'Low';
  }
  
  // 6. Generate explanation
  verdict.explanation = generateExplanation(verdict, matchingScore, qualityCheck);
  
  return verdict;
}

/**
 * Identify candidate strengths
 * @param {Object} jdExtraction - JD data
 * @param {Object} resumeAnalysis - Resume data
 * @param {Object} matchingScore - Matching data
 * @returns {Array} - List of strengths
 */
function identifyStrengths(jdExtraction, resumeAnalysis, matchingScore) {
  const strengths = [];
  
  // Skill strengths
  if (matchingScore.matched_skills && matchingScore.matched_skills.length > 0) {
    const topSkills = matchingScore.matched_skills.slice(0, 5).join(', ');
    strengths.push(`Strong match in key skills: ${topSkills}`);
  }
  
  // Experience strength
  if (matchingScore.experience_match_score >= 20) {
    strengths.push(`Meets or exceeds required experience (${resumeAnalysis.years_of_experience})`);
  }
  
  // Project strength
  if (matchingScore.project_relevance_score >= 15 && resumeAnalysis.projects.length > 0) {
    strengths.push(`Demonstrated relevant project experience (${resumeAnalysis.projects.length} projects)`);
  }
  
  // Education strength
  if (matchingScore.education_score >= 12) {
    strengths.push(`Meets educational requirements (${resumeAnalysis.education})`);
  }
  
  // Certifications
  if (resumeAnalysis.certifications && resumeAnalysis.certifications.length > 0) {
    strengths.push(`Additional certifications: ${resumeAnalysis.certifications.slice(0, 3).join(', ')}`);
  }
  
  // Tools/Technologies
  if (resumeAnalysis.tools_and_technologies && resumeAnalysis.tools_and_technologies.length > 3) {
    strengths.push(`Proficient in multiple tools and technologies (${resumeAnalysis.tools_and_technologies.length} listed)`);
  }
  
  // Ensure we have at least 2 strengths
  if (strengths.length === 0) {
    strengths.push('Has submitted a complete application');
    strengths.push('Shows interest in the position');
  }
  
  return strengths.slice(0, 5); // Top 5 strengths
}

/**
 * Identify candidate weaknesses
 * @param {Object} jdExtraction - JD data
 * @param {Object} resumeAnalysis - Resume data
 * @param {Object} matchingScore - Matching data
 * @returns {Array} - List of weaknesses
 */
function identifyWeaknesses(jdExtraction, resumeAnalysis, matchingScore) {
  const weaknesses = [];
  
  // Missing skills
  if (matchingScore.missing_skills && matchingScore.missing_skills.length > 0) {
    const topMissing = matchingScore.missing_skills.slice(0, 5).join(', ');
    weaknesses.push(`Missing required skills: ${topMissing}`);
  }
  
  // Experience gap
  if (matchingScore.experience_match_score < 15) {
    weaknesses.push(`May not meet minimum experience requirement (${resumeAnalysis.years_of_experience})`);
  }
  
  // Project relevance
  if (matchingScore.project_relevance_score < 10) {
    if (resumeAnalysis.projects.length === 0) {
      weaknesses.push('No relevant projects listed');
    } else {
      weaknesses.push('Limited project relevance to job requirements');
    }
  }
  
  // Education gap
  if (matchingScore.education_score < 8 && jdExtraction.education_requirements !== 'Not specified') {
    weaknesses.push('May not fully meet education requirements');
  }
  
  // Overall skills gap
  if (matchingScore.skill_match_score < 20) {
    weaknesses.push('Significant gap in required technical skills');
  }
  
  // If no weaknesses identified, note areas for clarification
  if (weaknesses.length === 0) {
    weaknesses.push('May benefit from interview to clarify experience and skills');
  }
  
  return weaknesses.slice(0, 5); // Top 5 weaknesses
}

/**
 * Generate explanation text
 * @param {Object} verdict - Current verdict
 * @param {Object} matchingScore - Matching score data
 * @param {Object} qualityCheck - Quality check results
 * @returns {String} - Explanation
 */
function generateExplanation(verdict, matchingScore, qualityCheck) {
  let explanation = '';
  
  // Overall assessment
  if (verdict.verdict === 'Excellent') {
    explanation = 'This candidate demonstrates an excellent match for the position. ';
  } else if (verdict.verdict === 'Good') {
    explanation = 'This candidate shows a good match for the position. ';
  } else if (verdict.verdict === 'Average') {
    explanation = 'This candidate shows a moderate match for the position. ';
  } else {
    explanation = 'This candidate shows limited alignment with the job requirements. ';
  }
  
  // Score breakdown
  const breakdown = [];
  if (matchingScore.skill_match_score >= 30) breakdown.push('strong skills match');
  else if (matchingScore.skill_match_score >= 20) breakdown.push('good skills match');
  else breakdown.push('limited skills match');
  
  if (matchingScore.experience_match_score >= 20) breakdown.push('appropriate experience level');
  else if (matchingScore.experience_match_score >= 12) breakdown.push('some experience gap');
  else breakdown.push('significant experience gap');
  
  explanation += `Key factors include: ${breakdown.join(', ')}. `;
  
  // Confidence note
  if (verdict.confidence_level === 'Low') {
    explanation += 'Note: Confidence level is low due to incomplete data extraction. Manual review recommended.';
  } else if (verdict.confidence_level === 'Medium') {
    explanation += 'Further evaluation through interview is recommended.';
  } else {
    explanation += 'The analysis is based on comprehensive data extraction with high confidence.';
  }
  
  return explanation;
}

/**
 * Call OpenRouter API
 */
/**
 * Call Groq API for supervision (FREE & FAST - RECOMMENDED)
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
 * Call HuggingFace API
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
 * Call OpenAI API
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
          content: 'You are a supervisor in a multi-agent resume ranking system. Your job is to validate outputs and provide a final verdict. Always respond with valid JSON only.'
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
 * Call local LLM
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
        return getDefaultSupervisorStructure();
      }
    }
    
    return getDefaultSupervisorStructure();
  }
}

/**
 * Validate supervisor verdict
 * @param {Object} data - Verdict data
 * @returns {Object} - Validated data
 */
function validateSupervisorVerdict(data) {
  const validated = {
    final_resume_score: Math.min(100, Math.max(0, Math.round(data.final_resume_score || 0))),
    verdict: data.verdict || 'Poor',
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
    confidence_level: data.confidence_level || 'Low',
    explanation: data.explanation || 'Analysis completed with limited data'
  };
  
  // Validate verdict matches score
  if (validated.final_resume_score >= 80 && validated.verdict !== 'Excellent') {
    validated.verdict = 'Excellent';
  } else if (validated.final_resume_score >= 60 && validated.final_resume_score < 80 && validated.verdict !== 'Good') {
    validated.verdict = 'Good';
  } else if (validated.final_resume_score >= 40 && validated.final_resume_score < 60 && validated.verdict !== 'Average') {
    validated.verdict = 'Average';
  } else if (validated.final_resume_score < 40 && validated.verdict !== 'Poor') {
    validated.verdict = 'Poor';
  }
  
  // Ensure valid verdict value
  if (!['Excellent', 'Good', 'Average', 'Poor'].includes(validated.verdict)) {
    validated.verdict = 'Poor';
  }
  
  // Ensure valid confidence level
  if (!['High', 'Medium', 'Low'].includes(validated.confidence_level)) {
    validated.confidence_level = 'Medium';
  }
  
  // Clean arrays
  validated.strengths = validated.strengths
    .filter(s => typeof s === 'string' && s.length > 0)
    .slice(0, 5);
  
  validated.weaknesses = validated.weaknesses
    .filter(w => typeof w === 'string' && w.length > 0)
    .slice(0, 5);
  
  return validated;
}

/**
 * Get default supervisor structure
 * @returns {Object} - Default structure
 */
function getDefaultSupervisorStructure() {
  return {
    final_resume_score: 0,
    verdict: 'Poor',
    strengths: [],
    weaknesses: ['Insufficient data for comprehensive analysis'],
    confidence_level: 'Low',
    explanation: 'Unable to complete comprehensive analysis due to data limitations'
  };
}

module.exports = {
  superviseFinalVerdict,
  performQualityChecks,
  ruleBasedSupervision,
  validateSupervisorVerdict
};
