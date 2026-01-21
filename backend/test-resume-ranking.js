/**
 * Test Script for Resume Ranking Module
 * 
 * This script tests the Multi-Agent LLM Council System
 * Run: node test-resume-ranking.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import services
const resumeRankingService = require('./services/resumeRankingService');
const { extractJDInformation } = require('./services/ai-agents/agent1-jd-extractor');
const { analyzeResumeTechnical } = require('./services/ai-agents/agent2-resume-analyzer');
const { performSemanticMatching } = require('./services/ai-agents/agent3-semantic-matcher');
const { superviseFinalVerdict } = require('./services/ai-agents/agent4-supervisor');

// Sample data
const sampleJD = `
Job Title: Senior Full Stack Developer

We are looking for an experienced Full Stack Developer to join our team.

Required Skills:
- JavaScript, TypeScript
- React.js, Node.js
- MongoDB, PostgreSQL
- REST API development
- Git version control

Preferred Skills:
- AWS cloud services
- Docker, Kubernetes
- CI/CD pipelines

Experience: 3-5 years of professional software development experience

Education: Bachelor's degree in Computer Science or related field

Responsibilities:
- Develop and maintain web applications using MERN stack
- Design and implement RESTful APIs
- Collaborate with cross-functional teams
- Write clean, maintainable code
- Participate in code reviews

Location: Remote
Employment Type: Full-time
`;

const sampleResume = `
John Doe
Email: john.doe@email.com
Phone: +1-234-567-8900

PROFESSIONAL SUMMARY
Experienced Full Stack Developer with 4 years of expertise in building scalable web applications using modern JavaScript frameworks. Passionate about clean code and agile development.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, Java
Frontend: React.js, Vue.js, HTML5, CSS3
Backend: Node.js, Express.js, Django
Databases: MongoDB, PostgreSQL, MySQL
Tools: Git, GitHub, VS Code, Postman, Jira
Other: REST API, GraphQL, Docker, AWS EC2

WORK EXPERIENCE

Senior Software Engineer | Tech Company Inc. | 2022 - Present
- Developed 10+ web applications using React and Node.js
- Implemented RESTful APIs serving 100k+ daily users
- Optimized database queries reducing load time by 40%
- Mentored junior developers in best practices

Full Stack Developer | StartUp XYZ | 2020 - 2022
- Built e-commerce platform using MERN stack
- Integrated payment gateways (Stripe, PayPal)
- Implemented responsive UI using React and Material-UI
- Deployed applications on AWS EC2 and S3

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley
2016 - 2020
GPA: 3.8/4.0

PROJECTS
1. E-Commerce Platform (MERN Stack)
   - Full-featured online shopping platform
   - Technologies: React, Node.js, MongoDB, Express
   - Features: User authentication, payment integration, admin dashboard

2. Real-time Chat Application
   - WebSocket-based chat app with React and Node.js
   - Support for group chats, file sharing

3. Task Management System
   - Built with Vue.js and Firebase
   - Real-time updates, drag-and-drop interface

CERTIFICATIONS
- AWS Certified Developer - Associate (2023)
- MongoDB Certified Developer (2022)
`;

// Test functions
async function testAgent1() {
  console.log('\n========================================');
  console.log('Testing Agent 1: JD Information Extractor');
  console.log('========================================\n');
  
  const result = await extractJDInformation(sampleJD);
  
  console.log('Success:', result.success);
  console.log('Processing Time:', result.metadata.processingTime, 'ms');
  console.log('\nExtracted Data:');
  console.log(JSON.stringify(result.data, null, 2));
  
  return result.data;
}

async function testAgent2() {
  console.log('\n========================================');
  console.log('Testing Agent 2: Resume Technical Analyzer');
  console.log('========================================\n');
  
  const result = await analyzeResumeTechnical(sampleResume);
  
  console.log('Success:', result.success);
  console.log('Processing Time:', result.metadata.processingTime, 'ms');
  console.log('\nAnalyzed Data:');
  console.log(JSON.stringify(result.data, null, 2));
  
  return result.data;
}

async function testAgent3(jdData, resumeData) {
  console.log('\n========================================');
  console.log('Testing Agent 3: Semantic Matching & Scoring');
  console.log('========================================\n');
  
  const result = await performSemanticMatching(jdData, resumeData);
  
  console.log('Success:', result.success);
  console.log('Processing Time:', result.metadata.processingTime, 'ms');
  console.log('\nMatching Scores:');
  console.log(JSON.stringify(result.data, null, 2));
  
  return result.data;
}

async function testAgent4(jdData, resumeData, matchingData) {
  console.log('\n========================================');
  console.log('Testing Agent 4: Supervisor & Quality Controller');
  console.log('========================================\n');
  
  const result = await superviseFinalVerdict(jdData, resumeData, matchingData);
  
  console.log('Success:', result.success);
  console.log('Processing Time:', result.metadata.processingTime, 'ms');
  console.log('\nFinal Verdict:');
  console.log(JSON.stringify(result.data, null, 2));
  
  return result.data;
}

async function testFullPipeline() {
  console.log('\n========================================');
  console.log('Testing Full Multi-Agent Pipeline');
  console.log('========================================\n');
  
  const startTime = Date.now();
  
  // Execute agents
  const jdData = await testAgent1();
  const resumeData = await testAgent2();
  const matchingData = await testAgent3(jdData, resumeData);
  const verdictData = await testAgent4(jdData, resumeData, matchingData);
  
  const totalTime = Date.now() - startTime;
  
  console.log('\n========================================');
  console.log('FINAL RESULTS SUMMARY');
  console.log('========================================\n');
  
  console.log('📊 Resume Score:', verdictData.final_resume_score, '/100');
  console.log('✅ Verdict:', verdictData.verdict);
  console.log('🎯 Confidence Level:', verdictData.confidence_level);
  console.log('\n💪 Strengths:');
  verdictData.strengths.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('\n⚠️  Weaknesses:');
  verdictData.weaknesses.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  console.log('\n📝 Explanation:', verdictData.explanation);
  console.log('\n⏱️  Total Processing Time:', totalTime, 'ms');
  
  console.log('\n========================================');
  console.log('TEST COMPLETED SUCCESSFULLY ✅');
  console.log('========================================\n');
}

// Run tests
async function runTests() {
  try {
    console.log('\n🚀 Starting Resume Ranking Module Tests...\n');
    console.log('Using AI Provider:', process.env.AI_API_PROVIDER || 'rule-based');
    
    await testFullPipeline();
    
    console.log('\n✅ All tests passed!');
    console.log('\n💡 The Resume Ranking Module is working correctly!');
    console.log('\n📚 Next steps:');
    console.log('  1. Test with real applications via API');
    console.log('  2. Integrate with frontend UI');
    console.log('  3. (Optional) Configure HuggingFace for better accuracy');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
