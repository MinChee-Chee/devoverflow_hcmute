# Spam Detection Bot

This document describes the automated spam detection system implemented in the DevOverflow application.

## Overview

The spam detection bot automatically scans questions and answers for spam or prohibited content. It assigns a spam score based on various indicators and flags content that exceeds the spam threshold.

## Features

- **Automatic Detection**: All new questions and answers are automatically scanned when created
- **Edit Detection**: Content is re-scanned when edited to detect spam added via edits
- **Content Hiding**: Spam content is automatically hidden from homepage and public views
- **Spam Scoring**: Content is assigned a numerical spam score (0-100+)
- **Flagging System**: Content with a score ≥ 50 is flagged as spam
- **Moderator Dashboard**: Dedicated interface for reviewing flagged content
- **API Endpoint**: Real-time spam detection API for frontend validation

## Detection Criteria

The bot checks for the following spam indicators:

### 1. Spam Keywords (+15 points each)
- buy now, click here, limited time offer
- make money fast, work from home
- weight loss, casino, viagra, cialis
- porn, xxx, free money, earn cash
- lottery, crypto investment, guaranteed profit

### 2. Prohibited Content (+30 points each)
- Profanity and offensive language
- Hate speech
- Harmful content

### 3. Excessive URLs (+20 points)
- More than 3 URLs in content

### 4. Excessive Capitalization (+10 points)
- More than 50% of text in capital letters

### 5. Repeated Characters (+5 points)
- Patterns like "!!!!!" or "????"

### 6. Short Content with URLs (+15 points)
- Content less than 50 characters with URLs

### 7. Promotional Language (+10 points)
- "click/buy/order now", "limited time"
- "100% free/guaranteed"

## Database Schema

### Question Model
```typescript
{
  // ... existing fields
  isSpam: boolean;        // Whether content is flagged as spam
  spamScore: number;      // Numerical spam score
  spamReason?: string;    // Detailed reason for flagging
}
```

### Answer Model
```typescript
{
  // ... existing fields
  isSpam: boolean;        // Whether content is flagged as spam
  spamScore: number;      // Numerical spam score
  spamReason?: string;    // Detailed reason for flagging
}
```

## API Usage

### Spam Detection Endpoint

**POST** `/api/spam-detection`

Request body:
```json
{
  "title": "Question title",
  "content": "Question or answer content",
  "type": "question" | "answer"
}
```

Response:
```json
{
  "isSpam": true,
  "spamScore": 75,
  "reason": "Contains spam keyword: 'buy now'; Excessive URLs detected (4 links)"
}
```

## Moderator Interface

Moderators can access the spam detection dashboard at:
`/dashboard/moderator/spam`

Features:
- View all flagged questions and answers
- Filter by spam score or date
- Search flagged content
- Delete spam content
- See detailed spam reasons

## Implementation Files

- `lib/spam-detector.ts` - Core spam detection logic
- `app/api/spam-detection/route.ts` - API endpoint
- `lib/actions/question.action.ts` - Question integration (creation, editing, filtering)
- `lib/actions/answer.action.ts` - Answer integration (creation, filtering)
- `app/(dashboard)/dashboard/moderator/spam/page.tsx` - Moderator UI
- `components/cards/SpamQuestionCard.tsx` - Spam question card
- `components/cards/SpamAnswerCard.tsx` - Spam answer card
- `database/question.model.ts` - Question schema
- `database/answer.model.ts` - Answer schema

## How It Works

### On Content Creation
When a user creates a question or answer, the spam detection runs automatically:
1. Content is analyzed by `detectSpam()` or `detectAnswerSpam()`
2. A spam score is calculated based on various indicators
3. If score ≥ 50, content is flagged (`isSpam: true`)
4. Content is saved with spam metadata

### On Content Edit
When a user edits a question, spam detection runs again:
1. Edited content is re-analyzed by `detectSpam()`
2. Spam score and flag are updated
3. Previously clean content can become flagged if edited to contain spam

### Content Visibility
Spam content is automatically hidden from public views:
- `getQuestions()` - Homepage questions list (excludes `isSpam: true`)
- `getAnswers()` - Answers on question pages (excludes `isSpam: true`)
- `getHotQuestions()` - Hot questions sidebar (excludes `isSpam: true`)
- `getRecommendedQuestions()` - Recommended questions (excludes `isSpam: true`)

Spam content is only visible to moderators in the spam detection dashboard.

## Testing

Run the test suite:
```bash
node lib/spam-detector.test.mjs
```

## Future Enhancements

Potential improvements to the spam detection system:

1. **Machine Learning Integration**: Use ML models for more accurate detection
2. **User Reputation**: Consider user reputation in scoring
3. **Whitelist/Blacklist**: Maintain lists of trusted/blocked users
4. **Pattern Learning**: Learn from moderator actions
5. **Rate Limiting**: Detect and block rapid posting
6. **Language Detection**: Detect non-English spam
7. **Image Analysis**: Scan attached images for spam
8. **Reporting System**: Allow users to report spam

## Configuration

The spam threshold is currently set to **50 points**. Content with a score of 50 or higher is automatically flagged as spam.

To adjust the threshold, modify the condition in `lib/spam-detector.ts`:

```typescript
const isSpam = spamScore >= 50; // Change this value
```

## Best Practices

For moderators:
1. Review flagged content regularly
2. Delete confirmed spam immediately
3. Consider user patterns for repeat offenders
4. Update spam keywords based on new trends
5. Provide feedback to improve detection

For developers:
1. Keep spam keywords updated
2. Monitor false positive rates
3. Add new detection patterns as needed
4. Test thoroughly before deploying changes
5. Consider performance impact of detection
