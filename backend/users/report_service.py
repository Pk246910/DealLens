"""30-Day / Monthly Operational & Analytics Report generator for DealLens Admin Portal.

Generates comprehensive 30-day / monthly platform reports, persists report files
to the local device filesystem (`backend/reports/`), and supports CSV (Excel)
and standalone HTML/Printable PDF exports restricted to Admin (`is_staff`) users.
"""

import calendar
import csv
import io
import os
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Avg, Count, Max, Min, Q
from django.utils import timezone

from products.models import Platform, Product, ProductOffer, URLAnalysis, Wishlist
from users.models import PriceAlert


def get_reports_directory() -> str:
    """Return (and create if needed) the local device directory where monthly reports are stored."""
    reports_dir = os.path.join(settings.BASE_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    return reports_dir


def resolve_period_window(period_key: str):
    """Resolve a period key ('30d', 'YYYY-MM', or 'all') into (start_dt, end_dt, label, normalized_key)."""
    now = timezone.now()
    key = (period_key or "30d").strip()

    if key == "all":
        start_dt = now - timedelta(days=3650)
        label = f"All-Time Cumulative (Through {now.strftime('%d %b %Y')})"
        return start_dt, now, label, "all"

    if len(key) == 7 and key[4] == "-":
        try:
            year = int(key[:4])
            month = int(key[5:7])
            if 1 <= month <= 12:
                _, last_day = calendar.monthrange(year, month)
                tz = timezone.get_current_timezone()
                start_dt = timezone.make_aware(datetime(year, month, 1, 0, 0, 0), tz)
                end_dt = timezone.make_aware(datetime(year, month, last_day, 23, 59, 59), tz)
                month_name = calendar.month_name[month]
                label = f"{month_name} {year} (01 {month_name[:3]} {year} – {last_day:02d} {month_name[:3]} {year})"
                return start_dt, end_dt, label, f"{year:04d}-{month:02d}"
        except (ValueError, TypeError):
            pass

    # Default: Rolling Last 30 Days
    start_dt = now - timedelta(days=30)
    label = f"Last 30 Days ({start_dt.strftime('%d %b %Y')} – {now.strftime('%d %b %Y')})"
    return start_dt, now, label, "30d"


def get_available_periods():
    """Return selectable 30-day / monthly report periods."""
    now = timezone.now()
    periods = [
        {
            "key": "30d",
            "label": f"Rolling Last 30 Days ({(now - timedelta(days=30)).strftime('%d %b')} – {now.strftime('%d %b %Y')})",
        }
    ]
    year = now.year
    month = now.month
    for _ in range(6):
        month_name = calendar.month_name[month]
        periods.append({
            "key": f"{year:04d}-{month:02d}",
            "label": f"{month_name} {year} (Monthly Cycle)",
        })
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return periods


def build_monthly_report_payload(period_key: str = "30d", requested_by: str = "admin") -> dict:
    """Build the full 30-day / monthly report dataset and persist a copy on disk."""
    start_dt, end_dt, period_label, norm_key = resolve_period_window(period_key)
    now = timezone.now()

    # Period-filtered querysets
    users_in_period = User.objects.filter(date_joined__gte=start_dt, date_joined__lte=end_dt)
    products_in_period = Product.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    offers_in_period = ProductOffer.objects.filter(updated_at__gte=start_dt, updated_at__lte=end_dt)
    analyses_in_period = URLAnalysis.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    wishlists_in_period = Wishlist.objects.filter(added_at__gte=start_dt, added_at__lte=end_dt)
    alerts_in_period = PriceAlert.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)

    # Triggered alerts count
    triggered_alerts_count = 0
    for alert in alerts_in_period.select_related("product").prefetch_related("product__offers"):
        lowest_offer = alert.product.offers.filter(in_stock=True).order_by("current_price").first()
        if lowest_offer and float(lowest_offer.current_price) <= float(alert.target_price):
            triggered_alerts_count += 1

    # Marketplace breakdown
    store_stats_qs = (
        ProductOffer.objects.values("store_name")
        .annotate(
            offers_count=Count("id"),
            in_stock_count=Count("id", filter=Q(in_stock=True)),
            avg_price=Avg("current_price"),
            min_price=Min("current_price"),
            max_price=Max("current_price"),
        )
        .order_by("-offers_count")
    )
    marketplace_breakdown = [
        {
            "store_name": row["store_name"] or "Unknown Store",
            "offers_count": row["offers_count"],
            "in_stock_count": row["in_stock_count"],
            "avg_price": round(float(row["avg_price"] or 0), 2),
            "min_price": round(float(row["min_price"] or 0), 2),
            "max_price": round(float(row["max_price"] or 0), 2),
        }
        for row in store_stats_qs
    ]

    # Category breakdown
    category_stats_qs = (
        Product.objects.values("category")
        .annotate(
            products_count=Count("id", distinct=True),
            offers_count=Count("offers"),
        )
        .order_by("-products_count")
    )
    category_breakdown = [
        {
            "category": row["category"] or "General",
            "products_count": row["products_count"],
            "offers_count": row["offers_count"],
        }
        for row in category_stats_qs
    ]

    # User activity summary
    all_users = User.objects.all().order_by("-date_joined")
    user_activity = []
    for u in all_users:
        role = "Superuser" if u.is_superuser else ("Staff Operator" if u.is_staff else "Customer")
        user_activity.append({
            "id": u.id,
            "username": u.username,
            "email": u.email or "—",
            "role": role,
            "date_joined": u.date_joined.isoformat() if u.date_joined else None,
            "joined_in_period": start_dt <= u.date_joined <= end_dt if u.date_joined else False,
            "wishlist_count": u.wishlist_items.count(),
            "alerts_count": u.price_alerts.count(),
            "analyses_count": u.url_analyses.count(),
            "period_wishlists": u.wishlist_items.filter(added_at__gte=start_dt, added_at__lte=end_dt).count(),
            "period_alerts": u.price_alerts.filter(created_at__gte=start_dt, created_at__lte=end_dt).count(),
            "period_analyses": u.url_analyses.filter(created_at__gte=start_dt, created_at__lte=end_dt).count(),
        })

    # Wishlist log in period
    wishlist_log = []
    for w in (
        wishlists_in_period.select_related("user", "product")
        .prefetch_related("product__offers")
        .order_by("-added_at")[:50]
    ):
        lowest = w.product.offers.filter(in_stock=True).order_by("current_price").first()
        wishlist_log.append({
            "id": w.id,
            "username": w.user.username if w.user else (f"Guest ({w.guest_id[:8]})" if w.guest_id else "Guest"),
            "product_id": w.product.id,
            "product_title": w.product.title,
            "brand": w.product.brand or "—",
            "category": w.product.category or "General",
            "lowest_price": float(lowest.current_price) if lowest else None,
            "added_at": w.added_at.isoformat() if w.added_at else None,
        })

    # Price Alerts log in period
    alerts_log = []
    for a in (
        alerts_in_period.select_related("user", "product")
        .prefetch_related("product__offers")
        .order_by("-created_at")[:50]
    ):
        lowest = a.product.offers.filter(in_stock=True).order_by("current_price").first()
        curr_price = float(lowest.current_price) if lowest else None
        target_val = float(a.target_price)
        is_trig = curr_price is not None and curr_price <= target_val
        alerts_log.append({
            "id": a.id,
            "username": a.user.username if a.user else "—",
            "email": a.user.email if a.user and a.user.email else "—",
            "product_id": a.product.id,
            "product_title": a.product.title,
            "target_price": target_val,
            "current_price": curr_price,
            "is_triggered": is_trig,
            "active": a.active,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    # URL Analyses log in period
    analyses_log = []
    for an in analyses_in_period.select_related("user", "product").order_by("-created_at")[:50]:
        res_prod = (an.analysis_result or {}).get("product", {}) if isinstance(an.analysis_result, dict) else {}
        title = (an.product.title if an.product else "") or res_prod.get("title") or an.submitted_url[:80]
        analyses_log.append({
            "id": an.id,
            "username": an.user.username if an.user else "Guest",
            "detected_platform": an.detected_platform or "Unknown",
            "product_title": title,
            "status": an.status,
            "submitted_url": an.submitted_url,
            "created_at": an.created_at.isoformat() if an.created_at else None,
        })

    file_tag = now.strftime("%Y-%m") if norm_key == "30d" else norm_key
    report_id = f"DL-RPT-{file_tag.replace('-', '')}-{norm_key.upper()}"

    payload = {
        "report_meta": {
            "report_id": report_id,
            "title": "DealLens 30-Day Operational & Deal Intelligence Report",
            "period_key": norm_key,
            "period_label": period_label,
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat(),
            "cycle_days": 30,
            "generated_at": now.isoformat(),
            "generated_by": requested_by,
        },
        "available_periods": get_available_periods(),
        "summary": {
            "period": {
                "new_users": users_in_period.count(),
                "new_products": products_in_period.count(),
                "new_offers": offers_in_period.count(),
                "analyses_total": analyses_in_period.count(),
                "analyses_completed": analyses_in_period.filter(status="completed").count(),
                "analyses_failed": analyses_in_period.filter(status="failed").count(),
                "wishlists_added": wishlists_in_period.count(),
                "alerts_created": alerts_in_period.count(),
                "alerts_triggered": triggered_alerts_count,
            },
            "cumulative": {
                "total_users": User.objects.count(),
                "total_staff": User.objects.filter(is_staff=True).count(),
                "total_products": Product.objects.count(),
                "total_offers": ProductOffer.objects.count(),
                "total_platforms": Platform.objects.count(),
                "total_wishlists": Wishlist.objects.count(),
                "total_alerts": PriceAlert.objects.count(),
                "total_analyses": URLAnalysis.objects.count(),
            },
        },
        "marketplace_breakdown": marketplace_breakdown,
        "category_breakdown": category_breakdown,
        "user_activity": user_activity,
        "wishlist_log": wishlist_log,
        "alerts_log": alerts_log,
        "analyses_log": analyses_log,
    }

    # Automatically save/update the report files in the device's local `backend/reports/` directory
    csv_text = render_report_csv(payload)
    html_text = render_report_html(payload)
    storage_info = persist_report_to_disk(payload, csv_text, html_text)
    payload["report_meta"].update(storage_info)
    payload["archived_files"] = list_archived_report_files()

    return payload


def render_report_csv(payload: dict) -> str:
    """Render the 30-day report payload as a structured Excel-compatible UTF-8 CSV."""
    meta = payload["report_meta"]
    period_sum = payload["summary"]["period"]
    cum_sum = payload["summary"]["cumulative"]

    buf = io.StringIO()
    # Write UTF-8 BOM so Microsoft Excel opens ₹ symbols and columns properly
    buf.write("\ufeff")
    writer = csv.writer(buf)

    writer.writerow(["DEALLENS — 30-DAY / MONTHLY ADMIN OPERATIONAL REPORT"])
    writer.writerow(["Report ID", meta["report_id"]])
    writer.writerow(["Period", meta["period_label"]])
    writer.writerow(["Start Date", meta["start_date"]])
    writer.writerow(["End Date", meta["end_date"]])
    writer.writerow(["Generated At", meta["generated_at"]])
    writer.writerow(["Generated By (Admin)", meta["generated_by"]])
    writer.writerow([])

    # 1. Executive Summary
    writer.writerow(["=== 1. EXECUTIVE SUMMARY (30-DAY WINDOW VS. CUMULATIVE) ==="])
    writer.writerow(["Metric", "30-Day Period Count", "All-Time Cumulative Total"])
    writer.writerow(["Registered Users", period_sum["new_users"], cum_sum["total_users"]])
    writer.writerow(["Products in Catalog", period_sum["new_products"], cum_sum["total_products"]])
    writer.writerow(["Multi-Store Offers", period_sum["new_offers"], cum_sum["total_offers"]])
    writer.writerow(["URL Price Analyses (Total)", period_sum["analyses_total"], cum_sum["total_analyses"]])
    writer.writerow(["URL Analyses (Completed)", period_sum["analyses_completed"], "—"])
    writer.writerow(["URL Analyses (Failed)", period_sum["analyses_failed"], "—"])
    writer.writerow(["Wishlist Items Saved", period_sum["wishlists_added"], cum_sum["total_wishlists"]])
    writer.writerow(["Price Drop Alerts Created", period_sum["alerts_created"], cum_sum["total_alerts"]])
    writer.writerow(["Price Drop Alerts Triggered (Target Met)", period_sum["alerts_triggered"], "—"])
    writer.writerow([])

    # 2. Marketplace Breakdown
    writer.writerow(["=== 2. MULTI-MARKETPLACE STORE BREAKDOWN ==="])
    writer.writerow(["Marketplace Store", "Total Offers", "In-Stock Offers", "Min Price (INR)", "Avg Price (INR)", "Max Price (INR)"])
    for m in payload["marketplace_breakdown"]:
        writer.writerow([
            m["store_name"],
            m["offers_count"],
            m["in_stock_count"],
            f"Rs. {m['min_price']:,.2f}",
            f"Rs. {m['avg_price']:,.2f}",
            f"Rs. {m['max_price']:,.2f}",
        ])
    writer.writerow([])

    # 3. Category Breakdown
    writer.writerow(["=== 3. PRODUCT CATEGORY DISTRIBUTION ==="])
    writer.writerow(["Category", "Products Tracked", "Total Store Offers"])
    for c in payload["category_breakdown"]:
        writer.writerow([c["category"], c["products_count"], c["offers_count"]])
    writer.writerow([])

    # 4. User Activity Summary
    writer.writerow(["=== 4. REGISTERED USERS & WISHLIST / ALERT ACTIVITY ==="])
    writer.writerow([
        "User ID", "Username", "Email", "Role", "Joined Date",
        "Total Wishlist", "Total Price Alerts", "Total URL Analyses",
        "30d Wishlist Added", "30d Alerts Created", "30d Analyses Run",
    ])
    for u in payload["user_activity"]:
        writer.writerow([
            u["id"],
            u["username"],
            u["email"],
            u["role"],
            u["date_joined"][:10] if u["date_joined"] else "—",
            u["wishlist_count"],
            u["alerts_count"],
            u["analyses_count"],
            u["period_wishlists"],
            u["period_alerts"],
            u["period_analyses"],
        ])
    writer.writerow([])

    # 5. Saved Wishlist Activity Log
    writer.writerow(["=== 5. SAVED WISHLIST ITEMS LOG (30-DAY PERIOD) ==="])
    writer.writerow(["Wishlist ID", "User", "Product ID", "Product Title", "Brand", "Category", "Best Price (INR)", "Saved At"])
    for w in payload["wishlist_log"]:
        writer.writerow([
            w["id"],
            w["username"],
            w["product_id"],
            w["product_title"],
            w["brand"],
            w["category"],
            f"Rs. {w['lowest_price']:,.2f}" if w["lowest_price"] is not None else "—",
            w["added_at"][:19].replace("T", " ") if w["added_at"] else "—",
        ])
    writer.writerow([])

    # 6. Price Alerts Log
    writer.writerow(["=== 6. PRICE DROP ALERTS LOG (30-DAY PERIOD) ==="])
    writer.writerow(["Alert ID", "User", "Email", "Product Title", "Target Price (INR)", "Current Best Price (INR)", "Status", "Created At"])
    for a in payload["alerts_log"]:
        writer.writerow([
            a["id"],
            a["username"],
            a["email"],
            a["product_title"],
            f"Rs. {a['target_price']:,.2f}",
            f"Rs. {a['current_price']:,.2f}" if a["current_price"] is not None else "—",
            "TARGET MET" if a["is_triggered"] else ("MONITORING" if a["active"] else "INACTIVE"),
            a["created_at"][:19].replace("T", " ") if a["created_at"] else "—",
        ])
    writer.writerow([])

    # 7. URL Analyses Log
    writer.writerow(["=== 7. URL PRICE COMPARISON ANALYSES LOG (30-DAY PERIOD) ==="])
    writer.writerow(["Analysis ID", "User", "Platform", "Product Title", "Status", "Submitted URL", "Analyzed At"])
    for an in payload["analyses_log"]:
        writer.writerow([
            an["id"],
            an["username"],
            an["detected_platform"],
            an["product_title"],
            an["status"].upper(),
            an["submitted_url"],
            an["created_at"][:19].replace("T", " ") if an["created_at"] else "—",
        ])

    return buf.getvalue()


def render_report_html(payload: dict) -> str:
    """Render a standalone, print-ready HTML report file for saving or printing to PDF."""
    meta = payload["report_meta"]
    p = payload["summary"]["period"]
    c = payload["summary"]["cumulative"]

    store_rows = "".join(
        f"<tr><td><strong>{m['store_name']}</strong></td><td>{m['offers_count']}</td>"
        f"<td>{m['in_stock_count']}</td><td>₹{m['min_price']:,.2f}</td>"
        f"<td>₹{m['avg_price']:,.2f}</td><td>₹{m['max_price']:,.2f}</td></tr>"
        for m in payload["marketplace_breakdown"]
    ) or "<tr><td colspan='6'>No marketplace offers recorded.</td></tr>"

    user_rows = "".join(
        f"<tr><td>#{u['id']}</td><td><strong>{u['username']}</strong></td><td>{u['email']}</td>"
        f"<td>{u['role']}</td><td>{u['wishlist_count']} ({u['period_wishlists']} in 30d)</td>"
        f"<td>{u['alerts_count']} ({u['period_alerts']} in 30d)</td>"
        f"<td>{u['analyses_count']} ({u['period_analyses']} in 30d)</td>"
        f"<td>{(u['date_joined'] or '')[:10]}</td></tr>"
        for u in payload["user_activity"]
    ) or "<tr><td colspan='8'>No registered users.</td></tr>"

    wishlist_rows = "".join(
        f"<tr><td>{w['username']}</td><td>{w['product_title']}</td><td>{w['brand']}</td>"
        f"<td>{w['category']}</td><td>{('₹' + format(w['lowest_price'], ',.2f')) if w['lowest_price'] is not None else '—'}</td>"
        f"<td>{(w['added_at'] or '')[:16].replace('T', ' ')}</td></tr>"
        for w in payload["wishlist_log"]
    ) or "<tr><td colspan='6'>No wishlist items added during this 30-day window.</td></tr>"

    alert_rows = "".join(
        f"<tr><td>{a['username']}</td><td>{a['product_title']}</td>"
        f"<td>₹{a['target_price']:,.2f}</td>"
        f"<td>{('₹' + format(a['current_price'], ',.2f')) if a['current_price'] is not None else '—'}</td>"
        f"<td><strong>{'TARGET MET' if a['is_triggered'] else 'MONITORING'}</strong></td>"
        f"<td>{(a['created_at'] or '')[:16].replace('T', ' ')}</td></tr>"
        for a in payload["alerts_log"]
    ) or "<tr><td colspan='6'>No price drop alerts created during this 30-day window.</td></tr>"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{meta['title']} — {meta['period_label']}</title>
  <style>
    body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 32px; background: #f8fafc; }}
    .report-card {{ max-width: 1080px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05); }}
    .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #06b6d4; padding-bottom: 18px; margin-bottom: 24px; }}
    .brand {{ font-size: 24px; font-weight: 800; color: #0f172a; }}
    .brand span {{ color: #06b6d4; }}
    .meta {{ font-size: 12px; color: #475569; text-align: right; line-height: 1.6; }}
    h2 {{ font-size: 16px; font-weight: 700; color: #0f172a; margin: 26px 0 12px; border-left: 4px solid #06b6d4; padding-left: 10px; }}
    .kpi-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }}
    .kpi {{ background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }}
    .kpi .label {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }}
    .kpi .val {{ font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }}
    .kpi .sub {{ font-size: 11px; color: #0891b2; margin-top: 2px; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12.5px; }}
    th, td {{ border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }}
    th {{ background: #f1f5f9; font-weight: 700; color: #334155; }}
    tr:nth-child(even) td {{ background: #f8fafc; }}
    .footer {{ margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }}
    @media print {{ body {{ margin: 0; background: #fff; }} .report-card {{ border: none; box-shadow: none; padding: 12px; }} .no-print {{ display: none; }} }}
  </style>
</head>
<body>
  <div class="report-card">
    <div class="header">
      <div>
        <div class="brand">Deal<span>Lens</span> — Monthly Admin Report</div>
        <div style="font-size:13px;color:#475569;margin-top:4px;">{meta['period_label']}</div>
      </div>
      <div class="meta">
        <div><strong>Report ID:</strong> {meta['report_id']}</div>
        <div><strong>Generated At:</strong> {meta['generated_at'][:19].replace('T', ' ')}</div>
        <div><strong>Admin Operator:</strong> {meta['generated_by']}</div>
      </div>
    </div>

    <h2>1. 30-Day Executive Summary</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="label">New Users (30d)</div><div class="val">{p['new_users']}</div><div class="sub">Total Users: {c['total_users']}</div></div>
      <div class="kpi"><div class="label">Products Added (30d)</div><div class="val">{p['new_products']}</div><div class="sub">Total Catalog: {c['total_products']}</div></div>
      <div class="kpi"><div class="label">Wishlists Saved (30d)</div><div class="val">{p['wishlists_added']}</div><div class="sub">Total Saved: {c['total_wishlists']}</div></div>
      <div class="kpi"><div class="label">Price Alerts (30d)</div><div class="val">{p['alerts_created']}</div><div class="sub">Triggered: {p['alerts_triggered']} | Total: {c['total_alerts']}</div></div>
    </div>

    <h2>2. Multi-Marketplace Offer Distribution</h2>
    <table>
      <thead><tr><th>Store</th><th>Total Offers</th><th>In Stock</th><th>Min Price</th><th>Avg Price</th><th>Max Price</th></tr></thead>
      <tbody>{store_rows}</tbody>
    </table>

    <h2>3. Registered Shoppers & Activity Summary</h2>
    <table>
      <thead><tr><th>UID</th><th>Username</th><th>Email</th><th>Role</th><th>Wishlist</th><th>Price Alerts</th><th>URL Analyses</th><th>Joined</th></tr></thead>
      <tbody>{user_rows}</tbody>
    </table>

    <h2>4. Saved Wishlist Items (30-Day Window)</h2>
    <table>
      <thead><tr><th>User</th><th>Product Title</th><th>Brand</th><th>Category</th><th>Best Price</th><th>Saved At</th></tr></thead>
      <tbody>{wishlist_rows}</tbody>
    </table>

    <h2>5. Price Drop Alerts (30-Day Window)</h2>
    <table>
      <thead><tr><th>User</th><th>Product Title</th><th>Target Price</th><th>Current Price</th><th>Status</th><th>Created At</th></tr></thead>
      <tbody>{alert_rows}</tbody>
    </table>

    <div class="footer">
      <span>DealLens — AI-Powered Multi-Marketplace Price Comparison & Deal Decision-Support Platform</span>
      <span>Confidential — Admin Portal Only</span>
    </div>
  </div>
</body>
</html>"""


def persist_report_to_disk(payload: dict, csv_content: str, html_content: str) -> dict:
    """Save the generated CSV and HTML monthly reports directly into the device's `backend/reports/` folder."""
    reports_dir = get_reports_directory()
    norm_key = payload["report_meta"]["period_key"]
    now_tag = timezone.now().strftime("%Y-%m")
    file_suffix = f"30Day_{now_tag}" if norm_key == "30d" else norm_key

    csv_filename = f"DealLens_Monthly_Report_{file_suffix}.csv"
    html_filename = f"DealLens_Monthly_Report_{file_suffix}.html"

    csv_path = os.path.join(reports_dir, csv_filename)
    html_path = os.path.join(reports_dir, html_filename)

    with open(csv_path, "w", encoding="utf-8") as f:
        f.write(csv_content)

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    return {
        "saved_directory": reports_dir,
        "saved_csv_filename": csv_filename,
        "saved_csv_path": csv_path,
        "saved_html_filename": html_filename,
        "saved_html_path": html_path,
    }


def list_archived_report_files() -> list:
    """Return metadata for all report files stored in `backend/reports/` on the device."""
    reports_dir = get_reports_directory()
    files = []
    try:
        for fname in os.listdir(reports_dir):
            if not (fname.endswith(".csv") or fname.endswith(".html")):
                continue
            fpath = os.path.join(reports_dir, fname)
            if not os.path.isfile(fpath):
                continue
            stat = os.stat(fpath)
            files.append({
                "filename": fname,
                "format": "CSV (Excel)" if fname.endswith(".csv") else "HTML / Printable PDF",
                "size_kb": round(stat.st_size / 1024.0, 2),
                "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.get_current_timezone()).isoformat(),
                "full_path": fpath,
            })
    except OSError:
        pass
    files.sort(key=lambda x: x["modified_at"], reverse=True)
    return files
