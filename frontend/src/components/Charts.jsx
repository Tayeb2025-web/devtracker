import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#181d27',
      titleColor: '#e8ecf4',
      bodyColor: '#6b7a90',
      borderColor: '#1e2533',
      borderWidth: 1,
      cornerRadius: 12,
      padding: 12,
      font: { family: "'Inter', sans-serif" },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(30, 37, 51, 0.5)' },
      ticks: { color: '#6b7a90', font: { size: 11, family: "'Inter', sans-serif" } },
    },
    y: {
      grid: { color: 'rgba(30, 37, 51, 0.5)' },
      ticks: { color: '#6b7a90', font: { size: 11, family: "'Inter', sans-serif" } },
      beginAtZero: true,
    },
  },
};

export function LineChart({ data, label = 'Hours' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [data]);

  const minWidth = data.length > 10 ? `${data.length * 60}px` : '100%';

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [{
      label,
      data: data.map(d => d.hours),
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: '#818CF8',
    }],
  };

  return (
    <div ref={containerRef} className="overflow-x-auto custom-scrollbar w-full pb-2">
      <div className="h-64" style={{ minWidth }}>
        <Line data={chartData} options={chartDefaults} />
      </div>
    </div>
  );
}

export function BarChartComponent({ data, label = 'Hours' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [data]);

  const minWidth = data.length > 10 ? `${data.length * 60}px` : '100%';

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [{
      label,
      data: data.map(d => d.hours),
      backgroundColor: 'rgba(99, 102, 241, 0.75)',
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  return (
    <div ref={containerRef} className="overflow-x-auto custom-scrollbar w-full pb-2">
      <div className="h-64" style={{ minWidth }}>
        <Bar data={chartData} options={chartDefaults} />
      </div>
    </div>
  );
}

export function PieChartComponent({ data }) {
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [{
      data: data.map(d => parseFloat(d.hours)),
      backgroundColor: data.map(d => d.color || '#6366F1'),
      borderWidth: 0,
    }],
  };

  const options = {
    ...chartDefaults,
    plugins: {
      ...chartDefaults.plugins,
      legend: {
        display: true,
        position: 'right',
        labels: { color: '#6b7a90', font: { size: 11, family: "'Inter', sans-serif" }, padding: 14, usePointStyle: true },
      },
    },
    scales: {},
  };

  return (
    <div className="h-64">
      <Pie data={chartData} options={options} />
    </div>
  );
}

export function GoalConfetti({ show }) {
  const fired = useRef(false);

  useEffect(() => {
    if (show && !fired.current) {
      fired.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } }), 300);
      });
    }
    if (!show) fired.current = false;
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="glass rounded-3xl px-10 py-8 text-center animate-scale-in border border-indigo-500/30 shadow-2xl">
        <p className="text-5xl mb-3">🏆</p>
        <h2 className="text-3xl font-extrabold gradient-text-accent">Goal Completed!</h2>
        <p className="text-text-muted text-sm mt-1.5 font-medium">Amazing work today! Keep up the momentum!</p>
      </div>
    </div>
  );
}
