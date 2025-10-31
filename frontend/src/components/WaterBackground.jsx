import React from "react";
import waveImage from "../assets/wave.png"; 

const WaterBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Smooth gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-sky-300 to-sky-500 animate-gradient-flow" />

      {/* Two wave layers for parallax animation */}
      <div className="absolute bottom-0 left-0 w-full h-40 opacity-70 overflow-hidden">
        <div
          className="absolute w-[200%] h-full bg-repeat-x animate-wave"
          style={{
            backgroundImage: `url(${waveImage})`,
            backgroundSize: "50% 100%",
          }}
        ></div>
        <div
          className="absolute w-[200%] h-full bg-repeat-x animate-wave2 opacity-60"
          style={{
            backgroundImage: `url(${waveImage})`,
            backgroundSize: "50% 100%",
          }}
        ></div>
      </div>
    </div>
  );
};

export default WaterBackground;
