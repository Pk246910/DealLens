import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";

const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Recent = lazy(() => import("./pages/Recent"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));
const DecisionReport = lazy(() => import("./pages/DecisionReport"));
const NotFound = lazy(() => import("./pages/NotFound"));

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!user.is_staff && !user.is_superuser) {
    return <Navigate to="/admin/login" replace state={{ denied: true }} />;
  }
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                fontSize: "0.88rem",
                fontWeight: 600,
              },
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar />
            <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "4rem 1rem",
                        color: "var(--text-secondary)",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                      }}
                    >
                      Loading...
                    </div>
                  }
                >
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/recent" element={<Recent />} />
                    <Route path="/products" element={<Navigate to="/" replace />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                    <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminProtectedRoute><Admin /></AdminProtectedRoute>} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/analysis/:id" element={<AnalysisPage />} />
                    <Route path="/report/:id" element={<DecisionReport />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
