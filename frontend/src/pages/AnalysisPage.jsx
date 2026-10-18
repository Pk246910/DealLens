import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Heart, Bell, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import AnalysisResult from "../components/AnalysisResult";
import ShareButton from "../components/ShareButton";
import toast from "react-hot-toast";
import { SkeletonAnalysisPage } from "../components/Skeleton";

const AnalysisPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistId, setWishlistId] = useState(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [targetPrice, setTargetPrice] = useState("");
  const [alertSaving, setAlertSaving] = useState(false);

  const analysisData = analysis?.analysis_result || analysis;
  const product = analysisData?.product;

  useEffect(() => {
    if (location.state?.analysis) {
      setAnalysis(location.state.analysis);
      setLoading(false);
      return;
    }

    setLoading(true);
    API.get(`/analyses/${id}/`)
      .then((res) => {
        setAnalysis(res.data);
      })
      .catch(() => {
        return API.get("/analyses/")
          .then((res) => {
            const list = res.data.results || res.data;
            const found = Array.isArray(list)
              ? list.find((a) => String(a.id) === String(id))
              : null;
            if (found) {
              setAnalysis(found);
            } else {
              setError("Analysis report not found.");
            }
          })
          .catch(() => setError("Failed to load analysis."));
      })
      .finally(() => setLoading(false));
  }, [id, location.state]);

  useEffect(() => {
    if (!product?.id || !user) {
      setWishlisted(false);
      setWishlistId(null);
      return;
    }
    API.get("/wishlist/")
      .then((res) => {
        const list = res.data.results || res.data;
        const found = Array.isArray(list)
          ? list.find(
              (w) =>
                String(w.product) === String(product.id) ||
                w.product?.id === product.id
            )
          : null;
        if (found) {
          setWishlisted(true);
          setWishlistId(found.id);
        } else {
          setWishlisted(false);
          setWishlistId(null);
        }
      })
      .catch(() => {});
  }, [product?.id, user]);

  const toggleWishlist = async () => {
    if (!product?.id) return;
    if (!user) {
      toast.error("Please login to save products to your wishlist");
      return;
    }
    setWishlistLoading(true);
    try {
      if (wishlisted && wishlistId) {
        await API.delete(`/wishlist/${wishlistId}/`);
        setWishlisted(false);
        setWishlistId(null);
        toast.success("Removed from wishlist");
      } else {
        const res = await API.post("/wishlist/", {
          product: product.id,
        });
        setWishlisted(true);
        setWishlistId(res.data.id);
        toast.success("Saved to wishlist");
      }
      window.dispatchEvent(new Event("wishlist:changed"));
    } catch {
      toast.error("Wishlist update failed");
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleSetAlert = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to set price alerts");
      return;
    }
    if (!product?.id || !targetPrice) return;
    setAlertSaving(true);
    try {
      await API.post("/users/alerts/", {
        product: product.id,
        target_price: Number(targetPrice),
      });
      toast.success(`Alert set for ₹${Number(targetPrice).toLocaleString("en-IN")}`);
      setTargetPrice("");
      window.dispatchEvent(new Event("alert:changed"));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to set alert");
    } finally {
      setAlertSaving(false);
    }
  };

  useEffect(() => {
    if (analysis) {
      const title =
        analysis.analysis_result?.product?.title ||
        analysis.product?.title ||
        "Product Decision Analysis";
      document.title = `${title} — DealLens`;
      return () => {
        document.title = "DealLens — AI-Powered Multi-Marketplace Price Comparison";
      };
    }
  }, [analysis]);

  useEffect(() => {
    if (analysis?.id && !analysis?.viewed_at) {
      API.put(`/recent/${analysis.id}/viewed/`).catch(() => {});
    }
  }, [analysis?.id, analysis?.viewed_at]);

  if (loading) {
    return (
      <div className="page-container" style={{ paddingTop: "2.5rem" }}>
        <SkeletonAnalysisPage />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="page-container" style={{ paddingTop: "4rem", textAlign: "center" }}>
        <div className="card-panel" style={{ maxWidth: 500, margin: "0 auto", padding: "3rem 2rem" }}>
          <AlertCircle size={40} color="var(--accent-rose)" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            {error || "Report Not Found"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            The requested analysis report is unavailable or has expired.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", gap: "0.35rem" }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/" className="btn btn-secondary btn-sm">
              ← Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingTop: "2rem" }}>
      {/* Top Action Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <Link
          to="/"
          className="btn btn-secondary btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <ArrowLeft size={15} /> Back to Analyzer
        </Link>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Wishlist Toggle Button */}
          <button
            onClick={toggleWishlist}
            disabled={wishlistLoading}
            className="btn btn-secondary btn-sm"
            style={{
              borderColor: wishlisted ? "rgba(244, 63, 94, 0.4)" : "var(--border-color)",
              background: wishlisted ? "rgba(244, 63, 94, 0.12)" : "var(--bg-card)",
              color: wishlisted ? "var(--accent-rose)" : "var(--text-primary)",
            }}
          >
            <Heart
              size={15}
              fill={wishlisted ? "var(--accent-rose)" : "none"}
              color={wishlisted ? "var(--accent-rose)" : "currentColor"}
            />
            <span>{wishlisted ? "Saved" : "Save to Wishlist"}</span>
          </button>

          {/* Jump to Alert Button */}
          {user && (
            <button
              onClick={() =>
                document.getElementById("alert-section")?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="btn btn-secondary btn-sm"
            >
              <Bell size={15} />
              <span>Set Alert</span>
            </button>
          )}

          {/* Share Button */}
          <ShareButton
            title={
              analysis.product?.title ||
              analysis.analysis_result?.product?.title ||
              analysis.analysis_result?.title ||
              "Product Deal"
            }
            price={analysis.analysis_result?.best_deal_price || analysis.product?.price}
            url={`${window.location.origin}/analysis/${id}`}
          />
        </div>
      </div>

      {/* Main Analysis Result View */}
      <AnalysisResult data={analysis.analysis_result || analysis} analysisId={id} />

      {/* Price Alert Form Panel */}
      {user && (
        <div
          id="alert-section"
          className="card-panel card-glow"
          style={{
            marginTop: "2.5rem",
            padding: "1.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Bell size={18} color="var(--accent-amber)" />
            <h4 style={{ fontSize: "1.05rem", fontWeight: 800 }}>
              Automated 30-Day Price Drop Monitor
            </h4>
          </div>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem", maxWidth: 650 }}>
            Set your target purchase price. Our background monitoring service tracks cross-store prices daily and notifies you when the product drops to or below your target.
          </p>

          <form
            onSubmit={handleSetAlert}
            style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "0 0.85rem",
                width: 200,
              }}
            >
              <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.95rem" }}>₹</span>
              <input
                type="number"
                placeholder="Target price"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                required
                min="1"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  padding: "0.7rem 0.5rem",
                  width: "100%",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={alertSaving || !targetPrice}
              className="btn btn-primary"
              style={{ padding: "0.7rem 1.4rem" }}
            >
              {alertSaving ? "Saving Alert..." : "Activate Monitor"}
            </button>
          </form>
        </div>
      )}

      {/* Guest Alert Promo */}
      {!user && (
        <div
          className="card-panel"
          style={{
            marginTop: "2.5rem",
            padding: "1.75rem",
            textAlign: "center",
          }}
        >
          <Bell size={24} color="var(--accent-amber)" style={{ margin: "0 auto 0.5rem" }} />
          <h4 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.35rem" }}>
            Want automatic price drop alerts for this product?
          </h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Sign in to activate automated cross-store price monitoring.
          </p>
          <Link to="/login" className="btn btn-secondary btn-sm">
            Sign In to Set Alert
          </Link>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
