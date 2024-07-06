import React, { useEffect, useState } from "react";

export default function ArrowUp() {
  const [showArrow, setShowArrow] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
      if (document.querySelector(".main-page-nostr-container").scrollTop >= 600)
        setShowArrow(true);
      else setShowArrow(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const straightUp = () => {
    document.querySelector(".main-page-nostr-container").scrollTop = 0;
  };

  if (!showArrow) return null;
  return (
    <div
      style={{
        position: "fixed",
        right: "32px",
        bottom: "32px",
        minWidth: "40px",
        aspectRatio: "1/1",
        borderRadius: "var(--border-r-50)",
        backgroundColor: "var(--white)",
        filter: "invert()",
        zIndex: 1000
        // transform: "rotate(180deg)",
      }}
      className="pointer fx-centered slide-up"
      onClick={straightUp}
    >
      <div className="arrow" style={{ transform: "rotate(180deg)" }}></div>
    </div>
  );
}
