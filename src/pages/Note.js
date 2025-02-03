import React from 'react';
import '../../src/assets/styles/Note.css';

function NotePage() {
  return (

    <div className='main-note-content'>
      <div className="note-page">
        <h1>注意事项</h1>
        <ul>
          <li>请确保输入的数字在 0 到 1000 之间。</li>
          <li>计算结果可能会受到算法限制，请参考路径提示。</li>
          <li>如果步数过多，请尝试调整输入值。</li>
          <li>清空历史记录后，所有计算结果将无法恢复。</li>
          <li>页面缩小后，布局会自动调整以适应屏幕。</li>
          <li>页面缩小后，布局会自动调整以适应屏幕。</li>
        </ul>
      </div>


    </div>

  );
}

export default NotePage;