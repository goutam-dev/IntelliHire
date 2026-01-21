/**
 * Resume Parser Utility
 * Extracts text from PDF and DOCX files
 * Supports multiple formats for FYP Resume Ranking Module
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Main function to parse resume and extract text
 * @param {String} filePath - Absolute path to the resume file
 * @param {String} mimeType - MIME type of the file
 * @returns {Promise<String>} - Extracted text from the resume
 */
async function parseResume(filePath, mimeType) {
  console.log('\n========== RESUME PARSING STARTED ==========');
  console.log(`[Resume Parser] File Path: ${filePath}`);
  console.log(`[Resume Parser] MIME Type: ${mimeType}`);
  
  try {
    // Validate file exists
    console.log('[Resume Parser] Step 1: Validating file exists...');
    await fs.access(filePath);
    console.log('[Resume Parser] ✓ File exists');
    
    // Route to appropriate parser based on MIME type
    console.log('[Resume Parser] Step 2: Detecting file format...');
    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      console.log('[Resume Parser] → Format detected: PDF');
      return await parsePDF(filePath);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      filePath.endsWith('.docx') ||
      filePath.endsWith('.doc')
    ) {
      console.log('[Resume Parser] → Format detected: DOCX/DOC');
      return await parseDOCX(filePath);
    } else if (mimeType === 'text/plain' || filePath.endsWith('.txt')) {
      console.log('[Resume Parser] → Format detected: TXT');
      return await parseTXT(filePath);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}

/**
 * Parse PDF files using pdf-parse library
 * @param {String} filePath - Path to PDF file
 * @returns {Promise<String>} - Extracted text
 */
async function parsePDF(filePath) {
  try {
    console.log('[PDF Parser] Loading pdf-parse library...');
    const pdfParse = require('pdf-parse');
    console.log('[PDF Parser] Reading file buffer...');
    const dataBuffer = await fs.readFile(filePath);
    console.log(`[PDF Parser] File size: ${(dataBuffer.length / 1024).toFixed(2)} KB`);
    
    console.log('[PDF Parser] Extracting text from PDF...');
    const data = await pdfParse(dataBuffer);
    console.log(`[PDF Parser] ✓ Extracted ${data.text.length} characters from ${data.numpages} pages`);
    
    // Clean and normalize the extracted text
    console.log('[PDF Parser] Cleaning extracted text...');
    const cleanedText = cleanText(data.text);
    console.log(`[PDF Parser] ✓ Cleaned text: ${cleanedText.length} characters`);
    
    if (!cleanedText || cleanedText.length < 50) {
      throw new Error('PDF appears to be empty or text extraction failed');
    }
    
    return cleanedText;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Parse DOCX files using mammoth library
 * @param {String} filePath - Path to DOCX file
 * @returns {Promise<String>} - Extracted text
 */
async function parseDOCX(filePath) {
  try {
    console.log('[DOCX Parser] Loading mammoth library...');
    const mammoth = require('mammoth');
    
    console.log('[DOCX Parser] Extracting text from DOCX...');
    const result = await mammoth.extractRawText({ path: filePath });
    console.log(`[DOCX Parser] ✓ Extracted ${result.value.length} characters`);
    
    // Clean and normalize the extracted text
    console.log('[DOCX Parser] Cleaning extracted text...');
    const cleanedText = cleanText(result.value);
    console.log(`[DOCX Parser] ✓ Cleaned text: ${cleanedText.length} characters`);
    
    if (!cleanedText || cleanedText.length < 50) {
      throw new Error('DOCX appears to be empty or text extraction failed');
    }
    
    return cleanedText;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

/**
 * Parse plain text files
 * @param {String} filePath - Path to TXT file
 * @returns {Promise<String>} - Extracted text
 */
async function parseTXT(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const cleanedText = cleanText(content);
    
    if (!cleanedText || cleanedText.length < 50) {
      throw new Error('Text file appears to be empty');
    }
    
    return cleanedText;
  } catch (error) {
    console.error('TXT parsing error:', error);
    throw new Error(`Failed to parse TXT: ${error.message}`);
  }
}

/**
 * Clean and normalize extracted text
 * Removes excessive whitespace, special characters, etc.
 * @param {String} text - Raw extracted text
 * @returns {String} - Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  
  return text
    // Remove null bytes and control characters
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive spaces
    .replace(/ {2,}/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Extract metadata from resume file
 * @param {String} filePath - Path to resume file
 * @returns {Promise<Object>} - File metadata
 */
async function extractFileMetadata(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    return {
      fileName: path.basename(filePath),
      fileSize: stats.size,
      extension: ext,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return null;
  }
}

/**
 * Validate resume file before processing
 * @param {String} filePath - Path to resume file
 * @param {Number} maxSizeInMB - Maximum file size in MB (default 10MB)
 * @returns {Promise<Object>} - Validation result { valid: boolean, error: string }
 */
async function validateResumeFile(filePath, maxSizeInMB = 10) {
  try {
    // Check if file exists
    await fs.access(filePath);
    
    // Get file stats
    const stats = await fs.stat(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    // Check file size
    if (fileSizeInMB > maxSizeInMB) {
      return {
        valid: false,
        error: `File size (${fileSizeInMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeInMB}MB)`
      };
    }
    
    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File type ${ext} is not supported. Allowed types: ${allowedExtensions.join(', ')}`
      };
    }
    
    return { valid: true, error: null };
  } catch (error) {
    return {
      valid: false,
      error: `File validation failed: ${error.message}`
    };
  }
}

/**
 * Extract sections from resume text (basic heuristic-based extraction)
 * This helps structure the resume for better AI analysis
 * @param {String} resumeText - Full resume text
 * @returns {Object} - Structured sections
 */
function extractResumeSections(resumeText) {
  const sections = {
    summary: '',
    experience: '',
    education: '',
    skills: '',
    projects: '',
    certifications: '',
    other: ''
  };
  
  // Common section headers (case-insensitive)
  const sectionPatterns = {
    summary: /(?:^|\n)(professional summary|summary|objective|profile)(?:\s*[:\-]?\s*)/i,
    experience: /(?:^|\n)(work experience|experience|employment history|professional experience)(?:\s*[:\-]?\s*)/i,
    education: /(?:^|\n)(education|academic background|qualifications)(?:\s*[:\-]?\s*)/i,
    skills: /(?:^|\n)(skills|technical skills|core competencies|areas of expertise)(?:\s*[:\-]?\s*)/i,
    projects: /(?:^|\n)(projects|key projects|academic projects|personal projects)(?:\s*[:\-]?\s*)/i,
    certifications: /(?:^|\n)(certifications|certificates|licenses|professional development)(?:\s*[:\-]?\s*)/i
  };
  
  // Try to identify and extract sections
  const lines = resumeText.split('\n');
  let currentSection = 'other';
  let sectionContent = [];
  
  for (const line of lines) {
    let foundSection = false;
    
    // Check if line matches any section header
    for (const [sectionName, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(line)) {
        // Save previous section
        if (sectionContent.length > 0) {
          sections[currentSection] += sectionContent.join('\n') + '\n\n';
        }
        
        // Start new section
        currentSection = sectionName;
        sectionContent = [];
        foundSection = true;
        break;
      }
    }
    
    // Add line to current section
    if (!foundSection && line.trim()) {
      sectionContent.push(line);
    }
  }
  
  // Save last section
  if (sectionContent.length > 0) {
    sections[currentSection] += sectionContent.join('\n');
  }
  
  // If no sections were identified, put everything in 'other'
  if (Object.values(sections).every(s => !s.trim())) {
    sections.other = resumeText;
  }
  
  return sections;
}

module.exports = {
  parseResume,
  parsePDF,
  parseDOCX,
  parseTXT,
  cleanText,
  extractFileMetadata,
  validateResumeFile,
  extractResumeSections
};
