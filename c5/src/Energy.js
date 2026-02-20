import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, RefreshCw, Filter, ChevronUp, 
  Zap, ArrowDownCircle, ArrowUpCircle 
} from 'lucide-react';
import './Energy.css';

const Energy = () => {
  const navigate = useNavigate();
  
  // --- 模拟 Demo 数据状态 ---
  const [consumption, setConsumption] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState('All Floors');
  const [lastUpdated, setLastUpdated] = useState('19-02-2026'); // DD-MM-YYYY

  // 模拟月度趋势数据 (Feb - Jun)
  const [chartData, setChartData] = useState([
    { label: 'Feb', value: 75 },
    { label: 'Mar', value: 82 },
    { label: 'Apr', value: 78 },
    { label: 'May', value: 85 },
    { label: 'Jun', value: 80 },
  ]);

  // 初始化加载
  useEffect(() => {
    handleRefresh();
  }, []);

  // 1. 刷新功能：随机生成数据并更新日期
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      // 随机总消耗
      const newConsumption = Math.floor(Math.random() * 5000) + 1000;
      setConsumption(newConsumption);
      
      // 随机更新图表高度
      const newData = chartData.map(item => ({ 
        ...item, 
        value: Math.floor(Math.random() * 60) + 30 
      }));
      setChartData(newData);

      // 更新日期格式为 DD-MM-YYYY
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      setLastUpdated(`${dd}-${mm}-${yyyy}`);
      
      setIsRefreshing(false);
    }, 800);
  };

  // 2. 楼层筛选切换 (Demo 循环)
  const toggleFloor = () => {
    const floors = ['All Floors', 'Floor 1', 'Floor 5', 'Floor 6'];
    const nextIndex = (floors.indexOf(selectedFloor) + 1) % floors.length;
    setSelectedFloor(floors[nextIndex]);
    handleRefresh();
  };

  return (
    <div className="energy-container">
      {/* 顶部导航 */}
      <nav className="energy-top-nav">
        <div className="back-arrow" onClick={() => navigate('/')}>
          <ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span className="nav-title">Energy</span>
      </nav>

      <div className="energy-scroll-content">
        {/* Hero 概览区域 */}
        <div className="energy-hero-section">
          <h2 className="dashboard-title">Energy Dashboard</h2>
          <p className="dashboard-subtitle">Menara Chin Hin</p>

          <div className="consumption-card">
            <div className="card-header">
              <span>Total Monthly Consumption</span>
              <RefreshCw 
                size={18} 
                className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`} 
                onClick={handleRefresh}
              />
            </div>
            <div className="consumption-value">{consumption.toLocaleString()} kWh</div>
            <div className="consumption-trend green">
              <ArrowDownCircle size={14} />
              <span>-100.00% vs last month</span>
            </div>
            <div className="last-updated">Last updated on {lastUpdated}</div>
          </div>
        </div>

        {/* 楼层分布与图表区域 */}
        <div className="floor-distribution-section">
          <div className="section-header">
            <h3>Floor Distribution</h3>
            <button className="floor-filter-btn" onClick={toggleFloor}>
              <Filter size={14} />
              <span>{selectedFloor}</span>
            </button>
          </div>

          <button className="monthly-trends-btn" onClick={handleRefresh}>Monthly Trends</button>

          <div className="chart-container">
            <div className="chinhin-logo-sm">CHIN HIN</div>
            <div className="chart-layout">
              {/* Y 轴刻度 (固定数值) */}
              <div className="chart-y-axis">
                <span>6.83m</span>
                <span>5.46m</span>
                <span>4.10m</span>
                <span>2.73m</span>
                <span>1.37m</span>
              </div>
              {/* X 轴柱状图 */}
              <div className="chart-bars">
                {chartData.map((item, i) => (
                  <div key={i} className="bar-wrapper">
                    <div className="bar" style={{ height: `${item.value}%` }}></div>
                    <span className="bar-x-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 消费洞察区域 */}
        <div className="insights-section">
          <div className="insights-header">
            <h3>Consumption Insights</h3>
            <span className="insights-date">Jan 2026</span>
          </div>

          <div className="insight-item-card high">
            <div className="insight-icon red"><Zap size={18} color="white" fill="white" /></div>
            <div className="insight-info">
              <span className="insight-label">Highest Consumption</span>
              <span className="insight-status">{selectedFloor === 'All Floors' ? 'Server Room' : 'Area A'}</span>
            </div>
            <div className="insight-value">{(consumption * 0.6).toFixed(0)} kWh</div>
          </div>

          <div className="insight-item-card low">
            <div className="insight-icon green"><Zap size={18} color="white" fill="white" /></div>
            <div className="insight-info">
              <span className="insight-label">Lowest Consumption</span>
              <span className="insight-status">Lobby Area</span>
            </div>
            <div className="insight-value">{(consumption * 0.1).toFixed(0)} kWh</div>
          </div>
        </div>
      </div>

      {/* FAB 返回顶部 */}
      <button className="fab-up-btn" onClick={() => document.querySelector('.energy-scroll-content').scrollTo({top:0, behavior:'smooth'})}>
        <ChevronUp size={24} color="#2b1d62" />
      </button>
    </div>
  );
};

export default Energy;