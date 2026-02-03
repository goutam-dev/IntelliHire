/**
 * Quick test to verify projects are strings, not objects
 */

const { executeHybridRanking } = require('./services/ai-agents/hybrid-ranking');

const sampleJD = `
Job Title: Marketing Manager
Required Skills: SEO, PPC, Social Media Marketing
`;

const sampleResume = `
PROJECTS:
- Led a full-scale brand repositioning campaign for a D2C skincare brand
- Executed a 90-day multi-channel campaign (SEO, PPC, Email, Social)
- Developed data dashboards using Google Analytics 4 and Looker Studio
`;

async function testProjectsFormat() {
  console.log('Testing projects format...\n');
  
  const result = await executeHybridRanking(sampleJD, sampleResume, {});
  
  const resumeData = result.agent2.data;
  
  console.log('Projects data:');
  console.log(JSON.stringify(resumeData.projects, null, 2));
  console.log('\nProjects type check:');
  
  if (Array.isArray(resumeData.projects)) {
    console.log('✓ Projects is an array');
    
    if (resumeData.projects.length > 0) {
      const firstProject = resumeData.projects[0];
      console.log(`✓ First project type: ${typeof firstProject}`);
      
      if (typeof firstProject === 'string') {
        console.log('✓✓✓ SUCCESS: Projects are strings (correct format)');
        console.log(`✓ Sample project: "${firstProject.substring(0, 50)}..."`);
      } else if (typeof firstProject === 'object') {
        console.log('✗✗✗ FAIL: Projects are objects (will cause database error)');
        console.log(`✗ Project structure: ${JSON.stringify(firstProject)}`);
      }
    } else {
      console.log('⚠ No projects found in resume');
    }
  } else {
    console.log('✗ Projects is not an array');
  }
}

testProjectsFormat().then(() => {
  console.log('\n✓ Test complete');
  process.exit(0);
}).catch(error => {
  console.error('\n✗ Test failed:', error);
  process.exit(1);
});
