from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CompetitorPost:
    competitor: str
    platform: str
    topic: str
    text: str = ""
    likes: int = 0
    comments: int = 0
    shares: int = 0
    views: int = 0


@dataclass
class MarketSignal:
    topic: str
    score: float
    reasons: List[str] = field(default_factory=list)


@dataclass
class ContentBrief:
    platform: str
    language: str
    topic: str
    angle: str
    hook: str
    body_points: List[str]
    cta: str
    price_text: str = "Price on request for your travel date"


@dataclass
class ImageBrief:
    topic: str
    format: str
    headline: str
    prompt: str
    brand_notes: str
