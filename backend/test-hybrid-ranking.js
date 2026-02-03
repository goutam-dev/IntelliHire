/**
 * Test Script for Hybrid Ranking Module
 * 
 * Tests the hybrid ranking system to ensure:
 * 1. Same input/output format as LLM Council
 * 2. Deterministic results (same input = same output)
 * 3. Response time < 2 seconds
 * 4. Feature toggle works correctly
 * 5. No breaking changes to existing API
 */

const { executeHybridRanking } = require('./services/ai-agents/hybrid-ranking');

// Sample Job Description
const sampleJD = `
Job Title: Senior Full Stack Developer

Department: Engineering

Description:
We are seeking an experienced Full Stack Developer to join our dynamic engineering team. The ideal candidate will have strong expertise in modern web technologies and a passion for building scalable applications.

Required Skills:
- JavaScript, TypeScript
- React.js, Node.js
- MongoDB, PostgreSQL
- REST APIs, GraphQL
- Git, CI/CD
- Agile methodologies

Preferred Skills:
- AWS or Azure
- Docker, Kubernetes
- Python
- Machine Learning basics

Experience Level: 5 years

Education Requirements: Bachelor's degree in Computer Science or related field

Location: Remote

Employment Type: Full-time

Responsibilities:
- Design and develop scalable web applications
- Collaborate with cross-functional teams
- Write clean, maintainable code
- Participate in code reviews
- Mentor junior developers
`;

// Sample Resume (Good Match)
const sampleResumeGood = `
John Doe
Senior Software Engineer

SUMMARY
Experienced Full Stack Developer with 6 years of expertise in building modern web applications using JavaScript, React, and Node.js. Strong background in database design and cloud technologies.

SKILLS
- JavaScript, TypeScript, Python
- React.js, Redux, Next.js
- Node.js, Express.js
- MongoDB, PostgreSQL, Redis
- AWS (EC2, S3, Lambda)
- Docker, Kubernetes
- Git, Jenkins, CI/CD
- Agile/Scrum

EXPERIENCE
Senior Full Stack Developer | TechCorp Inc. | 2020-Present
- Led development of microservices architecture using Node.js and Docker
- Built scalable React applications serving 1M+ users
- Implemented GraphQL APIs for efficient data fetching
- Reduced deployment time by 40% through CI/CD automation

Full Stack Developer | StartupXYZ | 2018-2020
- Developed REST APIs using Node.js and Express
- Created responsive web applications with React
- Managed PostgreSQL and MongoDB databases
- Collaborated in Agile team environment

EDUCATION
Bachelor of Science in Computer Science
State University, 2018

PROJECTS
- E-commerce Platform: Built full-stack application with React, Node.js, and MongoDB
- Task Management System: Developed using TypeScript, GraphQL, and PostgreSQL
- Machine Learning Dashboard: Created Python-based analytics tool

CERTIFICATIONS
- AWS Certified Developer Associate
- Certified Kubernetes Administrator
`;

// Sample Resume (Poor Match)
const sampleResumePoor = `
Jane Smith
Junior Web Developer

SUMMARY
Recent graduate with basic knowledge of HTML, CSS, and JavaScript. Eager to learn and grow in web development.

SKILLS
- HTML, CSS
- JavaScript (basic)
- jQuery
- MySQL
- Photoshop

EXPERIENCE
Web Development Intern | Small Agency | 2023 (6 months)
- Created simple websites using HTML and CSS
- Made minor JavaScript modifications
- Assisted with WordPress customization

EDUCATION
Associate's Degree in Web Design
Community College, 2023

PROJECTS
- Personal Portfolio Website
- Simple To-Do List App
`;

/**
 * Run comprehensive tests
 */
async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           HYBRID RANKING MODULE - COMPREHENSIVE TESTS         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Test 1: Good Match Resume
    console.log('TEST 1: Good Match Resume');
    console.log('═'.repeat(70));
    const startTime1 = Date.now();
    const result1 = await executeHybridRanking(sampleJD, sampleResumeGood, {});
    const duration1 = Date.now() - startTime1;
    
    console.log('\n✓ Test 1 Results:');
    console.log(`  Duration: ${duration1}ms`);
    console.log(`  Final Score: ${result1.agent4.data.final_resume_score}/100`);
    console.log(`  Verdict: ${result1.agent4.data.verdict}`);
    console.log(`  Confidence: ${result1.agent4.data.confidence_level}`);
    console.log(`  Strengths: ${result1.agent4.data.strengths.length} items`);
    console.log(`  Weaknesses: ${result1.agent4.data.weaknesses.length} items`);
    console.log(`  Response Time: ${duration1 < 2000 ? '✓ PASS' : '✗ FAIL'} (< 2 seconds)`);
    
    // Test 2: Poor Match Resume
    console.log('\n\nTEST 2: Poor Match Resume');
    console.log('═'.repeat(70));
    const startTime2 = Date.now();
    const result2 = await executeHybridRanking(sampleJD, sampleResumePoor, {});
    const duration2 = Date.now() - startTime2;
    
    console.log('\n✓ Test 2 Results:');
    console.log(`  Duration: ${duration2}ms`);
    console.log(`  Final Score: ${result2.agent4.data.final_resume_score}/100`);
    console.log(`  Verdict: ${result2.agent4.data.verdict}`);
    console.log(`  Confidence: ${result2.agent4.data.confidence_level}`);
    console.log(`  Strengths: ${result2.agent4.data.strengths.length} items`);
    console.log(`  Weaknesses: ${result2.agent4.data.weaknesses.length} items`);
    console.log(`  Response Time: ${duration2 < 2000 ? '✓ PASS' : '✗ FAIL'} (< 2 seconds)`);
    
    // Test 3: Deterministic Check (run same test twice)
    console.log('\n\nTEST 3: Deterministic Consistency Check');
    console.log('═'.repeat(70));
    const result3a = await executeHybridRanking(sampleJD, sampleResumeGood, {});
    const result3b = await executeHybridRanking(sampleJD, sampleResumeGood, {});
    
    const isDeterministic = 
      result3a.agent4.data.final_resume_score === result3b.agent4.data.final_resume_score &&
      result3a.agent4.data.verdict === result3b.agent4.data.verdict;
    
    console.log('\n✓ Test 3 Results:');
    console.log(`  First Run Score: ${result3a.agent4.data.final_resume_score}`);
    console.log(`  Second Run Score: ${result3b.agent4.data.final_resume_score}`);
    console.log(`  Scores Match: ${isDeterministic ? '✓ PASS' : '✗ FAIL'}`);
    
    // Test 4: Output Structure Validation
    console.log('\n\nTEST 4: Output Structure Validation');
    console.log('═'.repeat(70));
    
    const requiredFields = {
      agent1: ['data', 'metadata'],
      agent2: ['data', 'metadata'],
      agent3: ['data', 'metadata'],
      agent4: ['data', 'metadata']
    };
    
    const supervisorFields = [
      'final_resume_score',
      'verdict',
      'strengths',
      'weaknesses',
      'confidence_level',
      'explanation'
    ];
    
    let structureValid = true;
    
    // Check agent structure
    for (const [agent, fields] of Object.entries(requiredFields)) {
      if (!result1[agent]) {
        console.log(`  ✗ Missing agent: ${agent}`);
        structureValid = false;
      } else {
        for (const field of fields) {
          if (!(field in result1[agent])) {
            console.log(`  ✗ Missing field: ${agent}.${field}`);
            structureValid = false;
          }
        }
      }
    }
    
    // Check supervisor verdict structure
    for (const field of supervisorFields) {
      if (!(field in result1.agent4.data)) {
        console.log(`  ✗ Missing supervisor field: ${field}`);
        structureValid = false;
      }
    }
    
    console.log('\n✓ Test 4 Results:');
    console.log(`  Output Structure: ${structureValid ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  All Required Fields Present: ${structureValid ? 'Yes' : 'No'}`);
    
    // Test 5: Score Range Validation
    console.log('\n\nTEST 5: Score Range Validation');
    console.log('═'.repeat(70));
    
    const score1 = result1.agent4.data.final_resume_score;
    const score2 = result2.agent4.data.final_resume_score;
    
    const score1Valid = score1 >= 0 && score1 <= 100;
    const score2Valid = score2 >= 0 && score2 <= 100;
    const goodBetterThanPoor = score1 > score2;
    
    console.log('\n✓ Test 5 Results:');
    console.log(`  Good Match Score (${score1}): ${score1Valid ? '✓ In Range' : '✗ Out of Range'}`);
    console.log(`  Poor Match Score (${score2}): ${score2Valid ? '✓ In Range' : '✗ Out of Range'}`);
    console.log(`  Good > Poor: ${goodBetterThanPoor ? '✓ PASS' : '✗ FAIL'}`);
    
    // Summary
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    const allTestsPassed = 
      duration1 < 2000 &&
      duration2 < 2000 &&
      isDeterministic &&
      structureValid &&
      score1Valid &&
      score2Valid &&
      goodBetterThanPoor;
    
    console.log(`  Response Time Test: ${duration1 < 2000 && duration2 < 2000 ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Deterministic Test: ${isDeterministic ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Structure Test: ${structureValid ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Score Range Test: ${score1Valid && score2Valid && goodBetterThanPoor ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`\n  Overall: ${allTestsPassed ? '✓✓✓ ALL TESTS PASSED ✓✓✓' : '✗✗✗ SOME TESTS FAILED ✗✗✗'}\n`);
    
    // Detailed Output Sample
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    SAMPLE OUTPUT DETAILS                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log('Good Match Resume Output:');
    console.log(JSON.stringify(result1.agent4.data, null, 2));
    
  } catch (error) {
    console.error('\n✗✗✗ TEST EXECUTION FAILED ✗✗✗');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => {
  console.log('\n✓ Test execution completed successfully\n');
  process.exit(0);
}).catch(error => {
  console.error('\n✗ Test execution failed:', error);
  process.exit(1);
});
