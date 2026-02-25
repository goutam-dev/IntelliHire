const fs = require('fs');
const file = 'src/pages/candidate/InterviewProctoring.jsx';
// UPDATED PATCH - handles CRLF line endings

// Read and normalize to LF
let c = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
let changes = 0;

// ── Fix 2a: hardTimer should clear initialWaitTimer ──────────────────────
const ht_old = '  hardTimer = setTimeout(() => {\n    if (!stopped) {\n      stopped = true;\n      clearTimeout(silenceTimer);\n      try { rec?.stop(); } catch { }';
const ht_new = '  hardTimer = setTimeout(() => {\n    if (!stopped) {\n      stopped = true;\n      clearTimeout(silenceTimer);\n      clearTimeout(initialWaitTimer);\n      try { rec?.stop(); } catch { }';
if (c.includes(ht_old)) { c = c.replace(ht_old, ht_new); changes++; console.log('Fix 2a: hardTimer updated'); }
else console.log('Fix 2a NOT found');

// ── Fix 2b: Normalize encoded em-dash in timed out string ────────────────
// The file has UTF-8 bytes for em-dash but displayed wrong
const badStr = '\u00e2\u0080\u0093';
if (c.includes(badStr)) {
  c = c.replace(new RegExp(badStr, 'g'), '-');
  changes++;
  console.log('Fix 2b: encoded em-dash fixed');
} else {
  // Try UTF-8 em-dash
  c = c.replace(/\(no response \u2013 timed out\)/g, '(no response - timed out)');
  c = c.replace(/\(no response \u2014 timed out\)/g, '(no response - timed out)');
  c = c.replace(/\(no response â€" timed out\)/g, '(no response - timed out)');
  console.log('Fix 2b: attempted multiple em-dash variants');
  changes++;
}

// ── Fix 2c: return cleanup should clear initialWaitTimer ─────────────────
const ret_old = '  return () => {\n    stopped = true;\n    clearTimeout(silenceTimer);\n    clearTimeout(hardTimer);\n    try { rec?.stop(); } catch { }\n    if (finalText) onFinal(finalText);\n  };\n}';
const ret_new = '  return () => {\n    stopped = true;\n    clearTimeout(silenceTimer);\n    clearTimeout(hardTimer);\n    clearTimeout(initialWaitTimer);\n    try { rec?.stop(); } catch { }\n    if (finalText) onFinal(finalText);\n  };\n}';
if (c.includes(ret_old)) { c = c.replace(ret_old, ret_new); changes++; console.log('Fix 2c: return cleanup updated'); }
else console.log('Fix 2c NOT found');

// ── Fix 3: Update generateQuestionFromGroq prompt ────────────────────────
const pStart = '  const questionCount = conversationHistory.filter((m) => m.role === "assistant").length;';
const pIdx = c.indexOf(pStart);
if (pIdx !== -1) {
  // Find the end of this if/else block - look for the next section comment or code
  const blockEndMarker = '\n\n  // Fallback';
  const blockEnd = c.indexOf(blockEndMarker, pIdx);
  if (blockEnd !== -1) {
    const new3 = `  const questionCount = conversationHistory.filter((m) => m.role === "assistant").length;
  const unansweredCount = conversationHistory.filter(
    (m) => m.role === "user" && m.content.startsWith("(no response")
  ).length;

  if (questionCount === 0) {
    systemPrompt += \`This is the FIRST question. Welcome the candidate briefly (one sentence) and ask them to introduce \` +
      \`themselves and describe their most relevant experience for this \${jobTitle} role.\`;
  } else {
    systemPrompt +=
      \`## Cross-Examination Strategy\\n\` +
      \`You MUST actively reference specifics from the candidate's resume (projects, technologies, past roles, achievements) \` +
      \`when formulating questions. Cross-examine their claims -- if they mentioned a project or technology in their resume \` +
      \`or an earlier answer, dig deeper: ask HOW they implemented it, what technical challenges they faced, \` +
      \`what tradeoffs they made, and what they would do differently now. If an earlier answer was vague or unconvincing, \` +
      \`challenge it directly with a targeted follow-up.\\n\\n\` +
      \`## When to End the Interview\\n\` +
      \`You have asked \${questionCount} question(s) so far. The candidate has left \${unansweredCount} question(s) unanswered. \` +
      \`You MAY decide to end the interview when BOTH conditions are true: \` +
      \`(a) you have asked at least 8 questions, AND \` +
      \`(b) you feel confident in your overall assessment -- \` +
      \`whether positive (thoroughly impressed) or negative (consistently poor or evasive answers). \` +
      \`To signal that the interview should end, output ONLY this exact token on its own: [END_INTERVIEW]\\n\\n\` +
      \`Otherwise, ask the NEXT interview question. Output ONLY the question -- \` +
      \`no preamble, no "Great answer", no pleasantries, no numbering. One concise, focused question.\`;
  }`;
    c = c.substring(0, pIdx) + new3 + c.substring(blockEnd);
    changes++;
    console.log('Fix 3: prompt updated with cross-questioning + END_INTERVIEW');
  } else {
    console.log('Fix 3: Fallback comment not found after prompt block');
  }
} else {
  console.log('Fix 3: questionCount line not found');
}

// ── Fix 5: Add [END_INTERVIEW] check after question is generated ──────────
const old5 = `        questionCounterRef.current += 1;
        setCurrentQuestion(question);
        setQuestionIndex(questionCounterRef.current);

        await handleSpeak(
          question,
          () => setAiStatus(AI_VOICE_STATUS.SPEAKING),
          () => setAiStatus(AI_VOICE_STATUS.LISTENING)
        );`;
const new5 = `        // LLM-triggered interview termination
        if (question.trim() === "[END_INTERVIEW]" || question.includes("[END_INTERVIEW]")) {
          if (!wrappingUpRef.current) {
            wrappingUpRef.current = true;
            setAiStatus(AI_VOICE_STATUS.WRAPPING_UP);
            const closingLine =
              "I have gathered enough information to make a thorough assessment. " +
              "That concludes our interview session. Thank you so much for your time today. " +
              "We will be in touch soon with the next steps. Take care!";
            await handleSpeak(closingLine, () => setAiStatus(AI_VOICE_STATUS.WRAPPING_UP), () => {});
            setTimeout(() => onComplete?.(history, evaluations), 1500);
          }
          return;
        }

        questionCounterRef.current += 1;
        setCurrentQuestion(question);
        setQuestionIndex(questionCounterRef.current);

        await handleSpeak(
          question,
          () => setAiStatus(AI_VOICE_STATUS.SPEAKING),
          () => setAiStatus(AI_VOICE_STATUS.LISTENING)
        );`;
if (c.includes(old5)) { c = c.replace(old5, new5); changes++; console.log('Fix 5: END_INTERVIEW signal handler added'); }
else { console.log('Fix 5 NOT found'); }

// ── Fix 6: Update onFinal and onError callbacks ───────────────────────────
const onFinalStart = `          async (finalText) => {\n            stopListeningRef.current = null;\n            setFinalTranscript(finalText);\n            setLiveTranscript("");\n            setAiStatus(AI_VOICE_STATUS.PROCESSING);\n\n            const updatedHistory = [`;
const errEndMarker = `            setTimeout(() => askNextQuestionRef.current?.(updatedHistory), 2000);\n          }`;
const idx6 = c.indexOf(onFinalStart);
const errEndIdx = idx6 !== -1 ? c.indexOf(errEndMarker, idx6) : -1;

if (idx6 !== -1 && errEndIdx !== -1) {
  const endIdx = errEndIdx + errEndMarker.length;
  const new6 = `          async (finalText) => {
            stopListeningRef.current = null;
            setFinalTranscript(finalText);
            setLiveTranscript("");
            setAiStatus(AI_VOICE_STATUS.PROCESSING);

            const isUnanswered = finalText.startsWith("(no response");

            if (isUnanswered) {
              consecutiveSilentRef.current += 1;
              totalUnansweredRef.current += 1;
              console.warn(
                \`[Interview] No response -- consecutive: \${consecutiveSilentRef.current}, total: \${totalUnansweredRef.current}\`
              );
              setEvaluations((prev) => [
                ...prev,
                {
                  score: 0,
                  feedback: "No response given -- question was skipped.",
                  topics: [],
                  question,
                  answer: finalText,
                  unanswered: true,
                },
              ]);
            } else {
              consecutiveSilentRef.current = 0;
            }

            const updatedHistory = [
              ...history,
              { role: "assistant", content: question },
              { role: "user", content: finalText },
            ];
            setConversationHistory(updatedHistory);

            // Auto-terminate after 3 consecutive silent questions
            if (consecutiveSilentRef.current >= 3) {
              if (!wrappingUpRef.current) {
                wrappingUpRef.current = true;
                setAiStatus(AI_VOICE_STATUS.WRAPPING_UP);
                const terminationLine =
                  "I notice you have not been able to respond to the last few questions. " +
                  "I will need to conclude our session here. " +
                  "Thank you for your time today. We will be in touch with our findings shortly.";
                await handleSpeak(terminationLine, () => setAiStatus(AI_VOICE_STATUS.WRAPPING_UP), () => {});
                setTimeout(() => onComplete?.(updatedHistory, evaluations), 1500);
              }
              return;
            }

            // Evaluate in parallel -- don't block next question on it
            if (!isUnanswered) {
              evaluateAnswerWithGroq(question, finalText, jobTitle).then((evalResult) => {
                lastEvalRef.current = evalResult;
                if (evalResult.score !== null) {
                  console.info(\`[Eval] Q\${questionCounterRef.current} | Score: \${evalResult.score}/10 | \${evalResult.feedback}\`);
                  setEvaluations((prev) => [...prev, { ...evalResult, question, answer: finalText }]);
                }
              });
            } else {
              lastEvalRef.current = { score: 0, feedback: "No response -- question was skipped.", topics: [] };
            }

            await new Promise((r) => setTimeout(r, 1200));
            askNextQuestionRef.current?.(updatedHistory);
          },
          (err) => {
            console.warn("[STT] Error:", err);
            consecutiveSilentRef.current += 1;
            totalUnansweredRef.current += 1;
            const updatedHistory = [
              ...history,
              { role: "assistant", content: question },
              { role: "user", content: "(no response detected)" },
            ];
            setConversationHistory(updatedHistory);
            setEvaluations((prev) => [
              ...prev,
              {
                score: 0,
                feedback: "No response given -- question was skipped.",
                topics: [],
                question,
                answer: "(no response detected)",
                unanswered: true,
              },
            ]);
            if (consecutiveSilentRef.current >= 3 && !wrappingUpRef.current) {
              wrappingUpRef.current = true;
              setAiStatus(AI_VOICE_STATUS.WRAPPING_UP);
              const terminationLine =
                "I notice you have not been able to respond to the last few questions. " +
                "I will need to conclude our session here. " +
                "Thank you for your time today. We will be in touch with our findings shortly.";
              handleSpeak(terminationLine, () => setAiStatus(AI_VOICE_STATUS.WRAPPING_UP), () => {}).then(() => {
                setTimeout(() => onComplete?.(updatedHistory, evaluations), 1500);
              });
              return;
            }
            setTimeout(() => askNextQuestionRef.current?.(updatedHistory), 2000);
          }`;
  c = c.substring(0, idx6) + new6 + c.substring(endIdx);
  changes++;
  console.log('Fix 6: onFinal & onError callbacks updated with silence tracking');
} else {
  console.log('Fix 6 NOT found (idx6=' + idx6 + ', errEndIdx=' + errEndIdx + ')');
  if (idx6 !== -1) {
    console.log('Sample after onFinal start:', JSON.stringify(c.substring(idx6 + onFinalStart.length, idx6 + onFinalStart.length + 400)));
  }
}

// Add the unanswered progress dot color to the UI (change grey dots for unanswered questions)
const dotOld = `  ? "bg-emerald-500"
                    : ev.score >= 5
                    ? "bg-amber-500"
                    : "bg-red-500"
                  : "bg-slate-700"`;
const dotNew = `  ? "bg-emerald-500"
                    : ev.score >= 5
                    ? "bg-amber-500"
                    : ev.unanswered
                    ? "bg-slate-600 opacity-40"
                    : "bg-red-500"
                  : "bg-slate-700"`;
if (c.includes(dotOld)) { c = c.replace(dotOld, dotNew); changes++; console.log('Fix 7: progress dot colors updated for unanswered'); }
else console.log('Fix 7 (dot colors) NOT found - skipping');

// Write back with CRLF
fs.writeFileSync(file, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('\nTotal changes applied: ' + changes);
console.log('File saved.');

