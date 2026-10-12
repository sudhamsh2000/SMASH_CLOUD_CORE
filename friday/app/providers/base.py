"""The contract every model provider implements.

FRIDAY only ever talks to `Provider`. Adding a provider means writing one class with
`available()` and `stream()`; nothing else changes.
"""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from ..tools import Toolbox


@dataclass
class ChatTurn:
    role: str  # "user" | "assistant"
    content: str


@dataclass
class TextDelta:
    text: str


@dataclass
class Done:
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    stop_reason: str | None = None


@dataclass
class ToolCall:
    """The model asked to run a tool. Emitted before it runs, so the UI can show it."""

    id: str
    name: str
    input: object


@dataclass
class ToolResult:
    id: str
    name: str
    output: str
    is_error: bool = False


StreamEvent = TextDelta | ToolCall | ToolResult | Done


class Provider(Protocol):
    id: str
    label: str
    model: str

    def available(self) -> bool: ...

    def stream(
        self, history: list[ChatTurn], system: str, model: str, toolbox: "Toolbox | None" = None, max_rounds: int = 8
    ) -> AsyncIterator[StreamEvent]:
        """Stream one assistant reply. With a toolbox, the provider runs the tool loop
        itself (model -> tool calls -> results -> model ...) because every API formats tool
        calls differently; callers only ever see the neutral events above."""
        ...
