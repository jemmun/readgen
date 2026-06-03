import abc
import json
import os
from typing import AsyncGenerator, Dict, List, Optional


class AIProvider(abc.ABC):
    @abc.abstractmethod
    async def generate(self, prompt: str, context: Optional[Dict] = None, config: Optional[Dict] = None) -> str:
        pass

    @abc.abstractmethod
    async def generate_stream(self, prompt: str, context: Optional[Dict] = None, config: Optional[Dict] = None) -> AsyncGenerator[str, None]:
        pass

    async def generate_image(self, prompt: str, style: str = "realistic", size: str = "1024x1024") -> bytes:
        """Generate an image from a text prompt. Returns PNG image bytes."""
        raise NotImplementedError(f"{self.__class__.__name__} does not support image generation")


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "gpt-4", base_url: Optional[str] = None):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url or "https://api.openai.com/v1"

    async def generate(self, prompt: str, context: Optional[Dict] = None, config: Optional[Dict] = None) -> str:
        try:
            import openai
        except ImportError:
            raise RuntimeError("OpenAI package not installed. Run: pip install openai")
        
        client = openai.AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        messages = self._build_messages(prompt, context)
        
        response = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=config.get("temperature", 0.8) if config else 0.8,
            max_tokens=config.get("max_tokens", 4000) if config else 4000,
        )
        return response.choices[0].message.content or ""

    async def generate_stream(self, prompt: str, context: Optional[Dict] = None, config: Optional[Dict] = None) -> AsyncGenerator[str, None]:
        try:
            import openai
        except ImportError:
            raise RuntimeError("OpenAI package not installed. Run: pip install openai")
        
        client = openai.AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        messages = self._build_messages(prompt, context)
        
        stream = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=config.get("temperature", 0.8) if config else 0.8,
            max_tokens=config.get("max_tokens", 4000) if config else 4000,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _build_messages(self, prompt: str, context: Optional[Dict]) -> List[Dict[str, str]]:
        messages = []
        if context and context.get("system_message"):
            messages.append({"role": "system", "content": context["system_message"]})
        messages.append({"role": "user", "content": prompt})
        return messages

    async def generate_image(self, prompt: str, style: str = "realistic", size: str = "1024x1024") -> bytes:
        try:
            import openai
        except ImportError:
            raise RuntimeError("OpenAI package not installed. Run: pip install openai")

        style_map = {
            "realistic": "vivid",
            "anime": "natural",
            "watercolor": "natural",
            "oilPainting": "vivid",
            "pixelArt": "natural",
        }
        dalle_style = style_map.get(style, "vivid")

        # Map size to DALL-E 3 supported sizes
        size_map = {
            "1024x1024": "1024x1024",
            "1024x1792": "1024x1792",
            "1792x1024": "1792x1024",
        }
        dalle_size = size_map.get(size, "1024x1024")

        enhanced_prompt = f"{prompt}, {style} style" if style != "realistic" else prompt

        client = openai.AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        response = await client.images.generate(
            model="dall-e-3",
            prompt=enhanced_prompt,
            size=dalle_size,
            quality="standard",
            n=1,
            style=dalle_style,
        )
        image_url = response.data[0].url

        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as resp:
                return await resp.read()


class ClaudeProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "claude-3-opus-20240229"):
        self.api_key = api_key
        self.model = model

    async def generate(self, prompt: str, context: Optional[Dict] = None, config: Optional[Dict] = None) -> str:
        try:
            import anthropic
        except ImportError:
            raise RuntimeError("Anthropic package not installed. Run: pip install anthropic")
        
        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        system = context.get("system_message", "") if context else ""
        
        response = await client.messages.create(
            model=self.model,
            max_tokens=config.get("max_tokens", 4000) if config else 4000,
            temperature=config.get("temperature", 0.8) if config else 0.8,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text if response.content else ""

    async def generate_stream(self, prompt: str, context: Optional[Dict] = None, config: Optional[Dict] = None) -> AsyncGenerator[str, None]:
        try:
            import anthropic
        except ImportError:
            raise RuntimeError("Anthropic package not installed. Run: pip install anthropic")
        
        client = anthropic.AsyncAnthropic(api_key=self.api_key)
        system = context.get("system_message", "") if context else ""
        
        async with client.messages.stream(
            model=self.model,
            max_tokens=config.get("max_tokens", 4000) if config else 4000,
            temperature=config.get("temperature", 0.8) if config else 0.8,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text


class DashscopeProvider(OpenAIProvider):
    """Alibaba Cloud Model Studio (DashScope) - OpenAI compatible API"""
    def __init__(self, api_key: str, model: str = "qwen-turbo", image_model: str = "qwen-image-plus"):
        super().__init__(
            api_key=api_key,
            model=model,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        self.image_model = image_model

    async def generate_image(self, prompt: str, style: str = "realistic", size: str = "1024x1024") -> bytes:
        """Generate image using DashScope Qwen-Image / Wanx API.

        Uses the synchronous multimodal-generation API for Qwen-Image models,
        and the async text2image/image-synthesis API for Wanx models.
        The model name is configurable via AI_IMAGE_MODEL env variable.

        API reference: https://help.aliyun.com/zh/model-studio/qwen-image-api
        """
        import aiohttp
        import asyncio

        # Build style-enhanced prompt
        style_desc = {
            "realistic": "photorealistic, highly detailed, professional photography",
            "anime": "anime style, Japanese animation art",
            "watercolor": "watercolor painting style, soft colors, artistic",
            "oilPainting": "oil painting style, rich textures, brush strokes",
            "pixelArt": "pixel art style, retro 8-bit aesthetics",
        }
        style_suffix = style_desc.get(style, "")
        enhanced_prompt = f"{prompt}, {style_suffix}" if style_suffix else prompt

        # Map frontend size to model-specific supported sizes
        # qwen-image-plus supported sizes: 1664*928, 1472*1104, 1328*1328, 1104*1472, 928*1664
        # qwen-image-2.0-pro supported sizes: total pixels 512*512~2048*2048
        # wanx-v1 supported sizes: 1024*1024, 720*1280, 768*1152, 1280*720
        size_map = {
            "1024x1024": self._map_size_1to1(),
            "1024x1792": self._map_size_portrait(),
            "1792x1024": self._map_size_landscape(),
        }
        image_size = size_map.get(size, self._map_size_1to1())

        async with aiohttp.ClientSession() as session:
            # Try synchronous multimodal-generation API first (Qwen-Image models)
            try:
                return await self._generate_image_sync(session, enhanced_prompt, image_size)
            except _DashScopeModelDenied:
                pass  # Fall through to async API

            # Fallback: async text2image/image-synthesis API (Wanx models)
            return await self._generate_image_async(session, prompt, style, image_size)

    def _map_size_1to1(self) -> str:
        """Map 1:1 ratio based on image model."""
        m = self.image_model.lower()
        if "qwen-image" in m:
            return "1328*1328"
        if "wan2.6" in m or "wan2.5" in m:
            return "1280*1280"
        return "1024*1024"

    def _map_size_portrait(self) -> str:
        m = self.image_model.lower()
        if "qwen-image" in m:
            return "1104*1472"
        if "wan2.6" in m or "wan2.5" in m:
            return "960*1696"
        return "768*1152"

    def _map_size_landscape(self) -> str:
        m = self.image_model.lower()
        if "qwen-image" in m:
            return "1472*1104"
        if "wan2.6" in m or "wan2.5" in m:
            return "1696*960"
        return "1280*720"

    async def _generate_image_sync(
        self, session, prompt: str, size: str
    ) -> bytes:
        """Synchronous multimodal-generation API (Qwen-Image / wan2.6 models).

        POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
        Returns image in a single request.
        """
        url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.image_model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}],
                    }
                ]
            },
            "parameters": {
                "size": size,
                "n": 1,
                "prompt_extend": True,
                "watermark": False,
            },
        }

        async with session.post(url, headers=headers, json=payload) as resp:
            data = await resp.json()
            if data.get("code"):
                error_code = str(data.get("code", ""))
                error_msg = data.get("message", "")
                if "AccessDenied" in error_code or "access denied" in error_msg.lower():
                    raise _DashScopeModelDenied(f"{self.image_model}: {error_msg}")
                raise RuntimeError(f"DashScope image generation failed: {error_msg}")
            try:
                image_url = data["output"]["choices"][0]["message"]["content"][0]["image"]
            except (KeyError, IndexError):
                raise RuntimeError(f"DashScope unexpected response: {json.dumps(data)[:300]}")

        async with session.get(image_url) as img_resp:
            return await img_resp.read()

    async def _generate_image_async(
        self, session, prompt: str, style: str, size: str
    ) -> bytes:
        """Async text2image/image-synthesis API (Wanx V1 models).

        API reference: https://help.aliyun.com/zh/model-studio/text-to-image-api-reference
        Supports native style parameter: <auto>, <photography>, <anime>, <watercolor>, <oil painting>, etc.
        """
        import asyncio

        # Map frontend style to DashScope V1 native style parameter
        v1_style_map = {
            "realistic": "<photography>",
            "anime": "<anime>",
            "watercolor": "<watercolor>",
            "oilPainting": "<oil painting>",
            "pixelArt": "<auto>",
        }
        dashscope_style = v1_style_map.get(style, "<auto>")

        url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable",
        }
        payload = {
            "model": self.image_model,
            "input": {
                "prompt": prompt,
            },
            "parameters": {
                "style": dashscope_style,
                "size": size,
                "n": 1,
            },
        }

        # Submit task
        async with session.post(url, headers=headers, json=payload) as resp:
            data = await resp.json()
            if data.get("code", ""):
                error_msg = data.get("message", "Unknown error")
                raise RuntimeError(
                    f"DashScope image generation failed. "
                    f"Please enable model '{self.image_model}' in the Bailian console "
                    f"(https://bailian.console.aliyun.com). Error: {error_msg}"
                )
            task_id = data["output"]["task_id"]

        # Poll for completion (max 120 seconds)
        poll_url = f"https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}"
        poll_headers = {"Authorization": f"Bearer {self.api_key}"}
        for _ in range(120):
            await asyncio.sleep(1)
            async with session.get(poll_url, headers=poll_headers) as poll_resp:
                poll_data = await poll_resp.json()
                status = poll_data.get("output", {}).get("task_status", "UNKNOWN")
                if status == "SUCCEEDED":
                    # Try V2 results format first, then V1
                    results = poll_data["output"].get("results", [])
                    if results:
                        image_url = results[0]["url"]
                    else:
                        choices = poll_data["output"].get("choices", [])
                        if choices:
                            image_url = choices[0]["message"]["content"][0]["image"]
                        else:
                            raise RuntimeError(f"DashScope no image in response: {json.dumps(poll_data)[:300]}")
                    break
                elif status == "FAILED":
                    msg = poll_data["output"].get("message", "Unknown error")
                    raise RuntimeError(f"DashScope image generation failed: {msg}")
        else:
            raise RuntimeError("DashScope image generation timed out")

        # Download the image
        async with session.get(image_url) as img_resp:
            return await img_resp.read()


class _DashScopeModelDenied(Exception):
    """Raised when a DashScope model is not accessible (access denied)."""
    pass


class OllamaProvider(AIProvider):
    def __init__(self, model: str = "llama2", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def generate(self, prompt: str, context: Optional[Dict] = None, config: Optional[Dict] = None) -> str:
        import aiohttp
        
        system = context.get("system_message", "") if context else ""
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": config.get("temperature", 0.8) if config else 0.8,
                    }
                }
            ) as response:
                data = await response.json()
                return data.get("response", "")

    async def generate_stream(self, prompt: str, context: Optional[Dict] = None, config: Optional[Dict] = None) -> AsyncGenerator[str, None]:
        import aiohttp
        
        system = context.get("system_message", "") if context else ""
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": True,
                    "options": {
                        "temperature": config.get("temperature", 0.8) if config else 0.8,
                    }
                }
            ) as response:
                async for line in response.content:
                    if line:
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                        except json.JSONDecodeError:
                            pass


def get_ai_provider(provider_name: Optional[str] = None, api_key: Optional[str] = None, model: Optional[str] = None, base_url: Optional[str] = None, image_model: Optional[str] = None) -> AIProvider:
    from .config import get_settings
    settings = get_settings()
    
    provider = provider_name or settings.AI_PROVIDER
    key = api_key or settings.AI_API_KEY
    mdl = model or settings.AI_MODEL
    url = base_url or settings.AI_BASE_URL
    img_mdl = image_model or settings.AI_IMAGE_MODEL
    
    if provider == "openai":
        if not key:
            raise ValueError("OpenAI API key not configured")
        return OpenAIProvider(api_key=key, model=mdl, base_url=url)
    elif provider == "claude":
        if not key:
            raise ValueError("Claude API key not configured")
        return ClaudeProvider(api_key=key, model=mdl)
    elif provider == "dashscope":
        if not key:
            raise ValueError("DashScope API key not configured")
        return DashscopeProvider(api_key=key, model=mdl, image_model=img_mdl)
    elif provider == "ollama":
        return OllamaProvider(model=mdl, base_url=url or "http://localhost:11434")
    else:
        raise ValueError(f"Unknown AI provider: {provider}")
