/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react'
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form'
import { useForm } from 'react-hook-form'
import { AnswerSchema } from '@/lib/validiations'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Editor } from '@tinymce/tinymce-react'
import { useTheme } from '@/context/ThemeProvider'
import { Button } from '../ui/button'
import Image from 'next/image'
import { createAnswer } from '@/lib/actions/answer.action'
import { usePathname } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface Props {
    question: string;
    questionTitle: string;
    questionId: string;
    authorId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Answer = ({question, questionTitle, questionId, authorId}: Props) => {
    const pathname = usePathname()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmittingAI, setIsSubmittingAI] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [summary, setSummary] = useState<string>('')
    const {mode} = useTheme()
    const editorRef = React.useRef(null)
    const form = useForm<z.infer<typeof AnswerSchema>>({
        resolver: zodResolver(AnswerSchema),
        defaultValues: {
            answer: ''
        }
    })
    const handleCreateAnswer = async (values: z.infer<typeof AnswerSchema>) => {
        if (!authorId) {
        return toast({
          title: "Please log in",
          description: "You must be logged in to submit an answer",
          variant: "destructive",
        });
      }
      
      setIsSubmitting(true);
  
      try {
        await createAnswer({
          content: values.answer,
          author: JSON.parse(authorId),
          question: JSON.parse(questionId),
          path: pathname,
        });
  
        form.reset();
  
        if(editorRef.current) {
          
          const editor = editorRef.current as any;
  
          editor.setContent('');
        }

        return toast({
          title: 'Answer Submitted',
          description: 'Your answer has been submitted successfully',
        });
      } catch (error) {
        console.log(error);
      } finally {
        setIsSubmitting(false)
      }
    }
  
    const generateSummary = async () => {
      if (!authorId) {
        return toast({
          title: 'Please log in',
          description: 'You must be logged in to perform this action '
        })
      }
    
      // Check if question is available
      if (!question || !questionTitle) {
        return toast({
          title: 'Error',
          description: 'Question data is missing',
          variant: 'destructive'
        });
      }
    
      setIsSubmittingAI(true);
      setIsDialogOpen(true);
    
      try {
        // Parse questionId from JSON string if needed
        const parsedQuestionId = typeof questionId === 'string' && questionId.startsWith('"') 
          ? JSON.parse(questionId) 
          : questionId;
        
        // Fetch all answers for this question
        const answersResponse = await fetch(`/api/answers?questionId=${parsedQuestionId}`);
        
        // Check if response is OK
        if (!answersResponse.ok) {
          const errorText = await answersResponse.text();
          throw new Error(`Failed to fetch answers: ${answersResponse.status} - ${errorText}`);
        }
        
        // Check if response is JSON
        const contentType = answersResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await answersResponse.text();
          throw new Error(`Expected JSON but got: ${contentType}. Response: ${text.substring(0, 200)}`);
        }
        
        const answersData = await answersResponse.json();
        const answers = answersData.answers || [];
    
        // Call Google Gemini API for summary
        const response = await fetch('/api/google-gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            questionTitle,
            questionContent: question,
            answers: answers.map((ans: any) => ({
              content: ans.content,
              author: ans.author
            }))
          }),
        });
        
        // Check if response is OK
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to generate summary: ${response.status} - ${errorText}`);
        }
        
        // Check if response is JSON
        const responseContentType = response.headers.get('content-type');
        if (!responseContentType || !responseContentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`Expected JSON but got: ${responseContentType}. Response: ${text.substring(0, 200)}`);
        }
    
        const summaryData = await response.json();
    
        if (summaryData.summary) {
          setSummary(summaryData.summary);
        } else if (summaryData.error) {
          const errorMsg = typeof summaryData.error === 'string' 
            ? summaryData.error 
            : summaryData.error.message || JSON.stringify(summaryData.error);
          setSummary(`Error: ${errorMsg}`);
          toast({
            title: 'Error',
            description: errorMsg,
            variant: 'destructive'
          });
        } else {
          console.error('Unexpected response format:', summaryData);
          setSummary('No summary available. Please check the console for details.');
          toast({
            title: 'Error',
            description: 'Unexpected response from API',
            variant: 'destructive'
          });
        }
      } catch (error: any) {
        console.error('Error generating summary:', error);
        const errorMessage = error.message || 'Failed to generate summary';
        setSummary(`Error: ${errorMessage}`);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      } finally {
        setIsSubmittingAI(false);
      }
    };
    
  
    return (
    <div>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
            <h4 className="paragraph-semibold text-dark400_light800">Write your answer for this question.</h4>
        
            <Button 
              className="btn light-border-2 gap-1.5 rounded-md px-4 py-2.5 text-primary-500 shadow-none dark:text-primary-500"
              onClick={generateSummary}
              disabled={isSubmittingAI}
            >
              {isSubmittingAI ? (
                <>
                  Summarizing...
                </>
              ) : (
                <>
                  <Image 
                    src="/assets/icons/stars.svg"
                    alt="star"
                    width={12}
                    height={12}
                    className="object-contain"
                  />
                  Summarize
                </>
              )}
            </Button>
        </div>
    <Form {...form}>
        <form
        className="mt-6 flex w-full flex-col gap-10"
        onSubmit={form.handleSubmit(handleCreateAnswer)}>
            <FormField
          control={form.control}
          name="answer"
          render={({ field }) => (
            <FormItem className="flex w-full flex-col gap-3">
              <FormControl className="mt-3.5">
              <Editor
                apiKey={process.env.NEXT_PUBLIC_TINY_EDITOR_API_KEY}
                onInit={(_evt, editor) => {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  editorRef.current = editor
                }}
                onBlur={field.onBlur}
                onEditorChange={(content) => field.onChange(content)}

                init={{
                    height: 350,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
                    'searchreplace', 'visualblocks', 'codesample', 'fullscreen',
                    'insertdatetime', 'media', 'table'
                  ],
                  toolbar: 
                  'undo redo | ' + 'blocks |' +
                  'codesample | bold italic forecolor | alignleft aligncenter |' +
                  'alignright alignjustify | bullist numlist',
                  content_style: 'body { font-family:Inter; font-size:16px }',
                  skin: mode ==='dark' ? 'oxide-dark' : 'oxide',
                  content_css: mode === 'dark' ? 'dark': 'light',
                  }}
                />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <div className='flex justify-end'>
          <Button
          type='submit'
          className="primary-gradient w-fit text-white"
          disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
        </form>
    </Form>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Question Summary</DialogTitle>
          <DialogDescription>
            AI-generated summary of the question and its answers
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isSubmittingAI ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-dark400_light700">Generating summary...</p>
            </div>
          ) : (
            <div className="text-dark300_light700 whitespace-pre-wrap">
              {summary || 'No summary available'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </div>
  )
}

export default Answer