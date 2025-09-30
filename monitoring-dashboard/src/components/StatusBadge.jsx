const StatusBadge = ({ status }) => {
  const colors = {
    UP: "bg-green-200 text-green-800",
    DOWN: "bg-red-200 text-red-800",
    WARNING: "bg-yellow-200 text-yellow-800",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
