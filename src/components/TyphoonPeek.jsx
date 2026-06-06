import React, { useEffect, useState } from "react";

const TYPHOON_799_IMAGE_URL = "https://ark-lmd.oss-cn-beijing.aliyuncs.com/typhoon799.webp";

const TyphoonPeek = ({ triggerKey }) => {
  const [visible, setVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (!triggerKey) return undefined;

    setVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setAnimationKey(triggerKey);
      setVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [triggerKey]);

  if (!visible) return null;

  return (
    <div
      key={animationKey}
      className="typhoon-peek"
      aria-hidden="true"
      onAnimationEnd={() => setVisible(false)}
    >
      <img
        src={TYPHOON_799_IMAGE_URL}
        alt=""
        className="typhoon-peek-image"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

export default TyphoonPeek;
