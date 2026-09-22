from app.models import ContentBrief, ImageBrief


class ImagePlanner:
    """Creates a brand-safe visual brief; an image provider can be plugged in later."""

    def create(self, brief: ContentBrief) -> ImageBrief:
        format_name = "vertical 9:16" if brief.platform in {"tiktok", "instagram"} else "square 1:1"
        prompt = (
            f"Create a premium travel marketing visual about {brief.topic} in Vietnam. "
            "Use authentic destination-focused photography, clean editorial composition, "
            "turquoise/teal and restrained gold accents, generous whitespace, and a clear area "
            f"for the headline '{brief.hook}'. Avoid fake landmarks, repeated photos, clutter, "
            "unverified prices, visa claims, and excessive text."
        )
        return ImageBrief(
            topic=brief.topic,
            format=format_name,
            headline=brief.hook,
            prompt=prompt,
            brand_notes="GetTravel: calm premium turquoise/teal + gold; destination imagery must match the real location.",
        )
