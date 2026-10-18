import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("deallens_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [guestId] = useState(() => {
    let gid = localStorage.getItem("deallens_guest_id");
    if (!gid) {
      gid = "guest_" + crypto.randomUUID();
      localStorage.setItem("deallens_guest_id", gid);
    }
    return gid;
  });

  const login = async (username, password, options = {}) => {
    const res = await API.post("/users/login/", { username, password });
    const { access, refresh } = res.data;
    // fetch profile before saving or committing session
    let profile;
    try {
      const me = await API.get("/users/me/", { headers: { Authorization: `Bearer ${access}` } });
      profile = me.data;
    } catch {
      profile = { username };
    }

    if (options.disallowStaff && (profile.is_staff || profile.is_superuser)) {
      const err = new Error("ADMIN_ACCOUNT_NOT_ALLOWED");
      err.isStaff = true;
      err.user = profile;
      throw err;
    }

    localStorage.setItem("deallens_access", access);
    localStorage.setItem("deallens_refresh", refresh);
    localStorage.setItem("deallens_user", JSON.stringify(profile));
    setUser(profile);
    return { ...res.data, user: profile };
  };

  const register = async (username, email, password) => {
    const res = await API.post("/users/register/", { username, email, password });
    if (res.data.tokens) {
      localStorage.setItem("deallens_access", res.data.tokens.access);
      localStorage.setItem("deallens_refresh", res.data.tokens.refresh);
      setUser(res.data.user);
      localStorage.setItem("deallens_user", JSON.stringify(res.data.user));
    } else {
      throw new Error("Registration succeeded but no tokens returned. Please log in.");
    }
    return res.data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("deallens_access");
    localStorage.removeItem("deallens_refresh");
    localStorage.removeItem("deallens_user");
  };

  // On mount, try to restore user from token
  useEffect(() => {
    const token = localStorage.getItem("deallens_access");
    if (token && !user) {
      API.get("/users/me/")
        .then((res) => {
          setUser(res.data);
          localStorage.setItem("deallens_user", JSON.stringify(res.data));
        })
        .catch(() => {});
    }
  }, []);

  // Listen for background logout events from axios interceptors
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      localStorage.removeItem("deallens_access");
      localStorage.removeItem("deallens_refresh");
      localStorage.removeItem("deallens_user");
    };
    window.addEventListener("deallens:logout", handleLogout);
    return () => window.removeEventListener("deallens:logout", handleLogout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, guestId, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
