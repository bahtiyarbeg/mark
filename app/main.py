from app.agents.director import MarketingDirector
from app.models import CompetitorPost


def demo():
    observations = [
        CompetitorPost("demo-a", "facebook", "Dalat day tour", likes=40, comments=8, shares=4, views=2200),
        CompetitorPost("demo-b", "tiktok", "Dalat day tour", likes=110, comments=15, shares=12, views=12000),
        CompetitorPost("demo-c", "instagram", "3 islands", likes=65, comments=6, shares=3, views=4000),
    ]

    director = MarketingDirector()
    plan = director.daily_plan(observations, ["facebook", "instagram", "tiktok"])

    for item in plan:
        content = item["content"]
        print(f"[{content.platform}] {content.hook} — {item['status']}")


if __name__ == "__main__":
    demo()
