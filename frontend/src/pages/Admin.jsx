import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getProductImage, handleImageError } from "../utils/images";
import PlatformBadge from "../components/PlatformBadge";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Package,
  Users,
  Activity,
  Tag,
  Globe,
  Heart,
  ShieldCheck,
  Search,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck,
  UserX,
  CheckCircle2,
  Menu,
  X,
  LogOut,
  ShoppingBag,
  Eye,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  Bell,
  FileText,
  Download,
  Calendar,
  FolderOpen,
  Printer,
} from "lucide-react";

const NAV_TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "products", label: "Products", icon: Package },
  { key: "users", label: "User Access", icon: Users },
  { key: "analyses", label: "Analyses Log", icon: Activity },
  { key: "offers", label: "Store Offers", icon: Tag },
  { key: "reports", label: "Monthly Reports", icon: FileText },
];

const Admin = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dashboard Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Products
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsCount, setProductsCount] = useState(0);
  const [productsSearch, setProductsSearch] = useState("");
  const [productsSort, setProductsSort] = useState("-id");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [productOffers, setProductOffers] = useState([]);
  const [offersFetching, setOffersFetching] = useState(false);

  // Users & User Activity Inspector (Wishlist + Price Alerts)
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivity, setUserActivity] = useState({ wishlist: [], alerts: [] });
  const [userActivityLoading, setUserActivityLoading] = useState(false);
  const [userActivityFilter, setUserActivityFilter] = useState("all"); // "all" | "wishlist" | "alerts"

  // Analyses Telemetry
  const [analyses, setAnalyses] = useState([]);
  const [analysesLoading, setAnalysesLoading] = useState(false);
  const [analysesPage, setAnalysesPage] = useState(1);
  const [analysesTotal, setAnalysesTotal] = useState(0);
  const [analysesSearch, setAnalysesSearch] = useState("");
  const [analysesSearchInput, setAnalysesSearchInput] = useState("");
  const [analysesPlatformFilter, setAnalysesPlatformFilter] = useState("all");

  // Offers
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersPlatform, setOffersPlatform] = useState("");
  const [offersSort, setOffersSort] = useState("");
  const [platforms, setPlatforms] = useState([]);

  // 30-Day / Monthly Admin Reports
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("30d");
  const [reportDownloading, setReportDownloading] = useState("");

  // Verify staff clearance
  useEffect(() => {
    if (!user) {
      navigate("/admin/login", { replace: true });
      return;
    }
    API.get("/users/me/")
      .then((res) => {
        const fresh = res.data;
        if (!fresh.is_staff && !fresh.is_superuser) {
          navigate("/admin/login", { state: { denied: true }, replace: true });
          return;
        }
        setVerified(true);
        setLoading(false);
      })
      .catch(() => {
        navigate("/admin/login", { replace: true });
      });
  }, [user, navigate]);

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await API.get("/users/admin-stats/");
      setStats(res.data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const params = { page: productsPage, search: productsSearch, sort: productsSort };
      const res = await API.get("/admin/products/", { params });
      const data = res.data;
      if (Array.isArray(data)) {
        setProducts(data);
        setProductsCount(data.length);
      } else {
        setProducts(data.results || []);
        setProductsCount(data.total || data.count || 0);
      }
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [productsPage, productsSearch, productsSort]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await API.get("/users/");
      const data = res.data;
      setUsers(Array.isArray(data) ? data : data.results || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Fetch Analyses with Pagination & Search
  const fetchAnalyses = useCallback(async () => {
    setAnalysesLoading(true);
    try {
      const params = { page: analysesPage, per_page: 15 };
      if (analysesSearch.trim()) params.search = analysesSearch.trim();
      const res = await API.get("/admin/analyses/", { params });
      const data = res.data;
      if (data && data.results) {
        setAnalyses(data.results);
        setAnalysesTotal(data.total || data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setAnalyses(data);
        setAnalysesTotal(data.length);
      } else {
        setAnalyses([]);
        setAnalysesTotal(0);
      }
    } catch {
      setAnalyses([]);
      setAnalysesTotal(0);
    } finally {
      setAnalysesLoading(false);
    }
  }, [analysesPage, analysesSearch]);

  // Fetch Offers
  const fetchOffers = useCallback(async () => {
    setOffersLoading(true);
    try {
      const params = {};
      if (offersPlatform) params.platform = offersPlatform;
      if (offersSort) params.ordering = offersSort;
      const res = await API.get("/admin/offers/", { params });
      const data = res.data;
      setOffers(data.results || (Array.isArray(data) ? data : []));
    } catch {
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, [offersPlatform, offersSort]);

  // Fetch Platforms list
  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await API.get("/admin/platforms/");
      const data = res.data;
      setPlatforms(Array.isArray(data) ? data : data.results || []);
    } catch {
      setPlatforms([]);
    }
  }, []);

  // Fetch 30-Day / Monthly Operational Report
  const fetchMonthlyReport = useCallback(
    async (periodOverride) => {
      const targetPeriod = periodOverride || reportPeriod || "30d";
      setReportLoading(true);
      try {
        const res = await API.get("/users/admin-monthly-report/", {
          params: { period: targetPeriod },
        });
        setReportData(res.data || null);
      } catch {
        toast.error("Failed to generate 30-day admin report.");
        setReportData(null);
      } finally {
        setReportLoading(false);
      }
    },
    [reportPeriod]
  );

  // Download 30-Day Report File to Local Device Files (CSV or HTML)
  const handleDownloadReportFile = async (format = "csv", archivedFilename = "") => {
    const tag = archivedFilename || `${format}_${reportPeriod}`;
    setReportDownloading(tag);
    try {
      const params = archivedFilename
        ? { file: archivedFilename }
        : { period: reportPeriod, export: format };
      const res = await API.get("/users/admin-monthly-report/", {
        params,
        responseType: "blob",
      });

      const defaultName =
        archivedFilename ||
        (format === "html"
          ? reportData?.report_meta?.saved_html_filename || `DealLens_Monthly_Report_${reportPeriod}.html`
          : reportData?.report_meta?.saved_csv_filename || `DealLens_Monthly_Report_${reportPeriod}.csv`);

      const mimeType =
        defaultName.endsWith(".html") ? "text/html;charset=utf-8" : "text/csv;charset=utf-8";
      const blob = new Blob([res.data], { type: mimeType });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", defaultName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Report "${defaultName}" saved to your device files!`);
    } catch {
      toast.error("Failed to download report file.");
    } finally {
      setReportDownloading("");
    }
  };

  // Print / Save 30-Day Report as PDF
  const handlePrintReportPdf = async () => {
    setReportDownloading("pdf");
    try {
      const res = await API.get("/users/admin-monthly-report/", {
        params: { period: reportPeriod, export: "html" },
      });
      const htmlString = typeof res.data === "string" ? res.data : "";
      const printWin = window.open("", "_blank", "width=1080,height=850");
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlString);
        printWin.document.close();
        setTimeout(() => {
          printWin.focus();
          printWin.print();
        }, 350);
      } else {
        toast.error("Popup blocked — please use Download HTML or CSV Report.");
      }
    } catch {
      toast.error("Failed to prepare printable PDF report.");
    } finally {
      setReportDownloading("");
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (!verified) return;
    if (activeTab === "dashboard") fetchStats();
    if (activeTab === "products") fetchProducts();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "analyses") fetchAnalyses();
    if (activeTab === "offers") {
      fetchOffers();
      fetchPlatforms();
    }
    if (activeTab === "reports") fetchMonthlyReport(reportPeriod);
  }, [
    activeTab,
    verified,
    reportPeriod,
    fetchStats,
    fetchProducts,
    fetchUsers,
    fetchAnalyses,
    fetchOffers,
    fetchPlatforms,
    fetchMonthlyReport,
  ]);

  // User RBAC: Promote
  const handlePromote = async (u) => {
    try {
      await API.post(`/users/${u.id}/promote/`, { action: "promote" });
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_staff: true, is_superuser: true } : x))
      );
      toast.success(`${u.username} promoted to Staff Administrator.`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to promote user.");
    }
  };

  // User RBAC: Demote
  const handleDemote = async (u) => {
    try {
      await API.post(`/users/${u.id}/promote/`, { action: "demote" });
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_staff: false, is_superuser: false } : x))
      );
      toast.success(`${u.username} demoted to Customer.`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to demote user.");
    }
  };

  // Inspect User Wishlist & Price Alerts
  const handleInspectUser = async (u, initialFilter = "all") => {
    if (selectedUser?.id === u.id && activeTab === "users" && initialFilter === userActivityFilter) {
      setSelectedUser(null);
      return;
    }
    setSelectedUser(u);
    setUserActivityFilter(initialFilter);
    setUserActivity({ wishlist: [], alerts: [] });
    setUserActivityLoading(true);
    try {
      const res = await API.get(`/users/${u.id}/activity/`);
      const data = res.data || {};
      setUserActivity({
        wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
        alerts: Array.isArray(data.alerts) ? data.alerts : [],
      });
      if (data.user) {
        setSelectedUser((prev) => (prev && prev.id === u.id ? { ...prev, ...data.user } : prev));
      }
    } catch {
      toast.error(`Failed to load wishlist & price alerts for ${u.username}.`);
      setUserActivity({ wishlist: [], alerts: [] });
    } finally {
      setUserActivityLoading(false);
    }
  };

  // Product Deletion
  const handleDeleteProduct = async (id, title) => {
    if (!window.confirm(`Permanently delete product "${title || id}" and all its recorded offers?`)) {
      return;
    }
    try {
      await API.delete(`/admin/products/${id}/`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product deleted successfully.");
    } catch {
      toast.error("Failed to delete product.");
    }
  };

  // Expand product to inspect offers
  const handleViewOffers = async (product) => {
    if (expandedProduct === product.id) {
      setExpandedProduct(null);
      return;
    }
    setExpandedProduct(product.id);
    setProductOffers([]);
    setOffersFetching(true);
    try {
      const res = await API.get(`/admin/products/${product.id}/offers/`);
      const data = res.data;
      setProductOffers(Array.isArray(data) ? data : data.results || []);
    } catch {
      setProductOffers([]);
    } finally {
      setOffersFetching(false);
    }
  };

  // Analyses Telemetry Search Handlers
  const handleAnalysesSearchSubmit = (e) => {
    e.preventDefault();
    setAnalysesPage(1);
    setAnalysesSearch(analysesSearchInput);
  };

  const handleAnalysesSearchClear = () => {
    setAnalysesSearchInput("");
    setAnalysesSearch("");
    setAnalysesPage(1);
  };

  // Derived Analyses Telemetry Data (React 19 pure hook placement)
  const displayedAnalyses = useMemo(() => {
    if (analysesPlatformFilter === "all") return analyses;
    return analyses.filter((a) => {
      const p = (a.platform || a.platform_name || "").toLowerCase();
      return p.includes(analysesPlatformFilter.toLowerCase());
    });
  }, [analyses, analysesPlatformFilter]);

  const analysesStats = useMemo(() => {
    const total = analysesTotal || analyses.length;
    let amazonCount = 0;
    let otherCount = 0;
    const uniqueUsers = new Set();

    analyses.forEach((a) => {
      const p = (a.platform || a.platform_name || "").toLowerCase();
      if (p.includes("amazon")) amazonCount++;
      else otherCount++;
      if (a.user_name) uniqueUsers.add(a.user_name);
    });

    return {
      total,
      amazonCount,
      otherCount,
      uniqueUsersCount: uniqueUsers.size || (total > 0 ? 1 : 0),
    };
  }, [analyses, analysesTotal]);

  if (loading) {
    return (
      <div
        className="page-container"
        style={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        <RefreshCw size={32} className="spinner" style={{ color: "var(--accent-cyan)" }} />
        <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          Authenticating administrative credentials...
        </span>
      </div>
    );
  }

  // Filter users by search term
  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    return (
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      String(u.id).includes(term)
    );
  });

  // Render User Wishlist & Price Alerts Inspector Panel
  const renderUserActivityPanel = (targetUser) => {
    if (!targetUser) return null;
    const wishlistItems = userActivity.wishlist || [];
    const alertItems = userActivity.alerts || [];
    const showWishlist = userActivityFilter === "all" || userActivityFilter === "wishlist";
    const showAlerts = userActivityFilter === "all" || userActivityFilter === "alerts";

    return (
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background: "var(--bg-detail-gradient)",
          borderRadius: "12px",
          border: "1px solid rgba(6, 182, 212, 0.28)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Top Bar: User Info + Filter Tabs + Close */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.85rem",
            paddingBottom: "1rem",
            marginBottom: "1.1rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.95rem",
              }}
            >
              {targetUser.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
                  {targetUser.username}&apos;s Saved Activity
                </span>
                <span className="badge badge-cyan" style={{ fontSize: "0.68rem" }}>
                  UID #{targetUser.id}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {targetUser.email || "No email registered"} • Joined{" "}
                {targetUser.date_joined
                  ? new Date(targetUser.date_joined).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
            {[
              { key: "all", label: `All (${wishlistItems.length + alertItems.length})` },
              { key: "wishlist", label: `Wishlist (${wishlistItems.length})`, icon: Heart, color: "var(--accent-rose)" },
              { key: "alerts", label: `Price Alerts (${alertItems.length})`, icon: Bell, color: "var(--accent-amber)" },
            ].map((t) => {
              const Icon = t.icon;
              const active = userActivityFilter === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserActivityFilter(t.key);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.35rem 0.75rem",
                    borderRadius: 999,
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: active ? "var(--accent-cyan)" : "var(--border-color)",
                    background: active ? "rgba(6, 182, 212, 0.16)" : "var(--bg-secondary)",
                    color: active ? "var(--accent-cyan)" : "var(--text-secondary)",
                  }}
                >
                  {Icon && <Icon size={12} style={{ color: t.color }} />}
                  <span>{t.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(null);
              }}
              className="btn btn-secondary btn-sm"
              style={{ padding: "0.32rem 0.6rem", fontSize: "0.75rem" }}
              title="Close user inspector"
            >
              <X size={14} /> Close
            </button>
          </div>
        </div>

        {userActivityLoading ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-secondary)" }}>
            <RefreshCw size={22} className="spinner" style={{ margin: "0 auto 0.5rem", color: "var(--accent-cyan)" }} />
            <div style={{ fontSize: "0.85rem" }}>
              Loading {targetUser.username}&apos;s wishlist &amp; price alerts...
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                showWishlist && showAlerts
                  ? "repeat(auto-fit, minmax(320px, 1fr))"
                  : "1fr",
              gap: "1.25rem",
            }}
          >
            {/* 1. USER WISHLIST SECTION */}
            {showWishlist && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.85rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Heart size={15} color="var(--accent-rose)" />
                    Saved Wishlist ({wishlistItems.length})
                  </span>
                </div>

                {wishlistItems.length === 0 ? (
                  <div
                    style={{
                      padding: "1.5rem 1rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.82rem",
                      background: "rgba(255, 255, 255, 0.015)",
                      borderRadius: "8px",
                      border: "1px dashed var(--border-subtle)",
                    }}
                  >
                    No products saved in {targetUser.username}&apos;s wishlist.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: 340, overflowY: "auto" }}>
                    {wishlistItems.map((w) => {
                      const p = w.product_details || {};
                      const lowestPrice = p.lowest_price || p.best_offer?.current_price;
                      const bestStore = p.best_offer?.store_name || (p.platforms_available || [])[0];
                      return (
                        <div
                          key={w.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            padding: "0.65rem 0.75rem",
                            background: "var(--bg-card)",
                            borderRadius: "8px",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0, flex: 1 }}>
                            <img
                              src={getProductImage(p.image_url, p)}
                              alt={p.title || "Product"}
                              onError={handleImageError}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "6px",
                                objectFit: "contain",
                                background: "#fff",
                                padding: 2,
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <Link
                                to={`/product/${p.id || w.product}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: "block",
                                  fontWeight: 700,
                                  fontSize: "0.83rem",
                                  color: "var(--text-primary)",
                                  textDecoration: "none",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={p.title}
                              >
                                {p.title || `Product #${w.product}`}
                              </Link>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.2rem", fontSize: "0.73rem", color: "var(--text-muted)" }}>
                                <span>{p.brand || p.category || "Catalog Item"}</span>
                                {bestStore && <PlatformBadge platform={bestStore} size="sm" />}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: "0.86rem",
                                color: "var(--accent-cyan)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {lowestPrice ? `₹${Number(lowestPrice).toLocaleString("en-IN")}` : "—"}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              {w.added_at
                                ? new Date(w.added_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                                : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. USER PRICE ALERTS SECTION */}
            {showAlerts && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.85rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Bell size={15} color="var(--accent-amber)" />
                    Price Drop Alerts ({alertItems.length})
                  </span>
                </div>

                {alertItems.length === 0 ? (
                  <div
                    style={{
                      padding: "1.5rem 1rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.82rem",
                      background: "rgba(255, 255, 255, 0.015)",
                      borderRadius: "8px",
                      border: "1px dashed var(--border-subtle)",
                    }}
                  >
                    No price drop alerts configured by {targetUser.username}.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: 340, overflowY: "auto" }}>
                    {alertItems.map((al) => {
                      const triggered = Boolean(al.is_triggered);
                      return (
                        <div
                          key={al.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            padding: "0.65rem 0.75rem",
                            background: "var(--bg-card)",
                            borderRadius: "8px",
                            border: `1px solid ${triggered ? "rgba(16, 185, 129, 0.35)" : "var(--border-subtle)"}`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0, flex: 1 }}>
                            <img
                              src={getProductImage(al.product_image, {
                                title: al.product_title,
                                brand: al.product_brand,
                                category: al.product_category,
                              })}
                              alt={al.product_title || "Product"}
                              onError={handleImageError}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: "6px",
                                objectFit: "contain",
                                background: "#fff",
                                padding: 2,
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <Link
                                to={`/product/${al.product}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: "block",
                                  fontWeight: 700,
                                  fontSize: "0.83rem",
                                  color: "var(--text-primary)",
                                  textDecoration: "none",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={al.product_title}
                              >
                                {al.product_title || `Product #${al.product}`}
                              </Link>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.2rem", fontSize: "0.73rem" }}>
                                <span style={{ color: "var(--accent-amber)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                  Target: ₹{Number(al.target_price).toLocaleString("en-IN")}
                                </span>
                                {al.current_lowest && (
                                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                    • Now: ₹{Number(al.current_lowest).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            {triggered ? (
                              <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>
                                Target Reached
                              </span>
                            ) : al.active ? (
                              <span className="badge badge-amber" style={{ fontSize: "0.68rem" }}>
                                Monitoring
                              </span>
                            ) : (
                              <span className="badge badge-mono" style={{ fontSize: "0.68rem" }}>
                                Inactive
                              </span>
                            )}
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>
                              {al.created_at
                                ? new Date(al.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                                : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "calc(100vh - 120px)",
        background: "var(--bg-primary)",
        position: "relative",
      }}
    >
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 90,
          }}
        />
      )}

      {/* Modern Sidebar */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 70,
          height: "calc(100vh - 70px)",
          zIndex: 95,
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: sidebarOpen ? "translateX(0)" : undefined,
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: "1.25rem 1.25rem 1rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 26,
                  height: 26,
                  borderRadius: "6px",
                  background: "rgba(6, 182, 212, 0.15)",
                  color: "var(--accent-cyan)",
                }}
              >
                <ShieldCheck size={16} />
              </span>
              <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
                Staff Console
              </span>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                marginTop: "0.35rem",
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--accent-emerald)",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "0.15rem 0.5rem",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent-emerald)",
                  boxShadow: "0 0 6px var(--accent-emerald)",
                }}
              />
              SYSTEM ONLINE
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="mobile-only"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ padding: "0.85rem 0.65rem", display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1 }}>
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setSidebarOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.88rem",
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? "rgba(6, 182, 212, 0.12)" : "transparent",
                  color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                  textAlign: "left",
                  transition: "all 0.18s ease",
                  borderLeft: isActive ? "3px solid var(--accent-cyan)" : "3px solid transparent",
                }}
              >
                <Icon size={18} style={{ color: isActive ? "var(--accent-cyan)" : "var(--text-muted)" }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Staff Operator Identity Footer */}
        <div
          style={{
            padding: "1rem 1.2rem",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-subtle-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.75rem" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.85rem",
                flexShrink: 0,
              }}
            >
              {user?.username?.charAt(0).toUpperCase() || "A"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.username}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {user?.is_superuser ? "Super Admin" : "Staff Member"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              to="/"
              className="btn btn-secondary btn-sm"
              style={{
                flex: 1,
                fontSize: "0.74rem",
                padding: "0.35rem 0.5rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
                textDecoration: "none",
              }}
            >
              <ShoppingBag size={13} />
              Shopper View
            </Link>
            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: "0.74rem",
                padding: "0.35rem 0.5rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-rose)",
              }}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main
        style={{
          flex: 1,
          padding: "2rem 2.5rem",
          overflowY: "auto",
          minWidth: 0,
        }}
      >
        {/* Mobile menu trigger */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }} className="mobile-only">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Menu size={16} />
            Menu
          </button>
          <span style={{ fontWeight: 800, fontSize: "1rem" }}>
            {NAV_TABS.find((t) => t.key === activeTab)?.label}
          </span>
        </div>

        {/* 1. DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)" }}>
                  Platform Telemetry
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0.25rem 0 0" }}>
                  Real-time operational metrics across scraping nodes, user activity, and catalog coverage.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchStats}
                disabled={statsLoading}
                className="btn btn-secondary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <RefreshCw size={14} className={statsLoading ? "spinner" : ""} />
                <span>Sync Metrics</span>
              </button>
            </div>

            {statsLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                <RefreshCw size={24} className="spinner" style={{ margin: "0 auto 0.5rem" }} />
                <div>Fetching live system telemetry...</div>
              </div>
            ) : stats ? (
              <>
                {/* 6 Glowing KPI Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1.25rem",
                    marginBottom: "2rem",
                  }}
                >
                  {[
                    {
                      label: "Indexed Products",
                      value: stats.products ?? 0,
                      icon: Package,
                      color: "var(--accent-cyan)",
                      bg: "rgba(6, 182, 212, 0.12)",
                    },
                    {
                      label: "Live Store Offers",
                      value: stats.offers ?? 0,
                      icon: Tag,
                      color: "var(--accent-emerald)",
                      bg: "rgba(16, 185, 129, 0.12)",
                    },
                    {
                      label: "Registered Users",
                      value: stats.users ?? 0,
                      icon: Users,
                      color: "var(--accent-purple)",
                      bg: "rgba(168, 85, 247, 0.12)",
                    },
                    {
                      label: "Completed Analyses",
                      value: stats.analyses ?? 0,
                      icon: Activity,
                      color: "var(--accent-amber)",
                      bg: "rgba(245, 158, 11, 0.12)",
                    },
                    {
                      label: "Saved Wishlists",
                      value: stats.wishlists ?? 0,
                      icon: Heart,
                      color: "var(--accent-rose)",
                      bg: "rgba(244, 63, 94, 0.12)",
                    },
                    {
                      label: "Active Scraper Nodes",
                      value: stats.platforms ?? 3,
                      icon: Globe,
                      color: "var(--accent-cyan)",
                      bg: "rgba(6, 182, 212, 0.12)",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="card-panel card-glow"
                        style={{
                          padding: "1.25rem 1.4rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "1.1rem",
                          borderRadius: "14px",
                        }}
                      >
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: "12px",
                            background: item.bg,
                            color: item.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={22} />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "var(--text-muted)",
                              marginBottom: "0.2rem",
                            }}
                          >
                            {item.label}
                          </div>
                          <div
                            style={{
                              fontSize: "1.75rem",
                              fontWeight: 800,
                              color: "var(--text-primary)",
                              fontFamily: "var(--font-mono)",
                              lineHeight: 1,
                            }}
                          >
                            {Number(item.value).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sub-panels: Recent Shoppers & System Specs */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
                  {/* Recent Users Card */}
                  <div className="card-panel" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                        Recently Registered Shoppers
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("users")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--accent-cyan)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        View All →
                      </button>
                    </div>
                    <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", margin: "0 0 0.85rem" }}>
                      Click on any user to inspect their Saved Wishlist & Price Drop Alerts.
                    </p>

                    {(stats.recent_users || []).length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>
                        No new user registrations recorded.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {(stats.recent_users || []).slice(0, 5).map((u) => {
                          const isSelected = selectedUser?.id === u.id;
                          return (
                            <div
                              key={u.id}
                              onClick={() => handleInspectUser(u, "all")}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleInspectUser(u, "all");
                                }
                              }}
                              title={`Click to view ${u.username}'s Wishlist & Price Alerts`}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "0.75rem",
                                padding: "0.65rem 0.85rem",
                                background: isSelected ? "rgba(6, 182, 212, 0.1)" : "rgba(255, 255, 255, 0.02)",
                                border: `1px solid ${isSelected ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                                borderRadius: "10px",
                                cursor: "pointer",
                                transition: "all 0.18s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.borderColor = "var(--accent-cyan)";
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.borderColor = "var(--border-subtle)";
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                  <span>{u.username}</span>
                                  <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
                                    Inspect ↗
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {u.email || "No email registered"}
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    padding: "0.18rem 0.5rem",
                                    borderRadius: 999,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    background: "rgba(244, 63, 94, 0.12)",
                                    color: "var(--accent-rose)",
                                    border: "1px solid rgba(244, 63, 94, 0.25)",
                                  }}
                                  title="Saved Wishlist Items"
                                >
                                  <Heart size={11} /> {u.wishlist_count ?? 0}
                                </span>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    padding: "0.18rem 0.5rem",
                                    borderRadius: 999,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    background: "rgba(245, 158, 11, 0.12)",
                                    color: "var(--accent-amber)",
                                    border: "1px solid rgba(245, 158, 11, 0.25)",
                                  }}
                                  title="Price Drop Alerts"
                                >
                                  <Bell size={11} /> {u.alerts_count ?? 0}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "var(--text-muted)",
                                    fontFamily: "var(--font-mono)",
                                  }}
                                >
                                  {new Date(u.date_joined).toLocaleDateString("en-IN", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Operational Architecture Specs */}
                  <div className="card-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--text-primary)" }}>
                      Engine Architecture Status
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.84rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>AI Scoring Formula:</span>
                        <span style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>8-Dimensional Weighted</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Price Weighting:</span>
                        <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>35% Index Low Ratio</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Review Confidence:</span>
                        <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>Bayesian Adjusted</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Scraper Pipeline:</span>
                        <span style={{ color: "var(--accent-emerald)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          <CheckCircle2 size={13} /> Active (Amazon, Flipkart, Croma)
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Token Authentication:</span>
                        <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>JWT + SimpleJWT Bearer</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected User Wishlist & Price Alerts Inspector */}
                {selectedUser && (
                  <div style={{ marginTop: "1.5rem" }}>
                    {renderUserActivityPanel(selectedUser)}
                  </div>
                )}

                {/* 30-Day / Monthly Operational Report Banner (Admin-Only) */}
                <div
                  className="card-panel"
                  style={{
                    marginTop: "1.5rem",
                    padding: "1.35rem 1.5rem",
                    border: "1px solid rgba(6, 182, 212, 0.35)",
                    background:
                      "linear-gradient(135deg, rgba(6, 182, 212, 0.09) 0%, rgba(16, 185, 129, 0.06) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.95rem" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        background: "rgba(6, 182, 212, 0.16)",
                        color: "var(--accent-cyan)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={22} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                          30-Day / Monthly Platform Operational Report
                        </h3>
                        <span className="badge badge-cyan" style={{ fontSize: "0.68rem", textTransform: "uppercase" }}>
                          Admin Exclusive
                        </span>
                      </div>
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        View 30-day shopper registrations, wishlists, price alerts, and marketplace metrics — or download directly to your device files.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("reports")}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.5rem 0.9rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      <Eye size={14} />
                      <span>View 30-Day Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReportFile("csv")}
                      disabled={reportDownloading !== ""}
                      className="btn btn-primary btn-sm"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.5rem 0.95rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      <Download size={14} />
                      <span>
                        {reportDownloading === `csv_${reportPeriod}` ? "Saving..." : "Download CSV to Device"}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: "var(--text-muted)" }}>No operational statistics retrieved.</div>
            )}
          </div>
        )}

        {/* 2. PRODUCTS MANAGEMENT */}
        {activeTab === "products" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)" }}>
                  Catalog Management
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0.25rem 0 0" }}>
                  Inspect scraped products, multi-store offer distributions, and catalog health.
                </p>
              </div>
            </div>

            {/* Filter / Search Bar */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginBottom: "1.25rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative", flex: 1, minWidth: 240, display: "flex", alignItems: "center" }}>
                <Search size={16} style={{ position: "absolute", left: "0.85rem", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder="Search products by title, brand, or SKU..."
                  value={productsSearch}
                  onChange={(e) => {
                    setProductsSearch(e.target.value);
                    setProductsPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem 0.65rem 2.4rem",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              <select
                value={productsSort}
                onChange={(e) => setProductsSort(e.target.value)}
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "10px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="-id">Latest Products First</option>
                <option value="id">Oldest Products First</option>
                <option value="title">Title (A - Z)</option>
                <option value="brand">Brand (A - Z)</option>
                <option value="category">Category (A - Z)</option>
              </select>
            </div>

            {productsLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                <RefreshCw size={24} className="spinner" style={{ margin: "0 auto 0.5rem" }} />
                <div>Loading catalog inventory...</div>
              </div>
            ) : (
              <div className="card-panel" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>ID</th>
                        <th style={{ width: 60 }}>Item</th>
                        <th>Product Details</th>
                        <th>Brand & Category</th>
                        <th>Offers</th>
                        <th>Created</th>
                        <th style={{ textAlign: "right", width: 140 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        const isExpanded = expandedProduct === p.id;
                        return (
                          <React.Fragment key={p.id}>
                            <tr>
                              <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                #{p.id}
                              </td>
                              <td>
                                <img
                                  src={getProductImage(p.image_url)}
                                  alt=""
                                  onError={handleImageError}
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: "8px",
                                    objectFit: "contain",
                                    background: "#ffffff",
                                    padding: "2px",
                                    border: "1px solid var(--border-subtle)",
                                  }}
                                />
                              </td>
                              <td style={{ maxWidth: 300 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: "var(--text-primary)",
                                    fontSize: "0.88rem",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  title={p.title}
                                >
                                  {p.title}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", marginTop: "0.15rem" }}>
                                  Best Price: {p.lowest_price ? `₹${Number(p.lowest_price).toLocaleString("en-IN")}` : "—"}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: "0.84rem", color: "var(--text-primary)", fontWeight: 600 }}>
                                  {p.brand || "—"}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  {p.category || "General"}
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-cyan" style={{ fontFamily: "var(--font-mono)" }}>
                                  {p.offers_count ?? p.num_offers ?? "0"} offers
                                </span>
                              </td>
                              <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleViewOffers(p)}
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.3rem 0.6rem",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    <span>{isExpanded ? "Hide" : "Offers"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(p.id, p.title)}
                                    className="btn btn-sm"
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.3rem 0.55rem",
                                      background: "rgba(244, 63, 94, 0.12)",
                                      color: "var(--accent-rose)",
                                      border: "1px solid rgba(244, 63, 94, 0.25)",
                                    }}
                                    title="Delete product"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Accordion: Live Multi-Store Offers for Product */}
                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={7}
                                  style={{
                                    padding: "1rem 1.25rem",
                                    background: "var(--bg-subtle-surface)",
                                    borderBottom: "1px solid var(--border-color)",
                                  }}
                                >
                                  <div style={{ fontSize: "0.85rem" }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "0.75rem",
                                      }}
                                    >
                                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                        Registered Store Offers ({productOffers.length})
                                      </span>
                                      <Link
                                        to={`/product/${p.id}`}
                                        target="_blank"
                                        style={{
                                          fontSize: "0.78rem",
                                          color: "var(--accent-cyan)",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "0.3rem",
                                          textDecoration: "none",
                                        }}
                                      >
                                        View Public Product Page <ExternalLink size={12} />
                                      </Link>
                                    </div>

                                    {offersFetching ? (
                                      <div style={{ padding: "1rem", color: "var(--text-muted)" }}>
                                        Loading offers from database...
                                      </div>
                                    ) : productOffers.length > 0 ? (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        {productOffers.map((o, idx) => (
                                          <div
                                            key={idx}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              padding: "0.6rem 0.85rem",
                                              background: "var(--bg-secondary)",
                                              borderRadius: "8px",
                                              border: "1px solid var(--border-subtle)",
                                              fontSize: "0.82rem",
                                              flexWrap: "wrap",
                                              gap: "0.5rem",
                                            }}
                                          >
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                              <PlatformBadge platform={o.store_name || o.platform_name || o.platform} />
                                              <span
                                                style={{
                                                  fontWeight: 700,
                                                  color: "var(--text-primary)",
                                                  fontFamily: "var(--font-mono)",
                                                }}
                                              >
                                                ₹{Number(o.current_price || o.price).toLocaleString("en-IN")}
                                              </span>
                                              {(o.original_price > 0 || o.mrp) && (
                                                <span
                                                  style={{
                                                    color: "var(--text-muted)",
                                                    textDecoration: "line-through",
                                                    fontFamily: "var(--font-mono)",
                                                  }}
                                                >
                                                  ₹{Number(o.original_price || o.mrp).toLocaleString("en-IN")}
                                                </span>
                                              )}
                                              {o.rating && (
                                                <span style={{ color: "var(--accent-amber)" }}>
                                                  ★ {o.rating}
                                                </span>
                                              )}
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                              {o.in_stock === false ? (
                                                <span style={{ color: "var(--accent-rose)", fontWeight: 600 }}>
                                                  Out of Stock
                                                </span>
                                              ) : (
                                                <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
                                                  In Stock
                                                </span>
                                              )}
                                              {o.url && (
                                                <a
                                                  href={o.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  style={{
                                                    color: "var(--accent-cyan)",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "0.25rem",
                                                    textDecoration: "none",
                                                  }}
                                                >
                                                  Store Link <ExternalLink size={11} />
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div style={{ color: "var(--text-muted)", padding: "0.5rem 0" }}>
                                        No multi-store offers recorded for this item.
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {products.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                            No products found matching query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.85rem 1.25rem",
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    Showing {products.length} of {productsCount} items
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={productsPage <= 1}
                      onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                      className="btn btn-secondary btn-sm"
                      style={{ opacity: productsPage <= 1 ? 0.4 : 1 }}
                    >
                      Previous
                    </button>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600, padding: "0 0.4rem" }}>
                      Page {productsPage}
                    </span>
                    <button
                      type="button"
                      disabled={products.length < 20}
                      onClick={() => setProductsPage((p) => p + 1)}
                      className="btn btn-secondary btn-sm"
                      style={{ opacity: products.length < 20 ? 0.4 : 1 }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. USER ACCESS & RBAC MANAGEMENT */}
        {activeTab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)" }}>
                  Role-Based User Access & Shopper Activity
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0.25rem 0 0" }}>
                  Click any user row to inspect their saved wishlist and price drop alerts, or manage RBAC clearance.
                </p>
              </div>

              {/* User Search */}
              <div style={{ position: "relative", minWidth: 260 }}>
                <Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Filter users by username or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem 0.6rem 2.4rem",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {usersLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                <RefreshCw size={24} className="spinner" style={{ margin: "0 auto 0.5rem" }} />
                <div>Fetching user database...</div>
              </div>
            ) : (
              <div className="card-panel" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>UID</th>
                        <th>User Profile</th>
                        <th>Email Contact</th>
                        <th>Wishlist & Alerts</th>
                        <th>Access Clearance</th>
                        <th>Member Since</th>
                        <th style={{ textAlign: "right", width: 210 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isSelf = user?.id === u.id;
                        const isSelected = selectedUser?.id === u.id;
                        return (
                          <React.Fragment key={u.id}>
                            <tr
                              onClick={() => handleInspectUser(u, "all")}
                              title={`Click to view ${u.username}'s Wishlist & Price Alerts`}
                              style={{
                                cursor: "pointer",
                                background: isSelected ? "rgba(6, 182, 212, 0.08)" : undefined,
                                transition: "background 0.15s ease",
                              }}
                            >
                              <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                #{u.id}
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                  <div
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      background: u.is_staff ? "rgba(6, 182, 212, 0.2)" : "var(--bg-subtle-surface)",
                                      border: u.is_staff ? "none" : "1px solid var(--border-subtle)",
                                      color: u.is_staff ? "var(--accent-cyan)" : "var(--text-secondary)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 700,
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    {u.username?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.88rem" }}>
                                      {u.username}
                                    </span>
                                    {isSelf && (
                                      <span
                                        style={{
                                          marginLeft: "0.4rem",
                                          fontSize: "0.7rem",
                                          color: "var(--accent-cyan)",
                                          fontWeight: 600,
                                        }}
                                      >
                                        (You)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                {u.email || "—"}
                              </td>
                              <td>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isSelected && userActivityFilter === "wishlist") {
                                        handleInspectUser(u, "all");
                                      } else if (isSelected) {
                                        setUserActivityFilter("wishlist");
                                      } else {
                                        handleInspectUser(u, "wishlist");
                                      }
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.28rem",
                                      fontSize: "0.73rem",
                                      fontWeight: 700,
                                      padding: "0.22rem 0.55rem",
                                      borderRadius: "999px",
                                      cursor: "pointer",
                                      background:
                                        (u.wishlist_count ?? 0) > 0
                                          ? "rgba(244, 63, 94, 0.14)"
                                          : "var(--bg-subtle-surface)",
                                      color:
                                        (u.wishlist_count ?? 0) > 0
                                          ? "var(--accent-rose)"
                                          : "var(--text-muted)",
                                      border: "1px solid rgba(244, 63, 94, 0.25)",
                                    }}
                                    title="View user's saved wishlist"
                                  >
                                    <Heart size={11} />
                                    <span>{u.wishlist_count ?? 0} Wishlist</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isSelected && userActivityFilter === "alerts") {
                                        handleInspectUser(u, "all");
                                      } else if (isSelected) {
                                        setUserActivityFilter("alerts");
                                      } else {
                                        handleInspectUser(u, "alerts");
                                      }
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.28rem",
                                      fontSize: "0.73rem",
                                      fontWeight: 700,
                                      padding: "0.22rem 0.55rem",
                                      borderRadius: "999px",
                                      cursor: "pointer",
                                      background:
                                        (u.alerts_count ?? 0) > 0
                                          ? "rgba(245, 158, 11, 0.14)"
                                          : "var(--bg-subtle-surface)",
                                      color:
                                        (u.alerts_count ?? 0) > 0
                                          ? "var(--accent-amber)"
                                          : "var(--text-muted)",
                                      border: "1px solid rgba(245, 158, 11, 0.28)",
                                    }}
                                    title="View user's price drop alerts"
                                  >
                                    <Bell size={11} />
                                    <span>{u.alerts_count ?? 0} Alerts</span>
                                  </button>
                                </div>
                              </td>
                              <td>
                                {u.is_superuser ? (
                                  <span
                                    className="badge badge-purple"
                                    style={{ fontSize: "0.72rem", textTransform: "uppercase" }}
                                  >
                                    Superuser
                                  </span>
                                ) : u.is_staff ? (
                                  <span
                                    className="badge badge-cyan"
                                    style={{ fontSize: "0.72rem", textTransform: "uppercase" }}
                                  >
                                    Staff Operator
                                  </span>
                                ) : (
                                  <span
                                    className="badge"
                                    style={{
                                      fontSize: "0.72rem",
                                      background: "var(--bg-subtle-surface)",
                                      border: "1px solid var(--border-subtle)",
                                      color: "var(--text-muted)",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    Customer
                                  </span>
                                )}
                              </td>
                              <td style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                {new Date(u.date_joined).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInspectUser(u, "all");
                                    }}
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                      fontSize: "0.74rem",
                                      padding: "0.3rem 0.6rem",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    {isSelected ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    <span>{isSelected ? "Hide" : "Activity"}</span>
                                  </button>

                                  {isSelf ? (
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", padding: "0 0.25rem" }}>
                                      You
                                    </span>
                                  ) : !u.is_staff ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePromote(u);
                                      }}
                                      className="btn btn-sm"
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "0.3rem 0.65rem",
                                        background: "rgba(16, 185, 129, 0.12)",
                                        color: "var(--accent-emerald)",
                                        border: "1px solid rgba(16, 185, 129, 0.25)",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.3rem",
                                      }}
                                    >
                                      <UserCheck size={13} />
                                      <span>Promote</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDemote(u);
                                      }}
                                      className="btn btn-sm"
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "0.3rem 0.65rem",
                                        background: "rgba(244, 63, 94, 0.12)",
                                        color: "var(--accent-rose)",
                                        border: "1px solid rgba(244, 63, 94, 0.25)",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.3rem",
                                      }}
                                    >
                                      <UserX size={13} />
                                      <span>Demote</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Accordion: Selected User's Saved Wishlist & Price Drop Alerts */}
                            {isSelected && (
                              <tr>
                                <td
                                  colSpan={7}
                                  style={{
                                    padding: "1rem 1.25rem",
                                    background: "var(--bg-subtle-surface)",
                                    borderBottom: "1px solid var(--border-color)",
                                  }}
                                >
                                  {renderUserActivityPanel(u)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                            No users found matching query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. ANALYSES & SCRAPING LOG */}
        {activeTab === "analyses" && (
          <div>
            {/* Header & Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
                  <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)" }}>
                    Analyses Telemetry Log
                  </h1>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "var(--accent-emerald)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-emerald)", display: "inline-block" }} />
                    Live Scraping Feed
                  </span>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: 0 }}>
                  Real-time audit log of product URLs submitted for scraping, cross-matching, and deal scoring.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={fetchAnalyses}
                  disabled={analysesLoading}
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.5rem 0.9rem" }}
                >
                  <RefreshCw size={14} className={analysesLoading ? "spinner" : ""} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div className="card-panel" style={{ padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "10px",
                    background: "rgba(6, 182, 212, 0.12)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-cyan)",
                  }}
                >
                  <Activity size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {analysesStats.total}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Recorded Scrapes</div>
                </div>
              </div>

              <div className="card-panel" style={{ padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-amber)",
                  }}
                >
                  <Globe size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {analysesStats.amazonCount}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>Amazon Market Ingestion</div>
                </div>
              </div>

              <div className="card-panel" style={{ padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "10px",
                    background: "rgba(139, 92, 246, 0.12)",
                    border: "1px solid rgba(139, 92, 246, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-purple)",
                  }}
                >
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {analysesStats.otherCount}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>Cross-Market Alternatives</div>
                </div>
              </div>

              <div className="card-panel" style={{ padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-emerald)",
                  }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {analysesStats.uniqueUsersCount}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>Unique Shoppers / Guests</div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div
              className="card-panel"
              style={{
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <form
                onSubmit={handleAnalysesSearchSubmit}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flex: "1 1 300px",
                  maxWidth: 500,
                  position: "relative",
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.85rem",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by product title, store URL, or user..."
                  value={analysesSearchInput}
                  onChange={(e) => setAnalysesSearchInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 2.2rem 0.55rem 2.4rem",
                    borderRadius: "8px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.86rem",
                    outline: "none",
                  }}
                />
                {analysesSearchInput && (
                  <button
                    type="button"
                    onClick={handleAnalysesSearchClear}
                    style={{
                      position: "absolute",
                      right: "5.5rem",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: "0.2rem",
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "0.5rem 0.85rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                >
                  Search
                </button>
              </form>

              {/* Platform Filter Tabs */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginRight: "0.25rem", fontWeight: 600 }}>
                  <Filter size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} /> Filter:
                </span>
                {["all", "Amazon", "Flipkart", "Croma"].map((platform) => {
                  const isActive = analysesPlatformFilter.toLowerCase() === platform.toLowerCase();
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setAnalysesPlatformFilter(platform)}
                      style={{
                        padding: "0.3rem 0.7rem",
                        borderRadius: "999px",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        border: "1px solid",
                        borderColor: isActive ? "var(--accent-cyan)" : "var(--border-color)",
                        background: isActive ? "rgba(6, 182, 212, 0.15)" : "transparent",
                        color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {platform === "all" ? "All Platforms" : platform}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Telemetry Data Table */}
            {analysesLoading ? (
              <div className="card-panel" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-secondary)" }}>
                <RefreshCw size={28} className="spinner" style={{ margin: "0 auto 0.75rem", color: "var(--accent-cyan)" }} />
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.95rem" }}>Synchronizing Scraping Telemetry...</div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Reading real-time analysis pipeline database</div>
              </div>
            ) : (
              <div className="card-panel" style={{ padding: 0, overflow: "hidden", borderRadius: "14px" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle-surface)", borderBottom: "1px solid var(--border-color)" }}>
                        <th style={{ width: 65, padding: "0.85rem 1rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                          ID
                        </th>
                        <th style={{ minWidth: 280, padding: "0.85rem 1rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                          Product Extracted
                        </th>
                        <th style={{ minWidth: 160, padding: "0.85rem 1rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                          Market Origin
                        </th>
                        <th style={{ minWidth: 140, padding: "0.85rem 1rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                          Initiated By
                        </th>
                        <th style={{ minWidth: 120, padding: "0.85rem 1rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                          Timestamp
                        </th>
                        <th style={{ width: 160, textAlign: "right", padding: "0.85rem 1.25rem", fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedAnalyses.map((a) => {
                        const isGuest = !a.user_name || a.user_name.includes("-") || a.user_name.startsWith("guest_");
                        const cleanGuestId = a.user_name ? a.user_name.replace("guest_", "").slice(0, 8) : "anon";
                        const dateObj = a.analyzed_at ? new Date(a.analyzed_at) : null;
                        const dateStr = dateObj ? dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "—";
                        const timeStr = dateObj ? dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

                        return (
                          <tr
                            key={a.id}
                            style={{
                              borderBottom: "1px solid var(--border-subtle)",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            {/* ID */}
                            <td style={{ padding: "0.85rem 1rem", fontFamily: "var(--font-mono)", color: "var(--accent-cyan)", fontSize: "0.82rem", fontWeight: 700 }}>
                              #{a.id}
                            </td>

                            {/* Associated Product */}
                            <td style={{ padding: "0.85rem 1rem", maxWidth: 360 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "8px",
                                    background: "rgba(6, 182, 212, 0.1)",
                                    border: "1px solid rgba(6, 182, 212, 0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--accent-cyan)",
                                    flexShrink: 0,
                                    marginTop: "2px",
                                  }}
                                >
                                  <ShoppingBag size={15} />
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <Link
                                    to={`/analysis/${a.id}`}
                                    style={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      fontWeight: 700,
                                      fontSize: "0.88rem",
                                      color: "var(--text-primary)",
                                      textDecoration: "none",
                                      lineHeight: 1.35,
                                    }}
                                    title={a.product_title || a.product || "View Analysis"}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-cyan)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                                  >
                                    {a.product_title || a.product || "Extracted Marketplace Product"}
                                  </Link>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.25rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                    <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>● Decision Ready</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Store Origin & Link */}
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "flex-start" }}>
                                <PlatformBadge platform={a.platform || a.platform_name || "Amazon"} size="sm" />
                                {a.url && (
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                      color: "var(--text-muted)",
                                      fontSize: "0.74rem",
                                      textDecoration: "none",
                                      maxWidth: 190,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={a.url}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-cyan)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                                  >
                                    <ExternalLink size={11} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                                  </a>
                                )}
                              </div>
                            </td>

                            {/* Initiated By */}
                            <td style={{ padding: "0.85rem 1rem" }}>
                              {isGuest ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    background: "var(--bg-subtle-surface)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "6px",
                                    padding: "0.25rem 0.55rem",
                                    fontSize: "0.76rem",
                                    fontFamily: "var(--font-mono)",
                                    color: "var(--text-secondary)",
                                  }}
                                  title={`Guest Session: ${a.user_name || "Unknown"}`}
                                >
                                  <Users size={12} color="var(--text-muted)" />
                                  <span>Guest #{cleanGuestId}</span>
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    background: "rgba(6, 182, 212, 0.1)",
                                    border: "1px solid rgba(6, 182, 212, 0.25)",
                                    borderRadius: "6px",
                                    padding: "0.25rem 0.55rem",
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    color: "var(--accent-cyan)",
                                  }}
                                >
                                  <span>👤 {a.user_name}</span>
                                </span>
                              )}
                            </td>

                            {/* Timestamp */}
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>
                                {dateStr}
                              </div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1px" }}>
                                {timeStr}
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end" }}>
                                <Link
                                  to={`/analysis/${a.id}`}
                                  className="btn btn-secondary btn-sm"
                                  style={{
                                    padding: "0.35rem 0.65rem",
                                    fontSize: "0.76rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    fontWeight: 600,
                                  }}
                                  title="Inspect Full AI Deal Breakdown"
                                >
                                  <Eye size={12} />
                                  <span>Analysis</span>
                                </Link>
                                <Link
                                  to={`/report/${a.id}`}
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    padding: "0.35rem 0.65rem",
                                    fontSize: "0.76rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    fontWeight: 700,
                                  }}
                                  title="View Multi-Store Decision Report"
                                >
                                  <BarChart3 size={12} />
                                  <span>Report</span>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {displayedAnalyses.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)" }}>
                            <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>🔍</div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                              No matching telemetry records found
                            </div>
                            <div style={{ fontSize: "0.82rem" }}>
                              Try clearing your search query or switching to All Platforms
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with Pagination */}
                <div
                  style={{
                    padding: "0.85rem 1.25rem",
                    borderTop: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(255, 255, 255, 0.01)",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    Showing <strong style={{ color: "var(--text-primary)" }}>{displayedAnalyses.length}</strong> records
                    {analysesTotal > 0 && (
                      <span> of <strong style={{ color: "var(--text-primary)" }}>{analysesTotal}</strong> total</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      type="button"
                      disabled={analysesPage <= 1 || analysesLoading}
                      onClick={() => setAnalysesPage((prev) => Math.max(1, prev - 1))}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.78rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        opacity: analysesPage <= 1 ? 0.4 : 1,
                        cursor: analysesPage <= 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      <ChevronLeft size={13} />
                      <span>Previous</span>
                    </button>

                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontFamily: "var(--font-mono)",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "6px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                    >
                      Page {analysesPage}
                    </span>

                    <button
                      type="button"
                      disabled={analyses.length < 15 || analysesLoading}
                      onClick={() => setAnalysesPage((prev) => prev + 1)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.78rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        opacity: analyses.length < 15 ? 0.4 : 1,
                        cursor: analyses.length < 15 ? "not-allowed" : "pointer",
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. MULTI-STORE OFFERS DIRECTORY */}
        {activeTab === "offers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)" }}>
                  Multi-Store Offers Directory
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0.25rem 0 0" }}>
                  Live retail prices scraped from Amazon, Flipkart, and Croma.
                </p>
              </div>
            </div>

            {/* Platform & Ordering Controls */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={offersPlatform}
                onChange={(e) => setOffersPlatform(e.target.value)}
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "10px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">All Marketplaces</option>
                {platforms.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>

              <select
                value={offersSort}
                onChange={(e) => setOffersSort(e.target.value)}
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "10px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">Default Ordering</option>
                <option value="price">Price: Low to High</option>
                <option value="-price">Price: High to Low</option>
                <option value="-rating">Rating: Highest First</option>
                <option value="rating">Rating: Lowest First</option>
              </select>
            </div>

            {offersLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                <RefreshCw size={24} className="spinner" style={{ margin: "0 auto 0.5rem" }} />
                <div>Fetching live store offers...</div>
              </div>
            ) : (
              <div className="card-panel" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>ID</th>
                        <th>Target Product</th>
                        <th>Marketplace</th>
                        <th>Live Price</th>
                        <th>MRP</th>
                        <th>Rating</th>
                        <th style={{ textAlign: "right" }}>Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((o) => (
                        <tr key={o.id}>
                          <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            #{o.id}
                          </td>
                          <td style={{ maxWidth: 260 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                fontSize: "0.85rem",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={o.product_title || o.product}
                            >
                              {o.product_title || o.product || "—"}
                            </div>
                          </td>
                          <td>
                            <PlatformBadge platform={o.store_name || o.platform_name || o.platform} />
                          </td>
                          <td>
                            <span
                              style={{
                                fontWeight: 800,
                                color: "var(--accent-cyan)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.92rem",
                              }}
                            >
                              ₹{Number(o.current_price || o.price).toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-muted)", textDecoration: "line-through", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                            {o.original_price > 0
                              ? `₹${Number(o.original_price).toLocaleString("en-IN")}`
                              : o.mrp
                              ? `₹${Number(o.mrp).toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td>
                            {o.rating ? (
                              <span style={{ color: "var(--accent-amber)", fontWeight: 600, fontSize: "0.85rem" }}>
                                ★ {o.rating}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {o.in_stock === false ? (
                              <span className="badge badge-rose" style={{ fontSize: "0.72rem" }}>
                                Out of Stock
                              </span>
                            ) : (
                              <span className="badge badge-emerald" style={{ fontSize: "0.72rem" }}>
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {offers.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                            No store offers match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. 30-DAY / MONTHLY OPERATIONAL REPORTS (ADMIN ONLY) */}
        {activeTab === "reports" && (
          <div>
            {/* Header & Period / Download Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.35rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)" }}>
                    30-Day / Monthly Operational Reports
                  </h1>
                  <span className="badge badge-cyan" style={{ fontSize: "0.7rem", textTransform: "uppercase" }}>
                    Admin Exclusive
                  </span>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0.3rem 0 0" }}>
                  Every 30-day cycle report is generated exclusively for administrators and stored in your device files.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                {/* Period Selector */}
                <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                  <Calendar
                    size={15}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      color: "var(--accent-cyan)",
                      pointerEvents: "none",
                    }}
                  />
                  <select
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    style={{
                      padding: "0.55rem 0.85rem 0.55rem 2.25rem",
                      borderRadius: "10px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {(reportData?.available_periods || [
                      { key: "30d", label: "Rolling Last 30 Days" },
                    ]).map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                    <option value="all">All-Time Cumulative Summary</option>
                  </select>
                </div>

                {/* Download CSV (Excel) */}
                <button
                  type="button"
                  onClick={() => handleDownloadReportFile("csv")}
                  disabled={reportDownloading !== ""}
                  className="btn btn-primary btn-sm"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 0.95rem",
                    fontSize: "0.82rem",
                  }}
                >
                  <Download size={14} />
                  <span>
                    {reportDownloading === `csv_${reportPeriod}`
                      ? "Saving CSV..."
                      : "Download CSV (Excel)"}
                  </span>
                </button>

                {/* Download HTML Report File */}
                <button
                  type="button"
                  onClick={() => handleDownloadReportFile("html")}
                  disabled={reportDownloading !== ""}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 0.9rem",
                    fontSize: "0.82rem",
                  }}
                >
                  <FileText size={14} />
                  <span>
                    {reportDownloading === `html_${reportPeriod}`
                      ? "Saving HTML..."
                      : "Download HTML Report"}
                  </span>
                </button>

                {/* Print / Save as PDF */}
                <button
                  type="button"
                  onClick={handlePrintReportPdf}
                  disabled={reportDownloading !== ""}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 0.9rem",
                    fontSize: "0.82rem",
                  }}
                >
                  <Printer size={14} />
                  <span>Print / Save PDF</span>
                </button>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={() => fetchMonthlyReport(reportPeriod)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "0.55rem 0.7rem" }}
                  title="Regenerate & sync report to device files"
                >
                  <RefreshCw size={14} className={reportLoading ? "spinner" : ""} />
                </button>
              </div>
            </div>

            {reportLoading ? (
              <div style={{ textAlign: "center", padding: "3.5rem", color: "var(--text-secondary)" }}>
                <RefreshCw size={26} className="spinner" style={{ margin: "0 auto 0.6rem" }} />
                <div>Compiling 30-day operational report & syncing to device files...</div>
              </div>
            ) : reportData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Device Storage & Report Metadata Card */}
                <div
                  className="card-panel"
                  style={{
                    padding: "1.15rem 1.35rem",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    background: "rgba(16, 185, 129, 0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "10px",
                        background: "rgba(16, 185, 129, 0.16)",
                        color: "var(--accent-emerald)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "0.1rem",
                      }}
                    >
                      <FolderOpen size={19} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.92rem" }}>
                          {reportData.report_meta?.period_label}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.73rem",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "6px",
                            background: "rgba(6, 182, 212, 0.12)",
                            color: "var(--accent-cyan)",
                            fontWeight: 700,
                          }}
                        >
                          {reportData.report_meta?.report_id}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.79rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                        Stored on Device Folder:{" "}
                        <code
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--accent-emerald)",
                            background: "var(--bg-subtle-surface)",
                            border: "1px solid var(--border-subtle)",
                            padding: "0.12rem 0.45rem",
                            borderRadius: "5px",
                            fontSize: "0.75rem",
                          }}
                        >
                          {reportData.report_meta?.saved_directory}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.77rem", color: "var(--text-muted)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    <div>
                      Generated:{" "}
                      {reportData.report_meta?.generated_at
                        ? new Date(reportData.report_meta.generated_at).toLocaleString("en-IN")
                        : "—"}
                    </div>
                    <div style={{ marginTop: "0.2rem", color: "var(--text-secondary)" }}>
                      Active File: <strong>{reportData.report_meta?.saved_csv_filename}</strong>
                    </div>
                  </div>
                </div>

                {/* 1. 30-Day Executive KPI Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {[
                    {
                      label: "New Users (30d)",
                      val: reportData.summary?.period?.new_users ?? 0,
                      sub: `Cumulative Users: ${reportData.summary?.cumulative?.total_users ?? 0}`,
                      color: "var(--accent-cyan)",
                      icon: Users,
                    },
                    {
                      label: "Products Added (30d)",
                      val: reportData.summary?.period?.new_products ?? 0,
                      sub: `Total Catalog: ${reportData.summary?.cumulative?.total_products ?? 0}`,
                      color: "var(--accent-emerald)",
                      icon: Package,
                    },
                    {
                      label: "Wishlist Saves (30d)",
                      val: reportData.summary?.period?.wishlists_added ?? 0,
                      sub: `Total Wishlists: ${reportData.summary?.cumulative?.total_wishlists ?? 0}`,
                      color: "var(--accent-rose)",
                      icon: Heart,
                    },
                    {
                      label: "Price Alerts (30d)",
                      val: reportData.summary?.period?.alerts_created ?? 0,
                      sub: `Target Met: ${reportData.summary?.period?.alerts_triggered ?? 0} | Total: ${reportData.summary?.cumulative?.total_alerts ?? 0}`,
                      color: "var(--accent-amber)",
                      icon: Bell,
                    },
                    {
                      label: "URL Analyses (30d)",
                      val: reportData.summary?.period?.analyses_total ?? 0,
                      sub: `Completed: ${reportData.summary?.period?.analyses_completed ?? 0} | Total: ${reportData.summary?.cumulative?.total_analyses ?? 0}`,
                      color: "var(--accent-purple)",
                      icon: Activity,
                    },
                    {
                      label: "Store Offers Updated",
                      val: reportData.summary?.period?.new_offers ?? 0,
                      sub: `Total Store Offers: ${reportData.summary?.cumulative?.total_offers ?? 0}`,
                      color: "var(--accent-cyan)",
                      icon: Tag,
                    },
                  ].map((item, idx) => {
                    const IconComp = item.icon;
                    return (
                      <div key={idx} className="card-panel" style={{ padding: "1.15rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.55rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            {item.label}
                          </span>
                          <IconComp size={16} style={{ color: item.color }} />
                        </div>
                        <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                          {item.val}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                          {item.sub}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. On-Device Saved Report Files Archive (`backend/reports/`) */}
                <div className="card-panel" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <FolderOpen size={17} style={{ color: "var(--accent-cyan)" }} />
                        Saved 30-Day Report Files on This Device
                      </h3>
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        Files automatically written to local device disk and available for instant browser download.
                      </p>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th>Report Filename</th>
                          <th>Format</th>
                          <th>Size</th>
                          <th>Device File Path</th>
                          <th>Last Updated</th>
                          <th style={{ textAlign: "right" }}>Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.archived_files || []).map((f, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                              {f.filename}
                            </td>
                            <td>
                              <span
                                className={f.filename.endsWith(".csv") ? "badge badge-emerald" : "badge badge-cyan"}
                                style={{ fontSize: "0.7rem" }}
                              >
                                {f.format}
                              </span>
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                              {f.size_kb} KB
                            </td>
                            <td
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.74rem",
                                color: "var(--text-muted)",
                                maxWidth: 320,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={f.full_path}
                            >
                              {f.full_path}
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                              {f.modified_at ? new Date(f.modified_at).toLocaleString("en-IN") : "—"}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => handleDownloadReportFile("", f.filename)}
                                disabled={reportDownloading === f.filename}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  fontSize: "0.74rem",
                                  padding: "0.28rem 0.65rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                }}
                              >
                                <Download size={12} />
                                <span>{reportDownloading === f.filename ? "Saving..." : "Save to Device"}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Marketplace Breakdown & Category Distribution (2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem" }}>
                  {/* Marketplace Store Breakdown */}
                  <div className="card-panel" style={{ padding: "1.25rem" }}>
                    <h3 style={{ margin: "0 0 0.85rem", fontSize: "0.98rem", fontWeight: 800 }}>
                      Multi-Marketplace Store Breakdown
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th>Store</th>
                            <th>Offers</th>
                            <th>In Stock</th>
                            <th>Avg Price</th>
                            <th>Lowest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(reportData.marketplace_breakdown || []).map((m, idx) => (
                            <tr key={idx}>
                              <td>
                                <PlatformBadge platform={m.store_name} />
                              </td>
                              <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{m.offers_count}</td>
                              <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>{m.in_stock_count}</td>
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                                ₹{Number(m.avg_price || 0).toLocaleString("en-IN")}
                              </td>
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                                ₹{Number(m.min_price || 0).toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Category Distribution */}
                  <div className="card-panel" style={{ padding: "1.25rem" }}>
                    <h3 style={{ margin: "0 0 0.85rem", fontSize: "0.98rem", fontWeight: 800 }}>
                      Catalog Category Distribution
                    </h3>
                    <div style={{ overflowX: "auto" }}>
                      <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Products Tracked</th>
                            <th>Store Offers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(reportData.category_breakdown || []).map((c, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{c.category}</td>
                              <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent-cyan)", fontWeight: 700 }}>
                                {c.products_count}
                              </td>
                              <td style={{ fontFamily: "var(--font-mono)" }}>{c.offers_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 4. Shopper Wishlist, Price Alerts & Analyses Summary Table */}
                <div className="card-panel" style={{ padding: "1.25rem" }}>
                  <h3 style={{ margin: "0 0 0.85rem", fontSize: "0.98rem", fontWeight: 800 }}>
                    Shopper Accounts — Wishlist, Price Alerts & Analyses Breakdown
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th>UID</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Wishlist (30d / Total)</th>
                          <th>Price Alerts (30d / Total)</th>
                          <th>Analyses (30d / Total)</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.user_activity || []).map((u) => (
                          <tr key={u.id}>
                            <td style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                              #{u.id}
                            </td>
                            <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{u.username}</td>
                            <td style={{ color: "var(--text-secondary)", fontSize: "0.83rem" }}>{u.email}</td>
                            <td>
                              <span
                                className={
                                  u.role === "Superuser"
                                    ? "badge badge-purple"
                                    : u.role === "Staff Operator"
                                    ? "badge badge-cyan"
                                    : "badge"
                                }
                                style={{ fontSize: "0.7rem" }}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent-rose)", fontWeight: 700 }}>
                              {u.period_wishlists} in 30d / {u.wishlist_count} total
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent-amber)", fontWeight: 700 }}>
                              {u.period_alerts} in 30d / {u.alerts_count} total
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--accent-cyan)" }}>
                              {u.period_analyses} in 30d / {u.analyses_count} total
                            </td>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                              {u.date_joined ? new Date(u.date_joined).toLocaleDateString("en-IN") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>
                Unable to load 30-day report data.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
