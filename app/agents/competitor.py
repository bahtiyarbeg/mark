from collections import defaultdict
from typing import Iterable, List

from app.models import CompetitorPost, MarketSignal


class CompetitorAnalyzer:
    """Turns competitor observations into market signals without copying content."""

    def analyze(self, posts: Iterable[CompetitorPost]) -> List[MarketSignal]:
        buckets = defaultdict(lambda: {"score": 0.0, "platforms": set(), "count": 0})

        for post in posts:
            engagement = (
                post.likes
                + post.comments * 2
                + post.shares * 3
                + min(post.views / 100, 100)
            )
            item = buckets[post.topic.strip().lower()]
            item["score"] += engagement
            item["platforms"].add(post.platform)
            item["count"] += 1

        signals = []
        for topic, data in buckets.items():
            reasons = [
                f"Seen in {data['count']} competitor post(s)",
                "Platforms: " + ", ".join(sorted(data["platforms"])),
            ]
            signals.append(MarketSignal(topic=topic, score=round(data["score"], 2), reasons=reasons))

        return sorted(signals, key=lambda signal: signal.score, reverse=True)
