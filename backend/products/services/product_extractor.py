"""Shared fetch constants, SSRF guard and the legacy extractor facade."""


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9,en-GB;q=0.8,en-US;q=0.7",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
}

REQUEST_TIMEOUT = 15
MAX_URL_LENGTH = 2048

BLOCKED_NETWORKS = [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "::1/128",
    "fc00::/7",
]


def _is_private_ip(ip: str) -> bool:
    import ipaddress
    try:
        addr = ipaddress.ip_address(ip)
        for net in BLOCKED_NETWORKS:
            if addr in ipaddress.ip_network(net, strict=False):
                return True
    except ValueError:
        return True
    return False


def _validate_url_safety(url: str) -> str:
    from .security import validate_url_security, SecurityValidationError
    try:
        sec = validate_url_security(url, check_allowed_domain=False)
        return sec["resolved_ip"]
    except SecurityValidationError as e:
        raise ValueError(str(e))


class ExtractionError(Exception):
    pass


class ProductExtractor:
    """Facade preserving the legacy extraction contract.

    Delegates to the layered pipeline in
    products.services.extract (official API → HTTP → JSON-LD/meta →
    CSS selectors → browser → graceful failure) and maps the validated
    result back to the historical normalized dict shape.
    """

    def extract(self, url: str, platform: str) -> dict:
        from .extract.pipeline import extract_product
        from .product_normalizer import ProductNormalizer

        try:
            _validate_url_safety(url)
        except ValueError as e:
            raise ExtractionError(str(e))

        result = extract_product(url, platform)
        if not result.product_name and result.price is None:
            raise ExtractionError(
                result.reason
                or "Product information could not be extracted from this page. "
                "Please try another supported product URL."
            )

        legacy = result.to_legacy()
        normalizer = ProductNormalizer()
        normalized = normalizer.normalize(legacy, platform)
        normalized["platform"] = platform
        normalized["source_url"] = url
        return normalized
