"""Model router: picks a provider for each request and falls back when one fails.

Fallback only happens if the chosen provider fails *before* producing any output (text
or a tool call). Once text has streamed to the user, switching models mid-answer would
produce a garbled reply; once a tool has run, retrying elsewhere would run it twice. So a
later failure is reported as an error instead.
"""

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass

from .config import Settings
from .providers.anthropic_provider import AnthropicProvider
from .providers.base import ChatTurn, Done, Provider, TextDelta, ToolCall, ToolResult
from .providers.openai_compatible import OpenAICompatibleProvider

log = logging.getLogger("friday.router")


@dataclass
class Attempt:
    provider: str
    model: str


class NoProviderAvailable(Exception):
    pass


class ModelRouter:
    def __init__(self, settings: Settings):
        s = settings
        providers: list[Provider] = [
            AnthropicProvider(s.anthropic_api_key, s.anthropic_model, s.anthropic_effort),
            OpenAICompatibleProvider("openai", "GPT", s.openai_model, s.openai_api_key),
            OpenAICompatibleProvider("gemini", "Gemini", s.gemini_model, s.gemini_api_key, s.gemini_base_url),
            # Ollama ignores the key, but the OpenAI client requires a non-empty one.
            OpenAICompatibleProvider("ollama", "Local (Ollama)", s.ollama_model, "ollama", s.ollama_base_url, s.ollama_enabled),
        ]
        self.providers = {p.id: p for p in providers}
        self.default = s.friday_default_provider
        self.fallback_order = [p.strip() for p in s.friday_fallback_order.split(",") if p.strip()]

    def describe(self) -> list[dict]:
        return [
            {"id": p.id, "label": p.label, "model": p.model, "available": p.available()}
            for p in self.providers.values()
        ]

    def _candidates(self, requested: str | None) -> list[Provider]:
        first = requested or self.default
        order = [first] + [p for p in self.fallback_order if p != first]
        return [self.providers[p] for p in order if p in self.providers and self.providers[p].available()]

    async def stream(
        self, history: list[ChatTurn], system: str, provider: str | None = None, model: str | None = None,
        toolbox=None, max_rounds: int = 8,
    ) -> AsyncIterator[Attempt | TextDelta | ToolCall | ToolResult | Done]:
        candidates = self._candidates(provider)
        if not candidates:
            raise NoProviderAvailable("No AI provider is configured. Add an API key to .env and restart.")

        last_error: Exception | None = None
        for p in candidates:
            # A model override only applies to the provider it was chosen for.
            use_model = model if (model and p.id == (provider or self.default)) else p.model
            yield Attempt(provider=p.id, model=use_model)
            sent_text = False
            try:
                async for event in p.stream(history, system, use_model, toolbox, max_rounds):
                    if isinstance(event, (TextDelta, ToolCall)):
                        sent_text = True
                    yield event
                return
            except Exception as e:  # provider SDKs raise many types; all are handled the same here
                if sent_text:
                    raise
                log.warning("provider %s failed before output, trying next: %s", p.id, e)
                last_error = e
        raise last_error or NoProviderAvailable("All providers failed")
