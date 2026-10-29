import React from "react";

function MainLyout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}

export default MainLyout;
