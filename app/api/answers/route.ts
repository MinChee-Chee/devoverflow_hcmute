import { NextResponse } from "next/server";
import { getAnswers } from "@/lib/actions/answer.action";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    // Fetch all answers (no pagination for summary)
    const result = await getAnswers({
      questionId,
      sortBy: "highestUpvotes", // Get best answers first
      page: 1,
      pageSize: 100, // Get all answers
    });

    if (!result || !result.answers) {
      return NextResponse.json(
        { error: "Failed to fetch answers", answers: [] },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { answers: result.answers },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: any) {
    console.error("Error fetching answers:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch answers",
        answers: []
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

