from app.agents.competitor import CompetitorAnalyzer
from app.agents.director import MarketingDirector
from app.models import CompetitorPost


def test_competitor_topics_are_normalized_merged_and_ranked():
    posts = [
        CompetitorPost("a", "facebook", " Dalat ", likes=10),
        CompetitorPost("b", "tiktok", "dalat", likes=20),
        CompetitorPost("c", "instagram", "Islands", likes=25),
    ]

    signals = CompetitorAnalyzer().analyze(posts)

    assert [(signal.topic, signal.score) for signal in signals] == [
        ("dalat", 30.0),
        ("islands", 25.0),
    ]


def test_daily_plan_requires_approval_and_preserves_price_guardrail():
    posts = [CompetitorPost("a", "facebook", "Dalat", likes=10)]

    plan = MarketingDirector().daily_plan(posts, ["facebook", "tiktok"])

    assert len(plan) == 2
    assert [item["content"].platform for item in plan] == ["facebook", "tiktok"]
    assert [item["image"].format for item in plan] == [
        "square 1:1",
        "vertical 9:16",
    ]
    for item in plan:
        assert item["status"] == "needs_human_approval"
        assert item["content"].topic == "Dalat"
        assert item["content"].price_text == "Price on request for your travel date"
        assert item["image"].topic == item["content"].topic
        assert item["content"].hook in item["image"].prompt


def test_daily_plan_without_observations_is_empty():
    assert MarketingDirector().daily_plan([], ["facebook"]) == []
