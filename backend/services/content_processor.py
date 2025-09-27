import os
import json
import asyncio
from pathlib import Path
from datetime import datetime
import logging
from typing import Optional
import aiofiles
import openai
from dotenv import load_dotenv
import PyPDF2
import io

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class ContentProcessor:
    def __init__(self):
        self.storage_root = Path("../storage")
        self.uploads_dir = self.storage_root / "uploads"
        self.processed_dir = self.storage_root / "processed"
        
        # Initialize OpenAI client
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = openai.OpenAI(api_key=self.api_key) if self.api_key else None
        self.transcribe_model = os.getenv("OPENAI_MODEL_TRANSCRIBE", "whisper-1")
        self.summary_model = os.getenv("OPENAI_MODEL_SUMMARY", "gpt-4o-mini")
        
        # Check if API key is available
        self.use_real_api = bool(self.api_key and self.api_key != "your_openai_api_key_here")
        
        if not self.use_real_api:
            logger.warning("OpenAI API key not configured. Using mock responses.")
    
    async def process_file(self, file_path: Path, original_filename: str):
        """Process uploaded file based on its type"""
        try:
            file_extension = file_path.suffix.lower()
            
            if file_extension == '.pdf':
                return await self._process_pdf(file_path, original_filename)
            elif file_extension in ['.mp4', '.avi', '.mov', '.wmv']:
                return await self._process_video(file_path, original_filename)
            elif file_extension in ['.mp3', '.wav', '.m4a']:
                return await self._process_audio(file_path, original_filename)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
                
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            raise
    
    async def _process_pdf(self, file_path: Path, original_filename: str):
        """Process PDF file - extract text and generate summary"""
        try:
            file_id = file_path.stem
            date_path = datetime.now().strftime("%Y/%m/%d")
            processed_dir = self.processed_dir / "pdf" / date_path
            processed_dir.mkdir(parents=True, exist_ok=True)
            
            # Extract text from PDF
            text_content = await self._extract_pdf_text(file_path)
            
            # Save extracted text
            text_file = processed_dir / f"{file_id}.txt"
            async with aiofiles.open(text_file, 'w', encoding='utf-8') as f:
                await f.write(text_content)
            
            # Generate summary
            summary = await self._generate_summary(text_content, original_filename)
            
            # Save summary
            summary_file = processed_dir / f"{file_id}.summary.md"
            async with aiofiles.open(summary_file, 'w', encoding='utf-8') as f:
                await f.write(summary)
            
            # Save metadata
            metadata = {
                "originalName": original_filename,
                "fileId": file_id,
                "fileType": "pdf",
                "processedDate": datetime.now().isoformat(),
                "textLength": len(text_content),
                "summaryLength": len(summary),
                "status": "completed"
            }
            
            metadata_file = processed_dir / f"{file_id}.metadata.json"
            async with aiofiles.open(metadata_file, 'w') as f:
                await f.write(json.dumps(metadata, indent=2))
            
            logger.info(f"Successfully processed PDF: {original_filename}")
            return {
                "status": "completed",
                "textFile": str(text_file.relative_to(self.storage_root)),
                "summaryFile": str(summary_file.relative_to(self.storage_root)),
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {e}")
            raise
    
    async def _process_video(self, file_path: Path, original_filename: str):
        """Process video file - extract audio, transcribe, and summarize"""
        try:
            file_id = file_path.stem
            date_path = datetime.now().strftime("%Y/%m/%d")
            processed_dir = self.processed_dir / "video" / date_path
            processed_dir.mkdir(parents=True, exist_ok=True)
            
            # Transcribe audio from video
            transcript = await self._transcribe_audio(file_path, "video")
            
            # Save transcript
            transcript_file = processed_dir / f"{file_id}.txt"
            async with aiofiles.open(transcript_file, 'w', encoding='utf-8') as f:
                await f.write(transcript)
            
            # Generate summary
            summary = await self._generate_summary(transcript, original_filename)
            
            # Save summary
            summary_file = processed_dir / f"{file_id}.summary.md"
            async with aiofiles.open(summary_file, 'w', encoding='utf-8') as f:
                await f.write(summary)
            
            # Save metadata
            metadata = {
                "originalName": original_filename,
                "fileId": file_id,
                "fileType": "video",
                "processedDate": datetime.now().isoformat(),
                "transcriptLength": len(transcript),
                "summaryLength": len(summary),
                "status": "completed"
            }
            
            metadata_file = processed_dir / f"{file_id}.metadata.json"
            async with aiofiles.open(metadata_file, 'w') as f:
                await f.write(json.dumps(metadata, indent=2))
            
            logger.info(f"Successfully processed video: {original_filename}")
            return {
                "status": "completed",
                "transcriptFile": str(transcript_file.relative_to(self.storage_root)),
                "summaryFile": str(summary_file.relative_to(self.storage_root)),
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"Error processing video {file_path}: {e}")
            raise
    
    async def _process_audio(self, file_path: Path, original_filename: str):
        """Process audio file - transcribe and summarize"""
        try:
            file_id = file_path.stem
            date_path = datetime.now().strftime("%Y/%m/%d")
            processed_dir = self.processed_dir / "audio" / date_path
            processed_dir.mkdir(parents=True, exist_ok=True)
            
            # Transcribe audio
            transcript = await self._transcribe_audio(file_path, "audio")
            
            # Save transcript
            transcript_file = processed_dir / f"{file_id}.txt"
            async with aiofiles.open(transcript_file, 'w', encoding='utf-8') as f:
                await f.write(transcript)
            
            # Generate summary
            summary = await self._generate_summary(transcript, original_filename)
            
            # Save summary
            summary_file = processed_dir / f"{file_id}.summary.md"
            async with aiofiles.open(summary_file, 'w', encoding='utf-8') as f:
                await f.write(summary)
            
            # Save metadata
            metadata = {
                "originalName": original_filename,
                "fileId": file_id,
                "fileType": "audio",
                "processedDate": datetime.now().isoformat(),
                "transcriptLength": len(transcript),
                "summaryLength": len(summary),
                "status": "completed"
            }
            
            metadata_file = processed_dir / f"{file_id}.metadata.json"
            async with aiofiles.open(metadata_file, 'w') as f:
                await f.write(json.dumps(metadata, indent=2))
            
            logger.info(f"Successfully processed audio: {original_filename}")
            return {
                "status": "completed",
                "transcriptFile": str(transcript_file.relative_to(self.storage_root)),
                "summaryFile": str(summary_file.relative_to(self.storage_root)),
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"Error processing audio {file_path}: {e}")
            raise
    
    async def _extract_pdf_text(self, file_path: Path) -> str:
        """Extract text from PDF file"""
        try:
            text_content = ""
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text_content += page.extract_text() + "\n"
            
            if not text_content.strip():
                text_content = f"Could not extract text from PDF: {file_path.name}"
            
            return text_content.strip()
            
        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
            return f"Error extracting text from PDF: {str(e)}"
    
    async def _transcribe_audio(self, file_path: Path, file_type: str) -> str:
        """Transcribe audio using OpenAI Whisper API"""
        try:
            if not self.use_real_api:
                # Return mock transcript
                return f"""This is a mock transcript for {file_path.name}.

The {file_type} file has been processed successfully. In a real implementation, this would contain the actual transcription of the audio content using OpenAI's Whisper API.

Key points that would typically be covered:
- Introduction to the topic
- Main concepts and definitions
- Detailed explanations with examples
- Important conclusions and takeaways
- Questions and answers if applicable

To enable real transcription, please set your OpenAI API key in the .env file."""

            # Real API implementation
            with open(file_path, "rb") as audio_file:
                response = await asyncio.to_thread(
                    self.client.audio.transcriptions.create,
                    model=self.transcribe_model,
                    file=audio_file,
                    response_format="text"
                )
                return response
                
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            return f"Error transcribing audio: {str(e)}"
    
    async def _generate_summary(self, content: str, filename: str) -> str:
        """Generate summary using OpenAI GPT API"""
        try:
            if not self.use_real_api:
                # Return mock summary
                return f"""# Summary of {filename}

## Overview
This is a mock summary generated for demonstration purposes. In a real implementation, this would be created using OpenAI's GPT API to provide intelligent summarization.

## Key Points
- **Main Topic**: The content covers important educational material
- **Learning Objectives**: Students will understand core concepts
- **Important Concepts**: Key definitions and principles are explained
- **Practical Applications**: Real-world examples and use cases
- **Assessment Areas**: Topics likely to appear in quizzes and tests

## Detailed Summary
The document provides comprehensive coverage of the subject matter with clear explanations and examples. The content is structured to facilitate learning and understanding.

## Recommendations
- Review the main concepts highlighted above
- Focus on practical applications mentioned
- Use this summary as a study guide for assessments

*Note: To enable real AI-powered summarization, please configure your OpenAI API key in the .env file.*"""

            # Real API implementation
            prompt = f"""Please provide a comprehensive summary of the following educational content from "{filename}":

{content[:4000]}  # Limit content to avoid token limits

Please structure your summary with:
1. Main topic and overview
2. Key concepts and definitions
3. Important points and takeaways
4. Learning objectives
5. Areas of focus for assessment

Format the response in Markdown."""

            response = self.client.chat.completions.create(
                model=self.summary_model,
                messages=[
                    {"role": "system", "content": "You are an expert educational content summarizer. Create clear, structured summaries that help students understand and learn from the material."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return f"Error generating summary: {str(e)}"