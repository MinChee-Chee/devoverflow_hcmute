import { NextResponse } from 'next/server';
import { detectSpam, detectAnswerSpam } from '@/lib/spam-detector';

export async function POST(request: Request) {
  try {
    const { title, content, type } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    let result;
    if (type === 'answer') {
      result = detectAnswerSpam(content);
    } else {
      // For questions, title is required
      if (!title) {
        return NextResponse.json(
          { error: 'Title is required for question type' },
          { status: 400 }
        );
      }
      result = detectSpam(title, content);
    }

    return NextResponse.json({
      isSpam: result.isSpam,
      spamScore: result.spamScore,
      reason: result.reason,
    });
  } catch (error) {
    console.error('Spam detection error:', error);
    return NextResponse.json(
      { error: 'Failed to detect spam' },
      { status: 500 }
    );
  }
}
