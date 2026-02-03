/**
 * Hybrid Ranking Module
 * 
 * A deterministic, fast, and consistent ranking system that replaces the LLM Council.
 * Uses a combination of:
 * - Semantic Similarity (40% weight): Sentence embeddings + cosine similarity
 * - Rule-Based Matching (40% weight): Skills, experience, education extraction & matching
 * - Keyword Matching (20% weight): TF-IDF based keyword extraction and matching
 * 
 * Maintains exact same input/output format as the LLM Council for backward compatibility.
 * 
 * Part of FYP: Intelligent Recruitment and Interview Automation System
 */

const natural = require('natural');
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

/**
 * Main Hybrid Ranking Function
 * Replaces the Multi-Agent LLM Council pipeline
 * 
 * @param {String} jobDescriptionText - Full job description text
 * @param {String} resumeText - Full resume text
 * @param {Object} resumeSections - Pre-parsed resume sections
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Same format as LLM Council output
 */
async function executeHybridRanking(jobDescriptionText, resumeText, resumeSections, options = {}) {
  const startTime = Date.now();
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  HYBRID RANKING SYSTEM STARTED                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('[Hybrid Ranking] Using deterministic hybrid approach');
  console.log('[Hybrid Ranking] Weights: Semantic(40%) + Rule-Based(40%) + Keywords(20%)');
  console.log('');
  
  try {
    // Extract structured data from JD and Resume
    console.log('[Hybrid Ranking] Step 1: Extracting structured data...');
    const jdData = extractJobDescriptionData(jobDescriptionText);
    const resumeData = extractResumeData(resumeText, resumeSections);
    console.log('[Hybrid Ranking] ✓ Data extraction complete');
    console.log('');
    
    // Calculate three scoring components
    console.log('[Hybrid Ranking] Step 2: Calculating semantic similarity...');
    const semanticScore = calculateSemanticSimilarity(jobDescriptionText, resumeText);
    console.log(`[Hybrid Ranking] ✓ Semantic similarity: ${semanticScore.toFixed(2)}%`);
    console.log('');
    
    console.log('[Hybrid Ranking] Step 3: Calculating rule-based matching...');
    const ruleBasedScore = calculateRuleBasedMatching(jdData, resumeData);
    console.log(`[Hybrid Ranking] ✓ Rule-based matching: ${ruleBasedScore.overall.toFixed(2)}%`);
    console.log('');
    
    console.log('[Hybrid Ranking] Step 4: Calculating keyword matching...');
    const keywordScore = calculateKeywordMatching(jobDescriptionText, resumeText);
    console.log(`[Hybrid Ranking] ✓ Keyword matching: ${keywordScore.toFixed(2)}%`);
    console.log('');
    
    // Combine scores with weights
    const finalScore = Math.round(
      (semanticScore * 0.40) + 
      (ruleBasedScore.overall * 0.40) + 
      (keywordScore * 0.20)
    );
    
    console.log('[Hybrid Ranking] Step 5: Combining scores...');
    console.log(`[Hybrid Ranking]   - Semantic (40%): ${(semanticScore * 0.40).toFixed(2)}`);
    console.log(`[Hybrid Ranking]   - Rule-Based (40%): ${(ruleBasedScore.overall * 0.40).toFixed(2)}`);
    console.log(`[Hybrid Ranking]   - Keywords (20%): ${(keywordScore * 0.20).toFixed(2)}`);
    console.log(`[Hybrid Ranking]   - FINAL SCORE: ${finalScore}/100`);
    console.log('');
    
    // Generate LLM Council compatible output
    const result = generateCompatibleOutput(
      finalScore,
      ruleBasedScore,
      jdData,
      resumeData,
      semanticScore,
      keywordScore
    );
    
    const processingTime = Date.now() - startTime;
    console.log(`[Hybrid Ranking] ✓ Hybrid ranking completed in ${processingTime}ms`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    return {
      agent1: { success: true, data: jdData, metadata: { processingTime: 0, model: 'hybrid-extractor' } },
      agent2: { success: true, data: resumeData, metadata: { processingTime: 0, model: 'hybrid-analyzer' } },
      agent3: { success: true, data: ruleBasedScore, metadata: { processingTime: 0, model: 'hybrid-matcher' } },
      agent4: { success: true, data: result, metadata: { processingTime, model: 'hybrid-supervisor' } }
    };
    
  } catch (error) {
    console.error('[Hybrid Ranking] Error:', error);
    throw error;
  }
}

/**
 * Extract structured data from job description
 * @param {String} jdText - Job description text
 * @returns {Object} - Structured JD data
 */
function extractJobDescriptionData(jdText) {
  const jdLower = jdText.toLowerCase();
  
  // Extract required skills
  const skillsSection = extractSection(jdText, ['required skills', 'skills required', 'technical skills', 'qualifications']);
  const requiredSkills = extractSkills(skillsSection || jdText);
  
  // Extract preferred skills
  const preferredSection = extractSection(jdText, ['preferred skills', 'nice to have', 'preferred qualifications', 'bonus']);
  const preferredSkills = extractSkills(preferredSection || '');
  
  // Extract experience requirements
  const experienceYears = extractExperienceYears(jdText);
  
  // Extract education requirements
  const education = extractEducation(jdText);
  
  // Extract keywords
  const keywords = extractImportantKeywords(jdText);
  
  return {
    required_skills: requiredSkills,
    preferred_skills: preferredSkills,
    minimum_experience_years: experienceYears,
    education_requirements: education,
    keywords: keywords,
    job_responsibilities: []
  };
}

/**
 * Extract structured data from resume
 * @param {String} resumeText - Resume text
 * @param {Object} resumeSections - Pre-parsed resume sections
 * @returns {Object} - Structured resume data
 */
function extractResumeData(resumeText, resumeSections) {
  // Extract skills
  const skillsSection = resumeSections.skills || extractSection(resumeText, ['skills', 'technical skills', 'competencies']);
  const skills = extractSkills(skillsSection || resumeText);
  
  // Extract experience
  const experienceYears = extractExperienceYears(resumeText);
  
  // Extract education
  const education = extractEducation(resumeText);
  
  // Extract projects
  const projectsSection = resumeSections.projects || extractSection(resumeText, ['projects', 'project experience', 'key projects']);
  const projects = extractProjects(projectsSection || resumeText);
  
  // Extract certifications
  const certsSection = resumeSections.certifications || extractSection(resumeText, ['certifications', 'certificates', 'licenses']);
  const certifications = extractCertifications(certsSection || resumeText);
  
  return {
    skills: skills,
    tools_and_technologies: skills, // Same as skills for now
    years_of_experience: experienceYears,
    education: education,
    projects: projects,
    certifications: certifications
  };
}

/**
 * Calculate semantic similarity using simple cosine similarity
 * @param {String} text1 - First text (job description)
 * @param {String} text2 - Second text (resume)
 * @returns {Number} - Similarity score (0-100)
 */
function calculateSemanticSimilarity(text1, text2) {
  // Create TF-IDF vectors
  const tfidf = new TfIdf();
  tfidf.addDocument(text1);
  tfidf.addDocument(text2);
  
  // Get all unique terms
  const allTerms = new Set();
  tfidf.listTerms(0).forEach(item => allTerms.add(item.term));
  tfidf.listTerms(1).forEach(item => allTerms.add(item.term));
  
  // Build vectors
  const vector1 = [];
  const vector2 = [];
  
  allTerms.forEach(term => {
    vector1.push(tfidf.tfidf(term, 0));
    vector2.push(tfidf.tfidf(term, 1));
  });
  
  // Calculate cosine similarity
  const similarity = cosineSimilarity(vector1, vector2);
  
  // Convert to 0-100 scale
  return Math.min(100, Math.max(0, similarity * 100));
}

/**
 * Calculate rule-based matching score
 * @param {Object} jdData - Job description data
 * @param {Object} resumeData - Resume data
 * @returns {Object} - Detailed matching scores
 */
function calculateRuleBasedMatching(jdData, resumeData) {
  // 1. Skills Match (40 points)
  const skillsMatch = matchSkills(
    jdData.required_skills,
    jdData.preferred_skills,
    resumeData.skills
  );
  
  // 2. Experience Match (25 points)
  const experienceMatch = matchExperience(
    jdData.minimum_experience_years,
    resumeData.years_of_experience
  );
  
  // 3. Project Relevance (20 points)
  const projectMatch = matchProjects(
    jdData.required_skills,
    jdData.keywords,
    resumeData.projects
  );
  
  // 4. Education Match (15 points)
  const educationMatch = matchEducation(
    jdData.education_requirements,
    resumeData.education
  );
  
  const overallScore = skillsMatch.score + experienceMatch.score + projectMatch.score + educationMatch.score;
  
  return {
    skill_match_score: skillsMatch.score,
    experience_match_score: experienceMatch.score,
    project_relevance_score: projectMatch.score,
    education_score: educationMatch.score,
    overall_score: Math.round(overallScore),
    matched_skills: skillsMatch.matched,
    missing_skills: skillsMatch.missing,
    overall: overallScore
  };
}

/**
 * Calculate keyword matching score
 * @param {String} jdText - Job description text
 * @param {String} resumeText - Resume text
 * @returns {Number} - Keyword match score (0-100)
 */
function calculateKeywordMatching(jdText, resumeText) {
  // Extract important keywords from JD
  const jdKeywords = extractImportantKeywords(jdText);
  
  // Normalize resume text
  const resumeLower = resumeText.toLowerCase();
  
  // Count matches
  let matchCount = 0;
  jdKeywords.forEach(keyword => {
    if (resumeLower.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  });
  
  // Calculate score
  const score = jdKeywords.length > 0 
    ? (matchCount / jdKeywords.length) * 100 
    : 0;
  
  return Math.min(100, Math.round(score));
}

/**
 * Generate LLM Council compatible output
 * @param {Number} finalScore - Final calculated score
 * @param {Object} ruleBasedScore - Rule-based matching results
 * @param {Object} jdData - JD data
 * @param {Object} resumeData - Resume data
 * @param {Number} semanticScore - Semantic similarity score
 * @param {Number} keywordScore - Keyword matching score
 * @returns {Object} - Compatible supervisor verdict
 */
function generateCompatibleOutput(finalScore, ruleBasedScore, jdData, resumeData, semanticScore, keywordScore) {
  // Determine verdict
  let verdict;
  if (finalScore >= 80) verdict = 'Excellent';
  else if (finalScore >= 60) verdict = 'Good';
  else if (finalScore >= 40) verdict = 'Average';
  else verdict = 'Poor';
  
  // Generate strengths
  const strengths = [];
  if (ruleBasedScore.matched_skills.length > 0) {
    strengths.push(`Strong match in key skills: ${ruleBasedScore.matched_skills.slice(0, 5).join(', ')}`);
  }
  if (ruleBasedScore.experience_match_score >= 20) {
    strengths.push(`Meets or exceeds required experience (${resumeData.years_of_experience} years)`);
  }
  if (ruleBasedScore.project_relevance_score >= 15) {
    strengths.push(`Demonstrated relevant project experience (${resumeData.projects.length} projects)`);
  }
  if (ruleBasedScore.education_score >= 12) {
    strengths.push(`Meets educational requirements (${resumeData.education})`);
  }
  if (semanticScore >= 70) {
    strengths.push(`High semantic alignment with job requirements (${semanticScore.toFixed(0)}%)`);
  }
  
  // Generate weaknesses
  const weaknesses = [];
  if (ruleBasedScore.missing_skills.length > 0) {
    weaknesses.push(`Missing key skills: ${ruleBasedScore.missing_skills.slice(0, 5).join(', ')}`);
  }
  if (ruleBasedScore.experience_match_score < 15) {
    weaknesses.push(`Experience level below requirements`);
  }
  if (ruleBasedScore.project_relevance_score < 10) {
    weaknesses.push(`Limited relevant project experience`);
  }
  if (semanticScore < 50) {
    weaknesses.push(`Lower semantic alignment with job description`);
  }
  
  // Ensure we have at least some content
  if (strengths.length === 0) {
    strengths.push('Has submitted a complete application');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Could provide more detailed information');
  }
  
  // Determine confidence level (always High for deterministic system)
  const confidenceLevel = 'High';
  
  // Generate explanation
  const explanation = `Hybrid analysis completed: Score ${finalScore}/100 (${verdict}). ` +
    `Skills match: ${ruleBasedScore.skill_match_score}/40, Experience: ${ruleBasedScore.experience_match_score}/25, ` +
    `Projects: ${ruleBasedScore.project_relevance_score}/20, Education: ${ruleBasedScore.education_score}/15. ` +
    `Semantic similarity: ${semanticScore.toFixed(0)}%, Keyword match: ${keywordScore}%.`;
  
  return {
    final_resume_score: finalScore,
    verdict: verdict,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    confidence_level: confidenceLevel,
    explanation: explanation,
    recommendation: finalScore >= 70 ? 'Recommend for interview' : 
                    finalScore >= 50 ? 'Consider for interview' : 
                    'Not recommended'
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract a section from text based on headers
 */
function extractSection(text, headers) {
  const lines = text.split('\n');
  let sectionContent = '';
  let inSection = false;
  
  for (const line of lines) {
    const lineLower = line.toLowerCase().trim();
    
    // Check if this line is a header we're looking for
    if (headers.some(h => lineLower.includes(h))) {
      inSection = true;
      continue;
    }
    
    // Check if we've hit another section
    if (inSection && (lineLower.endsWith(':') || /^[A-Z\s]{3,}$/.test(line.trim()))) {
      break;
    }
    
    if (inSection) {
      sectionContent += line + '\n';
    }
  }
  
  return sectionContent;
}

/**
 * Extract skills from text
 */
function extractSkills(text) {
  const skills = new Set();
  
  // Common skills patterns
  const commonSkills = [
    'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin',
    'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
    'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
    'html', 'css', 'typescript', 'graphql', 'rest api', 'microservices',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
    'agile', 'scrum', 'ci/cd', 'devops', 'linux', 'unix'
  ];
  
  const textLower = text.toLowerCase();
  
  // Extract common skills
  commonSkills.forEach(skill => {
    if (textLower.includes(skill)) {
      skills.add(skill);
    }
  });
  
  // Extract skills from bullet points or comma-separated lists
  const bulletPoints = text.match(/[•\-\*]\s*([^\n]+)/g) || [];
  bulletPoints.forEach(point => {
    const cleaned = point.replace(/[•\-\*]\s*/, '').trim();
    if (cleaned.length > 2 && cleaned.length < 50) {
      skills.add(cleaned.toLowerCase());
    }
  });
  
  return Array.from(skills);
}

/**
 * Extract experience years from text
 */
function extractExperienceYears(text) {
  // Patterns: "5 years", "5+ years", "5-7 years", etc.
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return 0;
}

/**
 * Extract education level from text
 */
function extractEducation(text) {
  const textLower = text.toLowerCase();
  
  if (textLower.includes('ph.d') || textLower.includes('phd') || textLower.includes('doctorate')) {
    return 'Ph.D';
  }
  if (textLower.includes('master') || textLower.includes('m.s') || textLower.includes('mba')) {
    return "Master's";
  }
  if (textLower.includes('bachelor') || textLower.includes('b.s') || textLower.includes('b.a') || textLower.includes('b.tech')) {
    return "Bachelor's";
  }
  if (textLower.includes('associate')) {
    return "Associate's";
  }
  if (textLower.includes('high school') || textLower.includes('diploma')) {
    return 'High School';
  }
  
  return 'Not specified';
}

/**
 * Extract projects from text
 */
function extractProjects(text) {
  const projects = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      const projectDesc = trimmed.substring(1).trim();
      if (projectDesc.length > 10) {
        // Return as string directly, not as object (database expects [String])
        projects.push(projectDesc);
      }
    }
  }
  
  return projects;
}

/**
 * Extract certifications from text
 */
function extractCertifications(text) {
  const certs = new Set();
  
  const commonCerts = [
    'aws certified', 'azure certified', 'gcp certified',
    'pmp', 'cissp', 'ceh', 'comptia',
    'certified kubernetes', 'certified scrum master',
    'oracle certified', 'microsoft certified'
  ];
  
  const textLower = text.toLowerCase();
  
  commonCerts.forEach(cert => {
    if (textLower.includes(cert)) {
      certs.add(cert);
    }
  });
  
  return Array.from(certs);
}

/**
 * Extract important keywords from text
 */
function extractImportantKeywords(text) {
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
  
  // Filter tokens
  const filtered = tokens.filter(token => 
    !stopWords.has(token) && 
    token.length > 2 && 
    /^[a-z]+$/.test(token)
  );
  
  // Count frequency
  const frequency = {};
  filtered.forEach(token => {
    frequency[token] = (frequency[token] || 0) + 1;
  });
  
  // Get top keywords
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
  
  return sorted;
}

/**
 * Match skills between JD and resume
 */
function matchSkills(requiredSkills, preferredSkills, candidateSkills) {
  const matched = [];
  const missing = [];
  
  let score = 0;
  
  // Match required skills (6 points each, max 30)
  requiredSkills.forEach(reqSkill => {
    const isMatch = candidateSkills.some(candSkill => 
      areSkillsSimilar(reqSkill, candSkill)
    );
    if (isMatch) {
      matched.push(reqSkill);
      score += 6;
    } else {
      missing.push(reqSkill);
    }
  });
  score = Math.min(30, score);
  
  // Match preferred skills (2 points each, max 10)
  let preferredScore = 0;
  preferredSkills.forEach(prefSkill => {
    const isMatch = candidateSkills.some(candSkill => 
      areSkillsSimilar(prefSkill, candSkill)
    );
    if (isMatch && !matched.includes(prefSkill)) {
      matched.push(prefSkill);
      preferredScore += 2;
    }
  });
  score += Math.min(10, preferredScore);
  
  return {
    score: Math.min(40, score),
    matched: matched,
    missing: missing
  };
}

/**
 * Check if two skills are similar
 */
function areSkillsSimilar(skill1, skill2) {
  const s1 = skill1.toLowerCase().trim();
  const s2 = skill2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return true;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  // Common variations
  const variations = {
    'javascript': ['js', 'es6', 'ecmascript'],
    'typescript': ['ts'],
    'python': ['py'],
    'node.js': ['node', 'nodejs'],
    'react.js': ['react', 'reactjs'],
    'vue.js': ['vue', 'vuejs'],
    'angular': ['angularjs'],
    'c++': ['cpp'],
    'c#': ['csharp']
  };
  
  for (const [key, vals] of Object.entries(variations)) {
    if ((s1 === key || vals.includes(s1)) && (s2 === key || vals.includes(s2))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Match experience levels
 */
function matchExperience(requiredYears, candidateYears) {
  if (typeof requiredYears !== 'number' || typeof candidateYears !== 'number') {
    return { score: 15 }; // Default middle score
  }
  
  if (candidateYears >= requiredYears) {
    return { score: 25 };
  } else if (candidateYears >= requiredYears - 1) {
    return { score: 20 };
  } else if (candidateYears >= requiredYears - 2) {
    return { score: 15 };
  } else {
    return { score: 10 };
  }
}

/**
 * Match projects with job requirements
 */
function matchProjects(requiredSkills, keywords, projects) {
  let relevantCount = 0;
  
  projects.forEach(project => {
    // Projects are now strings, not objects (database schema: [String])
    const projectText = (typeof project === 'string' ? project : (project.description || '')).toLowerCase();
    
    // Check if project mentions required skills or keywords
    const isRelevant = requiredSkills.some(skill => 
      projectText.includes(skill.toLowerCase())
    ) || keywords.some(keyword => 
      projectText.includes(keyword.toLowerCase())
    );
    
    if (isRelevant) {
      relevantCount++;
    }
  });
  
  const score = Math.min(20, relevantCount * 5);
  
  return { score };
}

/**
 * Match education levels
 */
function matchEducation(requiredEducation, candidateEducation) {
  const educationLevels = {
    'high school': 1,
    'associate\'s': 2,
    'bachelor\'s': 3,
    'master\'s': 4,
    'ph.d': 5,
    'not specified': 0
  };
  
  const reqLevel = educationLevels[requiredEducation.toLowerCase()] || 0;
  const candLevel = educationLevels[candidateEducation.toLowerCase()] || 0;
  
  if (candLevel >= reqLevel) {
    return { score: 15 };
  } else if (candLevel === reqLevel - 1) {
    return { score: 10 };
  } else {
    return { score: 5 };
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  return denominator === 0 ? 0 : dotProduct / denominator;
}

module.exports = {
  executeHybridRanking,
  calculateSemanticSimilarity,
  calculateRuleBasedMatching,
  calculateKeywordMatching
};
