import './ComingSoon.scss';
import React from 'react';
import { Settings, Wrench } from 'lucide-react';

const ComingSoon = ({ title = "قريباً" }) => {
  return (
    <div className="fade-in comingsoon-style-1" >
      <div className="comingsoon-style-2">
        <Wrench size={64} className="comingsoon-style-3" />
      </div>
      <h1 className="comingsoon-style-4">{title}</h1>
      <p className="comingsoon-style-5">
        هذه الصفحة قيد التطوير حالياً، وسوف يتم إتاحتها في التحديثات القادمة بإذن الله. 🚀
      </p>
    </div>
  );
};

export default ComingSoon;
