"use client";

import { useEffect } from "react";

  

export default function Home() {
  useEffect(() => {
    // This effect runs only once when the component mounts
    const getInfo = async () => {
      const response = await fetch("/api/hello");
      const data = await response.json();
      console.log(data);
    };
    getInfo();
    console.log("Component mounted");
  }, []);
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <h1>
        Hola
      </h1>
    
    </div>
  );
}
