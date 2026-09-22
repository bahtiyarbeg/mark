from typing import Iterable

from app.agents.competitor import CompetitorAnalyzer
from app.agents.content import ContentPlanner
from app.agents.image import ImagePlanner
from app.models import CompetitorPost


class MarketingDirector:
    def __init__(self) -> None:
        self.competitors = CompetitorAnalyzer()
        self.content = ContentPlanner()
        self.images = ImagePlanner()

    def daily_plan(self, posts: Iterable[CompetitorPost], platforms: Iterable[str]):
        signals = self.competitors.analyze(posts)
        briefs = self.content.build_briefs(signals, platforms)
        return [
            {
                "content": brief,
                "image": self.images.create(brief),
                "status": "needs_human_approval",
            }
            for brief in briefs
        ]
