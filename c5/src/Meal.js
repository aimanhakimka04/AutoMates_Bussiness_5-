import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Utensils } from 'lucide-react';
import './Meal.css';

const Meal = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('main');
  const [activeTab, setActiveTab] = useState('BREAKFAST'); // 默认选中

  // 1. 定义完整的数据源，包含分类标识
  const fullMenuData = [
    { category: "BREAKFAST", name: "NASI LEMAK", price: "RM 3.00" },
    { category: "BREAKFAST", name: "BIHUN GORENG", price: "RM 3.00" },
    { category: "SANDWICH & WRAP", name: "EGG SANDWICH", price: "RM 4.50" },
    { category: "SANDWICH & WRAP", name: "CHICKEN WRAP", price: "RM 6.50" },
    { category: "COMBO MEAL", name: "SET A (RICE + CHICKEN)", price: "RM 12.00" },
    { category: "NOODLES", name: "CURRY MEE", price: "RM 7.00" },
  ];

  const tabs = ["BREAKFAST", "SANDWICH & WRAP", "COMBO MEAL", "NOODLES", "DRINKS"];

  // 2. 关键：根据当前选中的 activeTab 过滤出要显示的数据
  const filteredMenu = fullMenuData.filter(item => item.category === activeTab);

  const handleBack = () => {
    view === 'menu' ? setView('main') : navigate('/');
  };

  return (
    <div className="meal-container">
      <nav className="meal-top-nav">
        <div className="back-arrow" onClick={handleBack}><ChevronLeft size={24} color="#ffffff" /></div>
        <span className="nav-title">{view === 'main' ? 'Meal' : 'Menu'}</span>
      </nav>

      <div className="meal-content-area">
        {view === 'main' ? (
          <div className="meal-main-view">
            <div className="meal-menu-card" onClick={() => setView('menu')}>
              <div className="menu-icon-wrapper"><Utensils size={40} color="#333" /></div>
              <span className="menu-card-label">Menu</span>
            </div>
          </div>
        ) : (
          <div className="meal-details-view">
            <h2 className="cafeteria-title">Menara Chin Hin Cafeteria</h2>
            
            {/* 横向滑动 Bar */}
            <div className="category-scroll-container">
              {tabs.map(tab => (
                <div 
                  key={tab} 
                  className={`category-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)} // 点击时更换状态，下方列表会随之改变
                >
                  {tab}
                </div>
              ))}
            </div>

            {/* 纵向滑动 列表内容 */}
            <div className="menu-items-scroll-area">
              {filteredMenu.length > 0 ? (
                filteredMenu.map((item, index) => (
                  <div key={index} className="menu-list-item">
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{item.price}</div>
                  </div>
                ))
              ) : (
                /* 如果该分类下没有数据时的显示 */
                <div className="no-data">No items available in this category.</div>
              )}
              <div className="scroll-spacer"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Meal;