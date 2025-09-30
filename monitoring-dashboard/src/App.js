import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import Databases from "./pages/Databases";
import Disks from "./pages/Disks";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/services" element={<Services />} />
            <Route path="/databases" element={<Databases />} />
            <Route path="/disks" element={<Disks />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
