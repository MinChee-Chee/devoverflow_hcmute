/**
 * Spam Detection Bot
 * Scans articles (questions/answers) for spam or prohibited content
 */

export interface SpamDetectionResult {
  isSpam: boolean;
  spamScore: number;
  reason?: string;
}

// Common spam indicators
const SPAM_KEYWORDS = [
  'buy now',
  'click here',
  'limited time offer',
  'make money fast',
  'work from home',
  'weight loss',
  'casino',
  'viagra',
  'cialis',
  'porn',
  'xxx',
  'free money',
  'earn cash',
  'lottery',
  'crypto investment',
  'guaranteed profit',
];

// Prohibited content patterns
const PROHIBITED_PATTERNS = [
  /\b(fuck|shit|damn|bitch|asshole)\b/gi,
  /\b(hate\s+speech)\b/gi,
  /\b(kill\s+yourself)\b/gi,
];

// URL pattern for excessive links
const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

/**
 * Detects if content is spam or contains prohibited content
 */
export function detectSpam(title: string, content: string): SpamDetectionResult {
  let spamScore = 0;
  const reasons: string[] = [];

  const combinedText = `${title} ${content}`.toLowerCase();

  // Check for spam keywords
  SPAM_KEYWORDS.forEach((keyword) => {
    if (combinedText.includes(keyword.toLowerCase())) {
      spamScore += 15;
      reasons.push(`Contains spam keyword: "${keyword}"`);
    }
  });

  // Check for prohibited patterns
  PROHIBITED_PATTERNS.forEach((pattern) => {
    const matches = combinedText.match(pattern);
    if (matches) {
      spamScore += 30;
      reasons.push(`Contains prohibited content: "${matches[0]}"`);
    }
  });

  // Check for excessive URLs (more than 3 URLs is suspicious)
  const urlMatches = content.match(URL_PATTERN);
  if (urlMatches && urlMatches.length > 3) {
    spamScore += 20;
    reasons.push(`Excessive URLs detected (${urlMatches.length} links)`);
  }

  // Check for excessive capitalization (more than 50% caps)
  const capsCount = (content.match(/[A-Z]/g) || []).length;
  const letterCount = (content.match(/[a-zA-Z]/g) || []).length;
  if (letterCount > 0 && capsCount / letterCount > 0.5) {
    spamScore += 10;
    reasons.push('Excessive capitalization detected');
  }

  // Check for repeated characters (e.g., "!!!!!!" or "????")
  if (/(.)\1{4,}/.test(content)) {
    spamScore += 5;
    reasons.push('Excessive repeated characters');
  }

  // Check for very short content with URLs (likely spam)
  if (content.length < 50 && urlMatches && urlMatches.length > 0) {
    spamScore += 15;
    reasons.push('Short content with URLs');
  }

  // Check for promotional language patterns
  const promotionalPatterns = [
    /\b(click|buy|order|purchase|subscribe)\s+(now|here|today)\b/gi,
    /\b(limited\s+time|act\s+now|don't\s+miss)\b/gi,
    /\b(100%\s+(free|guaranteed))\b/gi,
  ];

  promotionalPatterns.forEach((pattern) => {
    if (pattern.test(combinedText)) {
      spamScore += 10;
      reasons.push('Contains promotional language');
    }
  });

  // Determine if content is spam (threshold: 50)
  const isSpam = spamScore >= 50;

  return {
    isSpam,
    spamScore,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}

/**
 * Detects if answer content is spam
 */
export function detectAnswerSpam(content: string): SpamDetectionResult {
  // For answers, we use the same detection but with title as empty
  return detectSpam('', content);
}
