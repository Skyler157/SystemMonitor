const ChartPlaceholder = ({ title }) => (
  <div className="bg-white p-6 rounded-lg shadow h-64 flex flex-col justify-center items-center">
    <h3 className="font-semibold mb-2">{title}</h3>
    <p className="text-gray-400 text-sm">[Chart will go here]</p>
  </div>
);

export default ChartPlaceholder;
