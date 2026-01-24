"""
Ollama service layer for model interactions.
Handles all communication with Ollama API.
"""
import subprocess
from typing import List, Dict, Any, Optional, Generator
import ollama
from logger import get_logger

logger = get_logger('ollama_service')


class OllamaService:
    """Service for interacting with Ollama models."""
    
    @staticmethod
    def _extract_assistant_text(resp: Any) -> str:
        """
        Robust extraction for different ollama response shapes.
        
        Args:
            resp: Ollama response object
        
        Returns:
            Extracted text content
        """
        try:
            if hasattr(resp, 'response') and resp.response:
                return resp.response
        except Exception:
            pass
        
        try:
            if hasattr(resp, 'message'):
                msg = resp.message
                if isinstance(msg, dict):
                    return msg.get('content') or msg.get('text') or str(msg)
                return getattr(msg, 'content', str(msg))
        except Exception:
            pass
        
        try:
            data = resp.model_dump() if hasattr(resp, 'model_dump') else \
                   (resp.dict() if hasattr(resp, 'dict') else None)
            if isinstance(data, dict):
                if data.get('response'):
                    return data['response']
                m = data.get('message')
                if isinstance(m, dict):
                    return m.get('content') or m.get('text') or str(m)
                return str(m)
        except Exception:
            pass
        
        try:
            return str(resp)
        except Exception:
            return ''
    
    @staticmethod
    def list_models() -> List[str]:
        """
        List all available Ollama models.
        
        Returns:
            List of model names
        """
        try:
            result = subprocess.run(
                ['ollama', 'list'],
                capture_output=True,
                text=True,
                check=False,
                timeout=10
            )
            
            if result.returncode != 0:
                logger.warning(f"Ollama list command failed: {result.stderr}")
                return []
            
            models = []
            for line in result.stdout.strip().splitlines():
                parts = line.split()
                if parts and parts[0] != 'NAME':
                    models.append(parts[0])
            
            logger.info(f"Found {len(models)} models")
            return models
            
        except FileNotFoundError:
            logger.error("Ollama CLI not found. Please install Ollama.")
            return []
        except subprocess.TimeoutExpired:
            logger.error("Ollama list command timed out")
            return []
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []
    
    @staticmethod
    def chat(
        model: str,
        messages: List[Dict[str, str]],
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Send chat request to Ollama model.
        
        Args:
            model: Model name
            messages: List of message dicts with 'role' and 'content'
            stream: Whether to stream the response
        
        Returns:
            Response dict with 'content' and optional 'metrics'
        """
        try:
            logger.debug(f"Chat request to {model} (stream={stream})")
            
            response = ollama.chat(model=model, messages=messages, stream=stream)
            content = OllamaService._extract_assistant_text(response)
            
            result = {'content': content}
            
            # Extract metrics if available
            if hasattr(response, 'model_dump'):
                data = response.model_dump()
                if 'eval_count' in data and 'eval_duration' in data:
                    eval_count = data.get('eval_count', 0)
                    eval_duration = data.get('eval_duration', 1)
                    tokens_per_sec = (eval_count / eval_duration) * 1e9 if eval_duration > 0 else 0
                    
                    result['metrics'] = {
                        'tokens': eval_count,
                        'duration_s': eval_duration / 1e9,
                        'tokens_per_sec': round(tokens_per_sec, 2)
                    }
            
            return result
            
        except Exception as e:
            logger.error(f"Chat error with {model}: {e}")
            raise
    
    @staticmethod
    def chat_stream(
        model: str,
        messages: List[Dict[str, str]]
    ) -> Generator[str, None, None]:
        """
        Stream chat responses from Ollama model.
        
        Args:
            model: Model name
            messages: List of message dicts
        
        Yields:
            Chunks of response text
        """
        try:
            logger.debug(f"Stream chat request to {model}")
            
            stream = ollama.chat(model=model, messages=messages, stream=True)
            
            for chunk in stream:
                text = OllamaService._extract_assistant_text(chunk)
                if text:
                    yield text
                    
        except Exception as e:
            logger.error(f"Stream error with {model}: {e}")
            raise
    
    @staticmethod
    def pull_model(model_name: str) -> bool:
        """
        Pull (download) a model from Ollama registry.
        
        Args:
            model_name: Name of the model to pull
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Pulling model: {model_name}")
            
            result = subprocess.run(
                ['ollama', 'pull', model_name],
                capture_output=True,
                text=True,
                check=True,
                timeout=3600  # 1 hour timeout for large models
            )
            
            logger.info(f"Successfully pulled {model_name}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to pull {model_name}: {e.stderr}")
            return False
        except subprocess.TimeoutExpired:
            logger.error(f"Pull timeout for {model_name}")
            return False
        except Exception as e:
            logger.error(f"Error pulling {model_name}: {e}")
            return False
    
    @staticmethod
    def delete_model(model_name: str) -> bool:
        """
        Delete a model from local storage.
        
        Args:
            model_name: Name of the model to delete
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Deleting model: {model_name}")
            
            result = subprocess.run(
                ['ollama', 'rm', model_name],
                capture_output=True,
                text=True,
                check=True,
                timeout=30
            )
            
            logger.info(f"Successfully deleted {model_name}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to delete {model_name}: {e.stderr}")
            return False
        except Exception as e:
            logger.error(f"Error deleting {model_name}: {e}")
            return False
