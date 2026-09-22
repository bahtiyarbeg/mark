from typing import Iterable, List

from app.models import ContentBrief, MarketSignal


PLATFORM_ANGLES = {
    "facebook": "useful, trust-building tour explanation",
    "instagram": "visual travel inspiration with a concise sales angle",
    "tiktok": "fast hook suitable for a short vertical video",
    "wechat": "clear travel offer for Chinese-speaking visitors",
    "line": "short mobile-first travel recommendation",
    "viber": "compact offer suitable for community/channel distribution",
}


class ContentPlanner:
    def build_briefs(
        self,
        signals: Iterable[MarketSignal],
        platforms: Iterable[str],
        language: str = "en",
        limit_topics: int = 3,
    ) -> List[ContentBrief]:
        briefs: List[ContentBrief] = []
        for signal in list(signals)[:limit_topics]:
            topic_name = signal.topic.title()
            for platform in platforms:
                platform_key = platform.lower()
                briefs.append(
                    ContentBrief(
                        platform=platform_key,
                        language=language,
                        topic=topic_name,
                        angle=PLATFORM_ANGLES.get(platform_key, "helpful travel recommendation"),
                        hook=f"Discover {topic_name} from Nha Trang",
                        body_points=[
                            "Explain what makes the experience worth the travel time",
                            "Show the main stops or inclusions clearly",
                            "State pickup/return details only when verified",
                            "Use original GetTravel wording rather than competitor copy",
                        ],
                        cta="Send your travel date and number of guests for availability and price.",
                    )
                )
        return briefs
