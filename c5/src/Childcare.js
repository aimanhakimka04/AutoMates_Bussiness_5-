import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import './ComingSoon.css';

const Childcare = () => {
  const navigate = useNavigate();

  return (
    <div className="cs-container">
      <nav className="cs-top-nav">
        <div className="back-arrow" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span className="nav-title">Childcare</span>
      </nav>

      <div className="cs-main-content">
        <h2 className="cs-title">Not available now</h2>
        <p className="cs-subtitle">Coming soon</p>
      </div>
    </div>
  );
};

export default Childcare;