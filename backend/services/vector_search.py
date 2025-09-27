import json
import os
from pathlib import Path
from typing import List, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class VectorSearchService:
    def __init__(self):
        self.storage_root = Path("../storage")
        self.vector_dir = self.storage_root / "vector-search"
        self.processed_dir = self.storage_root / "processed"
        
    def add_content(self, content_path: str, content: str, title: str):
        """Add content to vector search index"""
        try:
            # For now, create a simple file-based index
            # In a real implementation, you would use a vector database like ChromaDB
            
            # Create content entry
            content_entry = {
                "path": content_path,
                "title": title,
                "content": content,
                "chunks": self._chunk_content(content),
                "timestamp": str(datetime.now())
            }
            
            # Save to file
            content_id = content_path.replace('/', '_').replace('\\', '_')
            vector_file = self.vector_dir / f"{content_id}.json"
            
            with open(vector_file, 'w', encoding='utf-8') as f:
                json.dump(content_entry, f, indent=2)
            
            logger.info(f"Added content to vector index: {title}")
            
        except Exception as e:
            logger.error(f"Error adding content to vector index: {e}")
    
    def search_content(self, query: str, limit: int = 5) -> List[Dict]:
        """Search content using vector similarity"""
        try:
            results = []
            
            # Simple text-based search for now
            # In a real implementation, you would use vector embeddings
            
            for vector_file in self.vector_dir.glob("*.json"):
                try:
                    with open(vector_file, 'r', encoding='utf-8') as f:
                        content_entry = json.load(f)
                    
                    # Simple keyword matching
                    if query.lower() in content_entry['content'].lower():
                        results.append({
                            "title": content_entry['title'],
                            "excerpt": content_entry['content'][:200] + "...",
                            "score": 0.8
                        })
                        
                except Exception as e:
                    logger.error(f"Error reading vector file {vector_file}: {e}")
                    continue
            
            return results[:limit]
            
        except Exception as e:
            logger.error(f"Error searching content: {e}")
            return []
    
    def delete_content(self, content_path: str):
        """Delete content from vector index"""
        try:
            content_id = content_path.replace('/', '_').replace('\\', '_')
            vector_file = self.vector_dir / f"{content_id}.json"
            
            if vector_file.exists():
                vector_file.unlink()
                logger.info(f"Deleted content from vector index: {content_path}")
                
        except Exception as e:
            logger.error(f"Error deleting content from vector index: {e}")
    
    def _chunk_content(self, content: str, chunk_size: int = 500) -> List[str]:
        """Split content into chunks for vector search"""
        words = content.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append(chunk)
        
        return chunks
