/**
 * Manual Test Cases for Spam Detection Bot
 * 
 * These tests demonstrate the spam detection functionality.
 * Run these manually to verify the bot is working correctly.
 */

import { detectSpam, detectAnswerSpam } from './spam-detector';

console.log('=== Spam Detection Bot Test Cases ===\n');

// Test Case 1: Clean content (should NOT be flagged)
console.log('Test 1: Clean Content');
const test1 = detectSpam(
  'How to implement authentication in Next.js?',
  'I am trying to implement user authentication in my Next.js application. What are the best practices?'
);
console.log('Result:', test1);
console.log('Expected: isSpam = false, spamScore < 50');
console.log('---\n');

// Test Case 2: Spam keywords (should be flagged)
console.log('Test 2: Spam Keywords');
const test2 = detectSpam(
  'Make money fast with this amazing offer!',
  'Click here to buy now! Limited time offer! Work from home and earn cash!'
);
console.log('Result:', test2);
console.log('Expected: isSpam = true, spamScore >= 50');
console.log('---\n');

// Test Case 3: Prohibited content (should be flagged)
console.log('Test 3: Prohibited Content');
const test3 = detectSpam(
  'This is a bad question',
  'This is some content with profanity fuck and other prohibited words'
);
console.log('Result:', test3);
console.log('Expected: isSpam = true, spamScore >= 50');
console.log('---\n');

// Test Case 4: Excessive URLs (should be flagged)
console.log('Test 4: Excessive URLs');
const test4 = detectSpam(
  'Check out these links',
  'Visit https://example1.com and https://example2.com and https://example3.com and https://example4.com and https://example5.com'
);
console.log('Result:', test4);
console.log('Expected: isSpam = true or high score (multiple URLs)');
console.log('---\n');

// Test Case 5: Excessive capitalization (should be flagged)
console.log('Test 5: Excessive Capitalization');
const test5 = detectSpam(
  'URGENT QUESTION PLEASE HELP',
  'THIS IS VERY IMPORTANT PLEASE RESPOND IMMEDIATELY I NEED HELP NOW!!!'
);
console.log('Result:', test5);
console.log('Expected: isSpam = false or true (depending on caps percentage), elevated score');
console.log('---\n');

// Test Case 6: Answer spam detection
console.log('Test 6: Answer Spam Detection');
const test6 = detectAnswerSpam(
  'Great question! Click here to buy my course on this topic. Limited time offer!'
);
console.log('Result:', test6);
console.log('Expected: isSpam = true, spamScore >= 50');
console.log('---\n');

// Test Case 7: Short content with URL (should be flagged)
console.log('Test 7: Short Content with URL');
const test7 = detectSpam(
  'Check this',
  'Visit https://spam-site.com'
);
console.log('Result:', test7);
console.log('Expected: isSpam = false or true (short + URL), elevated score');
console.log('---\n');

// Test Case 8: Repeated characters (should add to score)
console.log('Test 8: Repeated Characters');
const test8 = detectSpam(
  'HELP!!!!!',
  'Please help me!!!!! I really need this!!!!!'
);
console.log('Result:', test8);
console.log('Expected: isSpam = false, but score elevated due to repeated chars');
console.log('---\n');

console.log('=== Test Summary ===');
console.log('All tests completed. Review the results above to verify spam detection is working correctly.');
console.log('Tests with isSpam = true should be flagged as spam in the moderator dashboard.');
