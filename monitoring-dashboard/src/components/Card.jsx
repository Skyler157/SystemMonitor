const Card = ({ title, value }) => (
  <div className="bg-white p-4 rounded-lg shadow text-center">
    <h3 className="text-gray-500 text-sm">{title}</h3>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

export default Card;
