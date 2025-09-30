import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const links = [
    { name: "Dashboard", path: "/" },
    { name: "Services", path: "/services" },
    { name: "Databases", path: "/databases" },
    { name: "Disks", path: "/disks" },
    { name: "Alerts", path: "/alerts" },
  ];

  return (
    <div className="h-screen w-64 bg-gray-900 text-white flex flex-col">
      <h1 className="text-2xl font-bold p-4 border-b border-gray-700">Monitoring Dashboard</h1>
      <nav className="flex flex-col p-4 space-y-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`p-2 rounded-md ${
              location.pathname === link.path
                ? "bg-blue-600"
                : "hover:bg-gray-700"
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
