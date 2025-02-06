import React from 'react';


// ϡ�ж���ɫ����
const RARITY_COLORS = {
  1: '#006400',  // �����������̣�
  2: '#00008B',  // ��׼���������� 
  3: '#4B0082',  // ��Ӣ����������
  4: '#800080',  // ��һ����ɫ��
  5: '#FF8C00'   // �������Ⱥ죩
};

// ·����Ⱦ�������
const PathRenderer = ({ paths, startValue }) => {
  if (!paths?.length) {
    return (
      <div className="path-error">
        ?? û���ҵ�����·�����볢�����·�ʽ��
        <ul>
          <li>����������ֵ��Χ(��ֵ������5000)</li>
          <li>�ſ���Դ���͹�������</li>
          <li>����ʹ�������̵����</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="path-container">
      {paths.map((path, pathIndex) => {
        let currentSum = startValue;
        
        return (
          <div key={`path-${pathIndex}`} className="path-card">
            <h3 className="path-title">
              ·������ {pathIndex + 1}
              <span className="path-stats">
                ({path.length}�����ܲ�{Math.abs(path.reduce((sum, item) => sum + item.item_value, 0))})
              </span>
            </h3>

            <div className="step-list">
              {path.map((item, stepIndex) => {
                const isGain = item.item_value > 0;
                currentSum += item.item_value;

                return (
                  <div key={`step-${stepIndex}`} className="step-item">
                    <div className="step-header">
                      <span className="step-order">STEP {stepIndex + 1}</span>
                      <span 
                        className="item-rarity-tag"
                        style={{ backgroundColor: RARITY_COLORS[item.rarity] }}
                      >
                        {['����', '��׼', '��Ӣ', '��һ', '����'][item.rarity - 1]}
                      </span>
                    </div>
                    
                    <div className="step-content">
                      <span 
                        className="item-name"
                        style={{ color: RARITY_COLORS[item.rarity] }}
                      >
                        {item.item_name}
                      </span>
                      
                      <span className={`operation-type ${isGain ? 'gain' : 'cost'}`}>
                        {isGain ? '���' : '����'}
                        <strong>{Math.abs(item.item_value)}</strong>
                        ��Դ
                      </span>

                      <span className="current-sum">
                        ��ǰ������{currentSum.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PathRenderer;
