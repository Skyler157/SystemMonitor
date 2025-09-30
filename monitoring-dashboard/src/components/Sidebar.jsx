import { Link, useLocation } from "react-router-dom";
import { Home, Database, Server, HardDrive } from "lucide-react"; // Example icons

const Sidebar = () => {
  const location = useLocation();
  const links = [
    { name: "Dashboard", path: "/", icon: <Home size={18} /> },
    { name: "Services", path: "/services", icon: <Server size={18} /> },
    { name: "Databases", path: "/databases", icon: <Database size={18} /> },
    { name: "Disks", path: "/disks", icon: <HardDrive size={18} /> },
  ];

  return (
    <div className="h-screen w-64 bg-gray-900 text-white flex flex-col shadow-lg">
      <div className="text-2xl font-bold p-4 border-b border-gray-700 flex items-center justify-center">
        Monitoring Dashboard
      </div>
      <nav className="flex flex-col p-4 space-y-2 flex-1">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 p-2 rounded-md transition-colors duration-200 ${
                isActive ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
};

export default Sidebar;
