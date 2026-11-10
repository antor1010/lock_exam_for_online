import { useState } from "react";
import { setToken } from "./api.js";
import Home from "./components/Home.jsx";
import Login from "./components/Login.jsx";
import Admin from "./components/Admin.jsx";
import Student from "./components/Student.jsx";

export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  const logout = () => { setToken(""); setUser(null); setPage("home"); };

  return (
    <div>
      <div className="hero">
        <h1>🎓 অনলাইন পরীক্ষা পোর্টাল</h1>
        {user && (
          <div>
            {user.role === "admin" ? "👩‍🏫" : "🧑‍🎓"} {user.name}{" "}
            <button className="g" onClick={logout}>লগআউট</button>
          </div>
        )}
      </div>
      <div className="wrap">
        {user ? (
          user.role === "admin" ? <Admin /> : <Student user={user} />
        ) : page === "home" ? (
          <Home go={setPage} />
        ) : (
          <Login role={page} onOk={setUser} back={() => setPage("home")} />
        )}
      </div>
    </div>
  );
}
