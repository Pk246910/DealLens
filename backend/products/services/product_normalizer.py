import re

CATEGORY_KEYWORDS = {
    "Fashion": [
        "shirt", "t-shirt", "tshirt", "tee", "jeans", "dress", "jacket", "trousers",
        "kurta", "kurti", "saree", "sari", "lehenga", "polo", "hoodie", "sweatshirt",
        "top", "chinos", "blazer", "suit", "shorts", "skirt", "trackpant", "boxer",
        "innerwear", "ethnic", "apparel", "clothing", "menswear", "womenswear", "kidswear",
    ],
    "Footwear": [
        "shoe", "sneaker", "boot", "sandal", "slipper", "floaters", "crocs", "loafers",
        "heels", "flats", "clogs", "footwear",
    ],
    "Beauty": [
        "makeup", "skincare", "moisturizer", "serum", "foundation", "lipstick", "perfume",
        "fragrance", "sunscreen", "facewash", "face wash", "lotion", "cream", "shampoo",
        "conditioner", "kajal", "eyeliner", "mascara", "cosmetics", "beauty",
    ],
    "Smartphones": ["phone", "iphone", "galaxy", "pixel", "oneplus", "xiaomi", "redmi", "realme", "vivo", "oppo", "samsung", "smartphone"],
    "Laptops": ["laptop", "macbook", "notebook", "chromebook", "thinkpad"],
    "Tablets": ["tablet", "ipad", "galaxy tab"],
    "Headphones": ["headphone", "headset", "over-ear"],
    "Earbuds": ["earbuds", "airpods", "tws", "earphone", "airdopes"],
    "Smartwatches": ["smartwatch", "smart watch", "apple watch", "watch ultra", "galaxy watch"],
    "TVs": ["television", "tv ", " smart tv", " led tv", " oled tv"],
    "Cameras": ["camera", "dslr", "mirrorless", "gopro", "lens"],
    "Gaming": ["gaming", "playstation", "xbox", "nintendo", "ps5"],
    "Computer Accessories": ["keyboard", "mouse", "ssd", "hard drive", "usb", "monitor", "webcam", "printer"],
    "Home Appliances": ["ac ", "air conditioner", "washing machine", "refrigerator", "vacuum", "fan ", "heater", "geyser"],
    "Kitchen Appliances": ["mixer", "grinder", "blender", "toaster", "microwave", "cooker", "pressure cooker", "air fryer", "kettle", "water purifier"],
    "Grocery": ["atta", "rice", "oil", "snack", "tea", "coffee", "masala", "pulse", "cereal"],
}

BRAND_PATTERNS = [
    "Samsung", "Apple", "OnePlus", "Xiaomi", "Realme", "Vivo", "Oppo", "Nothing", "Motorola", "Google",
    "Sony", "LG", "HP", "Dell", "Lenovo", "ASUS", "Acer", "MSI",
    "Boat", "JBL", "Sennheiser", "Bose", "Noise", "Fire-Boltt", "Amazfit",
    "Roadster", "Highlander", "HRX", "WROGN", "Mast & Harbour", "Flying Machine",
    "Allen Solly", "Peter England", "Louis Philippe", "Van Heusen", "Raymond", "Mufti", "U.S. Polo",
    "Nike", "Adidas", "Puma", "Reebok", "Levi's", "Levis", "H&M", "Zara", "Biba", "FabIndia",
    "Philips", "Havells", "Bajaj", "Prestige", "Pigeon", "Kent", "Aquaguard",
    "Lakme", "Maybelline", "L'Oreal", "Mamaearth", "Nivea", "Plum", "Nykaa",
    "Corsair", "Logitech", "Razer", "Keychron",
    "GoPro", "Nikon", "Canon", "Fujifilm",
    "Dyson", "IFB", "Whirlpool", "Voltas", "Godrej",
]


class ProductNormalizer:
    """Converts raw extracted product data into a standard normalized format."""

    def normalize(self, raw_data: dict, platform: str) -> dict:
        title = raw_data.get("title", "").strip()
        brand = raw_data.get("brand", "").strip()
        if not brand:
            brand = self._extract_brand_from_title(title)

        price = self._to_float(raw_data.get("price"))
        mrp = self._to_float(raw_data.get("mrp"))
        if not mrp or mrp < price:
            mrp = price

        discount = 0.0
        if mrp > 0 and price > 0 and mrp > price:
            discount = round(((mrp - price) / mrp) * 100, 2)

        category = raw_data.get("category", "")
        if not category or category == "Other":
            category = self._infer_category(title, raw_data.get("source_url") or raw_data.get("url") or "")

        rating = raw_data.get("rating")
        if rating:
            try:
                rating = float(rating)
                rating = max(0.0, min(5.0, rating))
            except (ValueError, TypeError):
                rating = None

        review_count = raw_data.get("review_count")
        if review_count:
            try:
                review_count = int(review_count)
            except (ValueError, TypeError):
                review_count = 0
        else:
            review_count = 0

        return {
            "title": title,
            "brand": brand,
            "category": category,
            "price": price,
            "mrp": mrp,
            "discount": discount,
            "rating": rating,
            "review_count": review_count,
            "image_url": raw_data.get("image_url", ""),
            "description": raw_data.get("description", "")[:1000],
            "specifications": raw_data.get("specifications", {}),
            "availability": raw_data.get("availability", "Unknown"),
            "delivery": raw_data.get("delivery", ""),
            "offers": raw_data.get("offers", []),
            "platform": platform,
            "source_url": raw_data.get("source_url", ""),
            "data_source": "live",
        }

    def _extract_brand_from_title(self, title: str) -> str:
        if not title:
            return ""
        for brand in BRAND_PATTERNS:
            if brand.lower() in title.lower():
                return brand
        words = title.split()
        if words:
            first = words[0]
            if first.isalpha() and len(first) >= 2:
                return first
        return ""

    def _infer_category(self, title: str, url: str = "") -> str:
        haystack = f"{title or ''} {url or ''}".lower()
        for category, keywords in CATEGORY_KEYWORDS.items():
            for kw in keywords:
                if kw in haystack:
                    return category
        return "Other"

    @staticmethod
    def _to_float(val) -> float:
        if val is None:
            return 0.0
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            cleaned = re.sub(r"[^\d.]", "", val.strip())
            try:
                return float(cleaned)
            except (ValueError, TypeError):
                return 0.0
        return 0.0
