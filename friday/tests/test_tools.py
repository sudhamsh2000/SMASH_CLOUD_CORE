import httpx
from pydantic import BaseModel

from app.providers.base import ChatTurn, Done, TextDelta, ToolCall
from app.router import Attempt, ModelRouter
from app.config import Settings
from app.tools import TOOLS, Tool, ToolContext, Toolbox


class EchoIn(BaseModel):
    word: str


async def echo(args: EchoIn, _ctx) -> object:
    return {"echo": args.word}


async def boom(_args, _ctx) -> object:
    raise RuntimeError("disk on fire")


def box(*tools):
    return Toolbox(ToolContext(token="t", http=httpx.AsyncClient()), list(tools))


async def test_valid_call_from_dict_and_json_string():
    b = box(Tool("echo", "", EchoIn, echo))
    assert await b.call("echo", {"word": "hi"}) == ('{"echo": "hi"}', False)
    assert await b.call("echo", '{"word": "hi"}') == ('{"echo": "hi"}', False)  # OpenAI-style


async def test_invalid_input_is_an_error_result_not_an_exception():
    b = box(Tool("echo", "", EchoIn, echo))
    out, is_error = await b.call("echo", {"wrong": 1})
    assert is_error and "INVALID_INPUT" in out
    out, is_error = await b.call("echo", "{not json")
    assert is_error


async def test_failing_tool_and_unknown_tool_are_reported():
    b = box(Tool("boom", "", EchoIn, boom))
    assert (await b.call("boom", {"word": "x"}))[1] is True
    assert (await b.call("nope", {}))[1] is True


async def test_http_tool_forwards_the_users_token():
    seen = {}

    def handler(req: httpx.Request):
        seen["auth"] = req.headers["authorization"]
        return httpx.Response(200, json={"cpu_percent": 12})

    b = Toolbox(ToolContext(token="jwt-123", http=httpx.AsyncClient(transport=httpx.MockTransport(handler))))
    out, is_error = await b.call("system_stats", {})
    assert not is_error and "cpu_percent" in out and seen["auth"] == "Bearer jwt-123"


def test_specs_are_strict_json_schemas():
    for spec in box(*TOOLS).specs():
        assert spec["input_schema"]["type"] == "object"
        assert spec["input_schema"]["additionalProperties"] is False


# ── Router fallback rules ────────────────────────────────────────────────
class Fake:
    def __init__(self, id, events, fail_after=None):
        self.id, self.label, self.model = id, id, id + "-model"
        self.events, self.fail_after = events, fail_after

    def available(self):
        return True

    async def stream(self, history, system, model, toolbox=None, max_rounds=8):
        for i, ev in enumerate(self.events):
            if self.fail_after == i:
                raise RuntimeError(f"{self.id} died")
            yield ev
        if self.fail_after == len(self.events):
            raise RuntimeError(f"{self.id} died")


def router_with(*providers):
    r = ModelRouter(Settings(database_url="x", smash_jwt_secret="x"))
    r.providers = {p.id: p for p in providers}
    r.default, r.fallback_order = providers[0].id, [p.id for p in providers]
    return r


async def collect(r):
    return [e async for e in r.stream([ChatTurn("user", "hi")], "sys")]


async def test_falls_back_when_first_provider_fails_before_output():
    r = router_with(Fake("a", [TextDelta("x")], fail_after=0), Fake("b", [TextDelta("ok"), Done("b")]))
    evs = await collect(r)
    assert [e.provider for e in evs if isinstance(e, Attempt)] == ["a", "b"]
    assert any(isinstance(e, TextDelta) and e.text == "ok" for e in evs)


async def test_no_fallback_after_a_tool_ran():
    r = router_with(Fake("a", [ToolCall("1", "system_stats", {})], fail_after=1), Fake("b", [Done("b")]))
    try:
        await collect(r)
    except RuntimeError as e:
        assert "a died" in str(e)
    else:
        raise AssertionError("should not fall back to b after a tool call")
