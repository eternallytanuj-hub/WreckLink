import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';

const EarthScene = () => {
  const globeEl = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.controls().enableZoom = false;

      // Set initial camera position for zoom
      globeEl.current.pointOfView({ altitude: 3.5 });
    }
  }, []);

  // Mock data for flights
  const N = 30;
  const arcsData = [...Array(N).keys()].map(() => ({
    startLat: (Math.random() - 0.5) * 180,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 180,
    endLng: (Math.random() - 0.5) * 360,
    color: [['#00d4ff', '#ff0000', '#00ff00'][Math.round(Math.random() * 2)], ['#00d4ff', '#ff0000', '#00ff00'][Math.round(Math.random() * 2)]]
  }));

  return (
    <div className="absolute inset-0 z-0 bg-black">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={() => Math.random()}
        arcDashGap={() => Math.random()}
        arcDashAnimateTime={() => Math.random() * 4000 + 500}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#000000"
      />
    </div>
  );
};

export default EarthScene;
