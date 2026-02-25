/**
 * videoProcessor.js
 * Utility for processing application videos:
 *  - extractAudio()      → WAV file for voice-verification during interview
 *  - createSilentVideo() → silent MP4 for facial-verification during interview
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Point fluent-ffmpeg at the bundled binary (no system ffmpeg required)
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Wrap ffmpeg in a promise.
 * @param {Function} configureFn  Receives an ffmpeg command and configures it.
 * @returns {Promise<void>}
 */
const runFfmpeg = (configureFn) =>
  new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    configureFn(cmd);
    cmd
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .run();
  });

/**
 * Extract audio from a video file and save as 16 kHz mono WAV.
 * Suitable for voice-verification / speaker-recognition systems.
 *
 * @param {string} inputPath   Absolute path to the source video file.
 * @param {string} outputPath  Absolute path for the output WAV file.
 * @returns {Promise<void>}
 */
const extractAudio = async (inputPath, outputPath) => {
  logger.info(`[videoProcessor] extractAudio: ${inputPath} → ${outputPath}`);

  // Ensure the output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await runFfmpeg((cmd) => {
    cmd
      .input(inputPath)
      .noVideo()                   // drop all video streams
      .audioCodec('pcm_s16le')     // 16-bit signed little-endian PCM → WAV
      .audioFrequency(16000)       // 16 kHz sample rate (standard for speech)
      .audioChannels(1)            // mono
      .format('wav')
      .output(outputPath);
  });

  logger.info(`[videoProcessor] Audio extraction complete: ${outputPath}`);
};

/**
 * Strip all audio tracks from a video and re-encode as H.264/AAC-less MP4.
 * Suitable for facial-verification systems that only need visual frames.
 *
 * @param {string} inputPath   Absolute path to the source video file.
 * @param {string} outputPath  Absolute path for the output silent MP4 file.
 * @returns {Promise<void>}
 */
const createSilentVideo = async (inputPath, outputPath) => {
  logger.info(`[videoProcessor] createSilentVideo: ${inputPath} → ${outputPath}`);

  // Ensure the output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await runFfmpeg((cmd) => {
    cmd
      .input(inputPath)
      .noAudio()                   // drop all audio streams
      .videoCodec('libx264')       // re-encode to H.264
      .outputOptions([
        '-crf 23',                 // constant rate factor – good quality/size balance
        '-preset fast',            // encoding speed vs compression trade-off
        '-movflags +faststart',    // optimise for streaming / fast seek
        '-pix_fmt yuv420p',        // widest compatibility
      ])
      .format('mp4')
      .output(outputPath);
  });

  logger.info(`[videoProcessor] Silent video creation complete: ${outputPath}`);
};

/**
 * Process an application video: extract audio WAV + create silent MP4.
 * Both operations run concurrently.
 *
 * @param {string} videoFilePath  Absolute path to the source video.
 * @param {string} baseName       Base name (no extension) used to generate output filenames.
 * @param {string} audioOutDir    Absolute path to the audio output directory.
 * @param {string} silentOutDir   Absolute path to the silent-video output directory.
 * @returns {Promise<{ audioPath: string, silentVideoPath: string }>}
 *          Absolute paths of both generated files.
 */
const processApplicationVideo = async (videoFilePath, baseName, audioOutDir, silentOutDir) => {
  const audioOutputPath = path.join(audioOutDir, `${baseName}.wav`);
  const silentVideoOutputPath = path.join(silentOutDir, `${baseName}-silent.mp4`);

  // Run both operations in parallel for efficiency
  await Promise.all([
    extractAudio(videoFilePath, audioOutputPath),
    createSilentVideo(videoFilePath, silentVideoOutputPath),
  ]);

  return {
    audioPath: audioOutputPath,
    silentVideoPath: silentVideoOutputPath,
  };
};

module.exports = {
  extractAudio,
  createSilentVideo,
  processApplicationVideo,
};
