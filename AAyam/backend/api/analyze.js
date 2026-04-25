const { Anthropic } = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const { connectToDatabase, Scan } = require('./db');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

const SYSTEM_PROMPT = `You are a cybersecurity forensics expert analyzing emails for phishing.
Analyze the email below and return ONLY a JSON object, nothing else, 
no markdown, no explanation, just raw JSON:

{
  "overall_risk": "HIGH or MEDIUM or LOW",
  "risk_score": number between 0 and 100,
  "verdict": "one sentence plain english summary",
  "findings": [
    {
      "type": "finding name",
      "severity": "RED or YELLOW or GREEN",
      "detail": "exact text or technical evidence found in the email",
      "explanation": "plain english explanation for non-technical user",
      "malicious_phrase": "exact phrase from email that is suspicious"
    }
  ]
}

Check for these specifically:
- Sender display name vs actual email address mismatch
- Return-path domain different from sender domain
- Homograph attacks in URLs (e.g. paypaI.com using capital I)
- Urgency or panic language ("act immediately", "suspended", "verify now")
- Requests for personal information or credentials
- Suspicious links that don't match display text
- Fake brand impersonation`;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { subject, sender, senderName, body } = req.body;

    if (!subject || !sender || !body) {
      return res.status(400).json({ error: 'Missing email content' });
    }

    const userMessage = `Email to analyze:
Subject: ${subject}
From: ${senderName} <${sender}>
Body:
${body}`;

    // Call Claude
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": userMessage
            }
          ]
        }
      ]
    });

    let rawJsonText = msg.content[0].text;
    
    // Clean up potential markdown formatting from Claude
    if (rawJsonText.startsWith('```json')) {
      rawJsonText = rawJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (rawJsonText.startsWith('```')) {
      rawJsonText = rawJsonText.replace(/```/g, '').trim();
    }

    let report;
    try {
      report = JSON.parse(rawJsonText);
    } catch (parseError) {
      console.error("JSON parse failed. Raw response:", rawJsonText);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Save to database
    await connectToDatabase();
    const scanRecord = new Scan({
      userId: decoded.userId,
      sender,
      senderName,
      subject,
      riskLevel: report.overall_risk,
      riskScore: report.risk_score,
      verdict: report.verdict,
      findings: report.findings,
      fullReport: report
    });
    
    await scanRecord.save();

    return res.status(200).json(report);

  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};